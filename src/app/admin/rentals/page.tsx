// FILE 1: src/app/admin/rentals/page.tsx
// FIXED: Shows correct 80% payout calculations
// ============================================
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
  platformFee: number
  sellerEarning: number
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
  pendingRentals: number
}

export default function AdminRentalsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [rentals, setRentals] = useState<RentalTransaction[]>([])
  const [payouts, setPayouts] = useState<PayoutSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'completed' | 'payouts'>('pending')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchRentals()
  }, [session, status, router])

  const calculateDaysElapsed = (startDate: string, returnedAt: string | null) => {
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = returnedAt ? new Date(returnedAt) : new Date()
    end.setHours(0, 0, 0, 0)
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const calculateReturnDate = (startDate: string, daysRented: number) => {
    const start = new Date(startDate)
    const returnDate = new Date(start)
    returnDate.setDate(start.getDate() + daysRented)
    return returnDate
  }

  // Calculate what seller will actually earn (80% of rent)
  const calculateSellerPayout = (rental: RentalTransaction) => {
    const totalRent = rental.rentPerDay * rental.daysRented
    const platformCut = rental.platformFee * rental.daysRented
    return totalRent - platformCut // 80% of rent
  }

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
    if (!confirm(`Mark ₹${amount.toFixed(2)} as paid out to seller?`)) return
    
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

  const pendingRentals = rentals.filter(r => r.status === 'PENDING')
  const activeRentals = rentals.filter(r => r.status === 'ACTIVE')
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
            <div className="text-2xl font-bold text-yellow-600">{pendingRentals.length}</div>
            <div className="text-sm text-gray-600">Pending Verification</div>
          </div>
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
            <div className="text-sm text-gray-600">Pending Payouts</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'pending'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending ({pendingRentals.length})
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'active'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active ({activeRentals.length})
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
              Payouts ({payouts.length})
            </button>
          </div>
        </div>

        {/* Pending Rentals */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingRentals.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No pending payment verifications</p>
              </div>
            ) : (
              pendingRentals.map(rental => {
                // ✅ CORRECT CALCULATION: 80% of rent only
                const totalRent = rental.rentPerDay * rental.daysRented
                const platformCut = rental.platformFee * rental.daysRented
                const sellerEarning = totalRent - platformCut

                return (
                  <div key={rental.id} className="bg-white rounded-lg shadow border border-yellow-200">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{rental.itemName}</h3>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 inline-block mt-2">
                            ⏳ PAYMENT PENDING
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-purple-600">₹{rental.totalPaid}</div>
                          <p className="text-sm text-gray-600">{rental.daysRented} days</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                          <span className="text-gray-500 font-medium">Customer:</span>
                          <p className="font-semibold text-gray-900">{rental.renterName}</p>
                          <p className="text-gray-600">{rental.renterEmail}</p>
                          <p className="text-gray-600">Room: {rental.renterRoom || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                          <span className="text-gray-500 font-medium">Owner:</span>
                          <p className="font-semibold text-gray-900">{rental.sellerName}</p>
                          <p className="text-gray-600">{rental.sellerEmail}</p>
                          <p className="text-gray-600">Room: {rental.sellerRoom}</p>
                        </div>
                      </div>

                      {/* ✅ CORRECT BREAKDOWN */}
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-sm text-gray-900 mb-3">Payment Breakdown:</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Customer Paid:</span>
                            <span className="font-bold text-blue-900">₹{rental.totalPaid}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">├─ Rent ({rental.daysRented} days):</span>
                            <span className="font-medium text-gray-900">₹{totalRent}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">└─ Security Deposit:</span>
                            <span className="font-medium text-gray-900">₹{rental.securityDeposit}</span>
                          </div>
                          <div className="border-t pt-2 mt-2"></div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Platform Fee (20%):</span>
                            <span className="font-medium text-orange-900">-₹{platformCut}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 font-semibold">Owner Will Earn (80%):</span>
                            <span className="font-bold text-green-900">₹{sellerEarning}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-3">
                          💡 Security deposit will be returned to customer. Owner gets 80% of rent only.
                        </p>
                      </div>

                      <button
                        onClick={() => approvePayment(rental.id)}
                        disabled={updating === rental.id}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                      >
                        ✅ Verify Payment & Activate Rental
                      </button>

                      {rental.paymentPin && (
                        <p className="text-xs text-gray-500 mt-3">
                          UPI PIN: {rental.paymentPin}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Active Rentals */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {activeRentals.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No active rentals</p>
              </div>
            ) : (
              activeRentals.map(rental => {
                const daysElapsed = calculateDaysElapsed(rental.startDate, null)
                const returnDate = calculateReturnDate(rental.startDate, rental.daysRented)
                const isOverdue = daysElapsed >= rental.daysRented
                
                // ✅ CORRECT: Show 80% of rent as seller payout
                const sellerPayout = calculateSellerPayout(rental)

                return (
                  <div key={rental.id} className="bg-white rounded-lg shadow border">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{rental.itemName}</h3>
                          <div className="flex gap-2 mt-2">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ACTIVE
                            </span>
                            {isOverdue && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                OVERDUE
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-900">
                            Day {daysElapsed + 1}/{rental.daysRented}
                          </div>
                          <p className="text-sm text-gray-600">
                            Return by {returnDate.toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                          <span className="text-gray-500 font-medium">Customer:</span>
                          <p className="font-semibold text-gray-900">{rental.renterName}</p>
                          <p className="text-gray-600">{rental.renterRoom || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                          <span className="text-gray-500 font-medium">Owner:</span>
                          <p className="font-semibold text-gray-900">{rental.sellerName}</p>
                          <p className="text-gray-600">{rental.sellerRoom}</p>
                        </div>
                      </div>

                      {/* ✅ CORRECT Financial Summary */}
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600">Customer Paid:</span>
                            <p className="font-bold text-blue-900">₹{rental.totalPaid}</p>
                            <p className="text-xs text-gray-500">(Rent + Security)</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Owner Will Earn:</span>
                            <p className="font-bold text-green-900">₹{sellerPayout}</p>
                            <p className="text-xs text-gray-500">(80% of rent)</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          💡 Payout ready after return
                        </p>
                      </div>

                      <button
                        onClick={() => markReturned(rental.id)}
                        disabled={updating === rental.id}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                      >
                        📦 Mark as Returned
                      </button>
                    </div>
                  </div>
                )
              })
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
              completedRentals.map(rental => {
                return (
                  <div key={rental.id} className="bg-white rounded-lg shadow border">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{rental.itemName}</h3>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 inline-block mt-2">
                            ✅ RETURNED
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-900">
                            {rental.daysRented} days
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(rental.returnedAt!).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                          <span className="text-gray-600">Customer:</span>
                          <p className="font-medium">{rental.renterName}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                          <span className="text-gray-600">Owner:</span>
                          <p className="font-medium">{rental.sellerName}</p>
                        </div>
                      </div>

                      {/* ✅ CORRECT: Shows 80% payout */}
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-sm text-gray-600">Owner Payout (80% of rent):</span>
                            <p className="text-2xl font-bold text-purple-900">
                              ₹{rental.amountOwedToSeller.toFixed(2)}
                            </p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            rental.paymentStatus === 'SETTLED'
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {rental.paymentStatus === 'SETTLED' ? '✅ Paid' : '⏳ Pending'}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Security deposit (₹{rental.securityDeposit}) returned to customer
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Payouts Tab */}
        {activeTab === 'payouts' && (
          <div className="space-y-4">
            {payouts.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No pending payouts</p>
              </div>
            ) : (
              payouts.map(payout => (
                <div key={payout.sellerId} className="bg-white rounded-lg shadow border border-purple-200">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{payout.sellerName}</h3>
                        <p className="text-sm text-gray-600">{payout.sellerEmail}</p>
                        <p className="text-sm text-gray-600">Room: {payout.sellerRoom}</p>
                        <p className="text-xs text-purple-600 mt-1">
                          {payout.pendingRentals} completed {payout.pendingRentals === 1 ? 'rental' : 'rentals'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-purple-600">
                          ₹{payout.totalOwed.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">To Pay (80% of rent)</div>
                      </div>
                    </div>

                    <button
                      onClick={() => markPaidOut(payout.sellerId, payout.totalOwed)}
                      className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
                    >
                      💰 Mark as Paid Out
                    </button>
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
