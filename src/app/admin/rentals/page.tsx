'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface RentalTransaction {
  id: string
  itemName: string
  status: string
  paymentStatus: string
  rentPerDay: number
  daysRented: number
  amountOwedToSeller: number
  sellerPaidOut: number
  totalPaid: number
  securityDeposit: number
  renterName: string
  renterEmail: string
  renterRoom: string | null
  sellerName: string
  sellerEmail: string
  sellerRoom: string
  paymentPin: string | null
  startDate: string
  returnedAt: string | null
}

interface PayoutSummary {
  sellerId: string
  sellerName: string
  sellerEmail: string
  sellerRoom: string
  totalOwed: number
  totalEarned: number
  totalPaid: number
  activeRentals: number
}

export default function AdminRentalsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [rentals, setRentals] = useState<RentalTransaction[]>([])
  const [payouts, setPayouts] = useState<PayoutSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'payouts'>('active')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchRentals()
  }, [session, status, router])

  const fetchRentals = async () => {
    try {
      const response = await fetch('/api/admin/rentals')
      if (response.ok) {
        const data = await response.json()
        setRentals(data.rentals || [])
        setPayouts(data.payoutSummary || [])
      }
    } catch (error) {
      console.error('Error fetching rentals:', error)
    } finally {
      setLoading(false)
    }
  }

  const approvePayment = async (rentalId: string) => {
    setUpdating(rentalId)
    try {
      const response = await fetch(`/api/admin/rentals/${rentalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'PAID', status: 'ACTIVE' })
      })
      
      if (response.ok) {
        fetchRentals()
      }
    } catch (error) {
      console.error('Error approving payment:', error)
    } finally {
      setUpdating(null)
    }
  }

  const markReturned = async (rentalId: string) => {
    if (!confirm('Mark this item as returned?')) return
    
    setUpdating(rentalId)
    try {
      const response = await fetch(`/api/admin/rentals/${rentalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RETURNED' })
      })
      
      if (response.ok) {
        fetchRentals()
      }
    } catch (error) {
      console.error('Error marking as returned:', error)
    } finally {
      setUpdating(null)
    }
  }

  const markPaidOut = async (sellerId: string, amount: number) => {
    if (!confirm(`Mark ₹${amount} as paid out to seller?`)) return
    
    try {
      const response = await fetch(`/api/admin/rentals/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId, amount })
      })
      
      if (response.ok) {
        fetchRentals()
      }
    } catch (error) {
      console.error('Error processing payout:', error)
    }
  }

  const activeRentals = rentals.filter(r => r.status === 'ACTIVE' || r.status === 'PENDING')
  const completedRentals = rentals.filter(r => r.status === 'RETURNED')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
              <h1 className="text-xl font-semibold text-gray-900">🏷️ Rental Management</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-blue-600">{activeRentals.length}</div>
            <div className="text-sm text-gray-600">Active Rentals</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600">{completedRentals.length}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-purple-600">
              ₹{payouts.reduce((sum, p) => sum + p.totalOwed, 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Owed to Sellers</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-orange-600">
              ₹{activeRentals.reduce((sum, r) => sum + r.amountOwedToSeller, 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Daily Accumulating</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'active'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active Rentals ({activeRentals.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'completed'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Completed ({completedRentals.length})
            </button>
            <button
              onClick={() => setActiveTab('payouts')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'payouts'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Seller Payouts ({payouts.length})
            </button>
          </div>
        </div>

        {/* Active Rentals */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {activeRentals.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No active rentals</p>
              </div>
            ) : (
              activeRentals.map(rental => (
                <div key={rental.id} className="bg-white rounded-lg shadow border">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{rental.itemName}</h3>
                        <div className="flex gap-2 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            rental.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            rental.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {rental.status}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            rental.paymentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            Payment: {rental.paymentStatus}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">₹{rental.rentPerDay}/day</div>
                        <div className="text-sm text-gray-500">Days: {rental.daysRented}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-500">Renter:</span>
                        <p className="font-medium">{rental.renterName}</p>
                        <p className="text-gray-600">{rental.renterEmail}</p>
                        <p className="text-gray-600">Room: {rental.renterRoom || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Owner:</span>
                        <p className="font-medium">{rental.sellerName}</p>
                        <p className="text-gray-600">{rental.sellerEmail}</p>
                        <p className="text-gray-600">Room: {rental.sellerRoom}</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Customer Paid:</span>
                          <p className="font-bold text-blue-900">₹{rental.totalPaid}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Owed to Seller:</span>
                          <p className="font-bold text-purple-900">₹{rental.amountOwedToSeller.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Already Paid Out:</span>
                          <p className="font-bold text-green-900">₹{rental.sellerPaidOut.toFixed(2)}</p>
                        </div>
                      </div>
                      {rental.securityDeposit > 0 && (
                        <p className="text-xs text-blue-700 mt-2">
                          🔒 Security Deposit: ₹{rental.securityDeposit}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      {rental.paymentStatus === 'PENDING' && (
                        <button
                          onClick={() => approvePayment(rental.id)}
                          disabled={updating === rental.id}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          ✅ Verify Payment
                        </button>
                      )}
                      {rental.status === 'ACTIVE' && (
                        <button
                          onClick={() => markReturned(rental.id)}
                          disabled={updating === rental.id}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          📦 Mark as Returned
                        </button>
                      )}
                    </div>

                    {rental.paymentPin && (
                      <p className="text-xs text-gray-500 mt-2">
                        UPI PIN: {rental.paymentPin}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Completed Rentals */}
        {activeTab === 'completed' && (
          <div className="space-y-4">
            {completedRentals.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No completed rentals</p>
              </div>
            ) : (
              completedRentals.map(rental => (
                <div key={rental.id} className="bg-white rounded-lg shadow border">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{rental.itemName}</h3>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 inline-block mt-2">
                          RETURNED
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">
                          Total: ₹{(rental.rentPerDay * rental.daysRented).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">{rental.daysRented} days rented</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-500">Renter:</span>
                        <p className="font-medium">{rental.renterName}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Owner:</span>
                        <p className="font-medium">{rental.sellerName}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Duration:</span>
                        <p className="font-medium">
                          {new Date(rental.startDate).toLocaleDateString()} - 
                          {rental.returnedAt ? new Date(rental.returnedAt).toLocaleDateString() : 'Ongoing'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-sm text-gray-600">Amount Owed to Seller:</span>
                          <p className="text-xl font-bold text-purple-900">
                            ₹{(rental.amountOwedToSeller - rental.sellerPaidOut).toFixed(2)}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          rental.paymentStatus === 'SETTLED' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {rental.paymentStatus === 'SETTLED' ? 'Paid Out' : 'Pending Payout'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Seller Payouts */}
        {activeTab === 'payouts' && (
          <div className="space-y-4">
            {payouts.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No pending payouts</p>
              </div>
            ) : (
              payouts.map(payout => (
                <div key={payout.sellerId} className="bg-white rounded-lg shadow border">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{payout.sellerName}</h3>
                        <p className="text-sm text-gray-600">{payout.sellerEmail}</p>
                        <p className="text-sm text-gray-600">Room: {payout.sellerRoom}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-purple-600">
                          ₹{payout.totalOwed.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">Total Owed</div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Active Rentals:</span>
                          <p className="font-medium">{payout.activeRentals}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Earnings:</span>
                          <p className="font-medium">₹{payout.totalEarned.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Already Paid:</span>
                          <p className="font-medium">₹{payout.totalPaid.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {payout.totalOwed > 0 && (
                      <button
                        onClick={() => markPaidOut(payout.sellerId, payout.totalOwed)}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium"
                      >
                        💰 Mark as Paid Out (₹{payout.totalOwed.toFixed(2)})
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}