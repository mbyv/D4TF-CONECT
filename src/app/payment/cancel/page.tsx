import Link from 'next/link'

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="mb-6">
        <Link href="/" className="font-bold text-brand-700 text-lg">D4TF Connect</Link>
      </div>
      <div className="card p-8 max-w-sm w-full text-center">
        <div className="text-3xl mb-3">↩️</div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">Payment cancelled</h1>
        <p className="text-sm text-gray-500 mb-6">
          No charge was made. You can go back and try again whenever you&apos;re ready.
        </p>
        <Link href="/manufacturer" className="btn-secondary w-full">
          Back to production feed
        </Link>
      </div>
    </div>
  )
}
