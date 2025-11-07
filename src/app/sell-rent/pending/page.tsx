'use client'

import { useRouter } from 'next/navigation'

export default function PendingListingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Listing Submitted Successfully!
          </h2>
          <p className="text-gray-600 mb-6">
            Your item has been submitted for review. The admin will review it and approve it shortly.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-2">What is Next?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Admin will review your listing</li>
              <li>✓ You will be notified of approval/rejection</li>
              <li>✓ Once approved, it will appear in the shop</li>
              <li>✓ You will get contacted when someone wants to rent</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/my-listings')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              View My Listings
            </button>
            <button
              onClick={() => router.push('/shop')}
              className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
            >
              Browse Shop
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}