import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProductionRequest } from '@/lib/types'
import { formatDate, formatCurrency, formatQuantity } from '@/lib/utils'
import EmptyState from '@/components/ui/EmptyState'

export default async function BrandDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'brand') redirect('/manufacturer')

  const { data: requests } = await supabase
    .from('production_requests')
    .select('*')
    .eq('brand_id', user.id)
    .order('created_at', { ascending: false })

  const list = (requests ?? []) as ProductionRequest[]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your production requests and incoming offers</p>
        </div>
        <Link href="/brand/requests/new" className="btn-primary">
          + New Request
        </Link>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <Link href="/directory/manufacturers" className="card p-4 hover:shadow-md transition-shadow">
          <div className="text-2xl mb-1">🏭</div>
          <div className="text-sm font-medium text-gray-900">Find Manufacturers</div>
          <div className="text-xs text-gray-500 mt-0.5">Browse the directory</div>
        </Link>
        <Link href={`/profile/${user.id}`} className="card p-4 hover:shadow-md transition-shadow">
          <div className="text-2xl mb-1">👤</div>
          <div className="text-sm font-medium text-gray-900">My Profile</div>
          <div className="text-xs text-gray-500 mt-0.5">Add portfolio & links</div>
        </Link>
        <Link href="/profile/edit" className="card p-4 hover:shadow-md transition-shadow">
          <div className="text-2xl mb-1">✏️</div>
          <div className="text-sm font-medium text-gray-900">Edit Profile</div>
          <div className="text-xs text-gray-500 mt-0.5">Update your info</div>
        </Link>
      </div>

      {/* Requests */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          My Production Requests
          {list.length > 0 && (
            <span className="ml-2 badge bg-gray-100 text-gray-600">{list.length}</span>
          )}
        </h2>

        {list.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No requests yet"
            description="Post your first production request and start receiving offers from manufacturers."
            action={
              <Link href="/brand/requests/new" className="btn-primary">
                Post your first request
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {list.map((req) => (
              <Link
                key={req.id}
                href={`/brand/requests/${req.id}`}
                className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow block"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{req.title}</h3>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                    <span>{formatQuantity(req.quantity)}</span>
                    <span>·</span>
                    <span>{formatCurrency(req.budget)}</span>
                    <span>·</span>
                    <span>Deadline: {formatDate(req.deadline)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm shrink-0">
                  <span className="text-gray-400 text-xs">
                    Posted {formatDate(req.created_at)}
                  </span>
                  <span className="text-brand-600 font-medium">View offers →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
