'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Listing {
  id: string
  itemName: string
  description: string
  rentPerDay: number
  platformFee: number
  finalRent: number
  securityDeposit: number | null
  quantity: number
  status: string
  rejectionReason: string | null
  submittedAt: string
  reviewedAt: string | null
  listedAt: string | null
  category: {
    id: string
    name: string
  }
}

export default function MyListingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    live: 0,
    rejected: 0,
    totalEarnings: 0
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    if (session) {
      fetchListings()
    }
  }, [status, session, router])

  const fetchListings = async () => {
    try {
      const response = await fetch('/api/listings/my')
      if (response.ok) {
        const data: Listing[] = await response.json()
        setListings(data)
        
        // Calculate stats
        const stats = {
          total: data.length,
          pending: data.filter(l => l.status === 'PENDING').length,
          live: data.filter(l => l.status === 'LIVE').length,
          rejected: data.filter(l => l.status === 'REJECTED').length,
          totalEarnings: data
            .filter(l => l.status === 'LIVE')
            .reduce((sum, l) => sum + l.rentPerDay, 0)
        }
        setStats(stats)
      }
    } catch (error) {
      console.error('Error fetching listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LIVE':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'RENTED':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '⏳'
      case 'LIVE':
        return '✅'
      case 'REJECTED':
        return '❌'
      case 'RENTED':
        return '🤝'
      default:
        return '📋'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/shop')}
                className="text-blue-600 hover:text-blue-800 mr-4 font-medium"
              >
                ← Back to Shop
              </button>
              <h1 className="text-xl font-semibold text-gray-900">My Listings</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push('/sell-rent/new')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                + List New Item
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">📦</div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Listings</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">⏳</div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-gray-600">Pending Review</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">✅</div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.live}</div>
                <div className="text-sm text-gray-600">Live Listings</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">💰</div>
              <div>
                <div className="text-2xl font-bold text-green-600">₹{stats.totalEarnings}</div>
                <div className="text-sm text-gray-600">Potential/Day</div>
              </div>
            </div>
          </div>
        </div>

        {/* Listings */}
        {listings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Listings Yet</h3>
            <p className="text-gray-600 mb-6">Start earning by listing items you want to rent out!</p>
            <button
              onClick={() => router.push('/sell-rent/new')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              List Your First Item
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-lg shadow border hover:shadow-md transition">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {listing.itemName}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(listing.status)}`}>
                          {getStatusIcon(listing.status)} {listing.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {listing.category.name} • Quantity: {listing.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">
                        ₹{listing.rentPerDay}/day
                      </div>
                      <div className="text-xs text-gray-500">
                        Customer pays: ₹{listing.finalRent}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {listing.description}
                  </p>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-500">Security Deposit:</span>
                      <p className="font-medium text-gray-900">
                        {listing.securityDeposit ? `₹${listing.securityDeposit}` : 'None'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Platform Fee:</span>
                      <p className="font-medium text-gray-900">₹{listing.platformFee}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Submitted:</span>
                      <p className="font-medium text-gray-900">
                        {new Date(listing.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {listing.listedAt && (
                      <div>
                        <span className="text-gray-500">Listed:</span>
                        <p className="font-medium text-gray-900">
                          {new Date(listing.listedAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status Messages */}
                  {listing.status === 'PENDING' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        ⏳ Your listing is under review. You'll be notified once it's approved.
                      </p>
                    </div>
                  )}

                  {listing.status === 'LIVE' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        ✅ Your listing is live! Customers can now see and rent this item.
                      </p>
                    </div>
                  )}

                  {listing.status === 'REJECTED' && listing.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-800 mb-1">
                        ❌ Listing Rejected
                      </p>
                      <p className="text-sm text-red-700">
                        Reason: {listing.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}