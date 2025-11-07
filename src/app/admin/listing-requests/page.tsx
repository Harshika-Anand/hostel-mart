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
  submittedAt: string
  sellerName: string
  sellerRoom: string
  sellerPhone: string
  category: {
    id: string
    name: string
  }
  seller: {
    id: string
    name: string
    email: string
    phone: string | null
    roomNumber: string | null
  }
}

export default function AdminListingRequests() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchListings()
  }, [session, status, router, statusFilter])

  const fetchListings = async () => {
    try {
      const response = await fetch(`/api/admin/listings?status=${statusFilter}`)
      if (response.ok) {
        const data = await response.json()
        setListings(data)
      }
    } catch (error) {
      console.error('Error fetching listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (listingId: string) => {
    if (!confirm('Approve this listing?')) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' })
      })

      if (response.ok) {
        alert('Listing approved successfully!')
        fetchListings()
      } else {
        alert('Failed to approve listing')
      }
    } catch (error) {
      console.error('Error approving:', error)
      alert('Error approving listing')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedListing || !rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/listings/${selectedListing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'REJECTED',
          rejectionReason 
        })
      })

      if (response.ok) {
        alert('Listing rejected')
        setShowRejectModal(false)
        setRejectionReason('')
        setSelectedListing(null)
        fetchListings()
      } else {
        alert('Failed to reject listing')
      }
    } catch (error) {
      console.error('Error rejecting:', error)
      alert('Error rejecting listing')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (listingId: string) => {
    if (!confirm('Permanently delete this listing? This cannot be undone.')) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/listings/${listingId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Listing deleted successfully')
        fetchListings()
      } else {
        alert('Failed to delete listing')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Error deleting listing')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'LIVE':
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'RENTED':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin')}
                className="text-blue-600 hover:text-blue-800 mr-4 font-medium"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Listing Requests</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Filter by status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-gray-900"
            >
              <option value="all">All</option>
              <option value="PENDING">Pending</option>
              <option value="LIVE">Live</option>
              <option value="REJECTED">Rejected</option>
              <option value="RENTED">Rented</option>
            </select>
            <span className="text-sm text-gray-600">
              {listings.length} listing{listings.length !== 1 ? 's' : ''} found
            </span>
          </div>
        </div>

        {/* Listings */}
        {listings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-400 text-4xl mb-4">📦</div>
            <p className="text-gray-500">No listings found with current filter</p>
          </div>
        ) : (
          <div className="space-y-6">
            {listings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-lg shadow border">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {listing.itemName}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(listing.status)}`}>
                          {listing.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          {listing.category.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        ₹{listing.finalRent}/day
                      </div>
                      <div className="text-xs text-gray-500">
                        Seller gets: ₹{listing.rentPerDay}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Description:</h4>
                    <p className="text-gray-600 text-sm">{listing.description}</p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-500">Quantity:</span>
                      <p className="font-medium text-gray-900">{listing.quantity}</p>
                    </div>
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
                  </div>

                  {/* Seller Info */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Seller Information:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Name:</span>
                        <p className="font-medium text-gray-900">{listing.sellerName}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Email:</span>
                        <p className="font-medium text-gray-900">{listing.seller.email}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Phone:</span>
                        <p className="font-medium text-gray-900">{listing.sellerPhone}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Room:</span>
                        <p className="font-medium text-gray-900">{listing.sellerRoom}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {listing.status === 'PENDING' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(listing.id)}
                        disabled={actionLoading}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedListing(listing)
                          setShowRejectModal(true)
                        }}
                        disabled={actionLoading}
                        className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}

                  {listing.status !== 'PENDING' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDelete(listing.id)}
                        disabled={actionLoading}
                        className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reject Listing: {selectedListing.itemName}
            </h3>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for rejection:
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please explain why this listing is being rejected..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-gray-900"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectionReason('')
                  setSelectedListing(null)
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}