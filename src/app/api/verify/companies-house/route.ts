import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { company_number } = await request.json() as { company_number: string }
    if (!company_number?.trim()) {
      return NextResponse.json({ error: 'Company number is required' }, { status: 400 })
    }

    const apiKey = process.env.COMPANIES_HOUSE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Companies House API not configured' }, { status: 500 })
    }

    const cleaned = company_number.trim().toUpperCase()

    // Call the free UK Companies House API
    const chRes = await fetch(
      `https://api.company-information.service.gov.uk/company/${cleaned}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
        },
      }
    )

    if (chRes.status === 404) {
      return NextResponse.json(
        { error: 'Company not found. Double-check the number and try again.' },
        { status: 404 }
      )
    }

    if (!chRes.ok) {
      return NextResponse.json(
        { error: 'Could not reach Companies House. Try again shortly.' },
        { status: 502 }
      )
    }

    const company = await chRes.json()

    if (company.company_status !== 'active') {
      return NextResponse.json(
        {
          error: `This company is listed as "${company.company_status}" — only active companies can be verified.`,
        },
        { status: 400 }
      )
    }

    // Save to profile and refresh tier
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        companies_house_number: cleaned,
        companies_house_name: company.company_name,
        companies_house_verified: true,
      })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Trigger tier recalculation via Supabase RPC
    await supabase.rpc('refresh_verification_tier', { profile_id: user.id })

    return NextResponse.json({
      verified: true,
      company_name: company.company_name,
      company_number: cleaned,
      company_status: company.company_status,
      incorporated_on: company.date_of_creation,
    })
  } catch (err) {
    console.error('[companies-house]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
