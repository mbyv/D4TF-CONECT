'use client'

import { VerificationTier, TIER_CONFIG } from '@/lib/types'

interface ChecklistProps {
  tier: VerificationTier
  phoneVerified: boolean
  hasFullBio: boolean
  hasCity: boolean
  hasPortfolio: boolean
  hasLink: boolean
  role: string
}

function Item({ done, label }: { done: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${done ? 'text-gray-700' : 'text-gray-400'}`}>
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs shrink-0 ${
        done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
      }`}>
        {done ? '✓' : '○'}
      </span>
      {label}
    </div>
  )
}

export default function VerificationChecklist({
  tier,
  phoneVerified,
  hasFullBio,
  hasCity,
  hasPortfolio,
  hasLink,
  role,
}: ChecklistProps) {
  const config = TIER_CONFIG[tier]

  return (
    <div className="card p-5 bg-gray-50 border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Verification Status</h3>
        <span className={`badge ${config.bg} ${config.color} text-xs font-semibold`}>
          {config.icon} {config.label}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Complete each step to build trust with{' '}
        {role === 'brand' ? 'manufacturers' : 'brands'}.
      </p>

      <div className="space-y-4">
        {/* Tier 1 — Basic */}
        <div>
          <p className="text-xs font-semibold text-blue-700 mb-2">
            🔵 Basic — Phone verified
          </p>
          <div className="pl-2 space-y-1.5">
            <Item done={phoneVerified} label="Verify your phone number" />
          </div>
        </div>

        {/* Tier 2 — Verified */}
        <div>
          <p className={`text-xs font-semibold mb-2 ${phoneVerified ? 'text-green-700' : 'text-gray-400'}`}>
            🟢 Verified — Complete your profile
          </p>
          <div className="pl-2 space-y-1.5">
            <Item done={hasFullBio} label="Write a bio (min. 40 characters)" />
            <Item done={hasCity} label="Add your city" />
            <Item done={hasLink} label="Add a contact link (Instagram, WhatsApp, etc.)" />
            {role === 'manufacturer' && (
              <Item done={hasPortfolio} label="Upload at least 1 portfolio image" />
            )}
          </div>
        </div>
      </div>

      {tier === 'verified' && (
        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
          <p className="text-sm font-semibold text-green-700">
            🎉 Fully verified! Your profile is complete.
          </p>
        </div>
      )}
    </div>
  )
}
