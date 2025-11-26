// FILE: src/app/my-rentals/page.tsx
// Customer's view of their rentals
'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Rental {
  id: string
  itemName: string
  rentPerDay: number
  platformFee: number
  daysRented: number
  totalPaid: number
  securityDeposit: number | null
  status: string
  paymentStatus: string
  startDate: string
  returnedAt: string | null
  sellerName: string
  sellerRoom: string
  sellerPhone: string
  sellerId: string
}

export default function MyRentalsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [rentals, setRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    if (session) {
      fetchRentals()
    }
  }, [status, session, router])

  const fetchRentals = async () => {
    try {
      const response = await fetch('/api/rentals/my')
      if (response.ok) {
        const data = await response.json()
        setRentals(data)
      }
    } catch (error) {
      console.error('Error fetching rentals:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDaysElapsed = (startDate: string) => {
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffTime = today.getTime() - start.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const calculateReturnDate = (startDate: string, daysRented: number) => {
    const start = new Date(startDate)
    const returnDate = new Date(start)
    returnDate.setDate(start.getDate() + daysRented)
    return returnDate
  }

  const activeRentals = rentals.filter(r => r.status === 'ACTIVE' || r.status === 'PENDING')
  const completedRentals = rentals.filter(r => r.status === 'RETURNED' || r.status === 'CANCELLED')

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
              <h1 className="text-xl font-semibold text-gray-900">My Rentals</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Simple Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">🏷️</div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{activeRentals.length}</div>
                <div className="text-sm text-gray-600">Active Rentals</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">✅</div>
              <div>
                <div className="text-2xl font-bold text-green-600">{completedRentals.length}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 font-medium ${activeTab === 'active'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Active Rentals ({activeRentals.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-6 py-3 font-medium ${activeTab === 'completed'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Completed ({completedRentals.length})
            </button>
          </div>
        </div>

        {/* Active Rentals */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {activeRentals.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">🏷️</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Rentals</h3>
                <p className="text-gray-600 mb-6">Start renting items from the shop!</p>
                <button
                  onClick={() => router.push('/shop')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Browse Rentals
                </button>
              </div>
            ) : (
              activeRentals.map(rental => {
                const daysElapsed = calculateDaysElapsed(rental.startDate)
                const returnDate = calculateReturnDate(rental.startDate, rental.daysRented)
                const isOverdue = daysElapsed >= rental.daysRented
                
                // Calculate what was paid
                const totalRent = rental.rentPerDay * rental.daysRented

                return (
                  <div key={rental.id} className="bg-white rounded-lg shadow border">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{rental.itemName}</h3>
                          <div className="flex gap-2 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${rental.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                rental.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                              }`}>
                              {rental.status}
                            </span>
                            {isOverdue && rental.status === 'ACTIVE' && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                OVERDUE
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-purple-600">₹{rental.rentPerDay}/day</div>
                          <div className="text-sm text-gray-500">{rental.daysRented} days booked</div>
                        </div>
                      </div>

                      {/* Rental Timeline */}
                      <div className={`${isOverdue ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 mb-4`}>
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <p className="text-sm text-gray-600">Started</p>
                            <p className="font-bold text-gray-900">
                              {new Date(rental.startDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className={`text-2xl font-bold ${isOverdue ? 'text-red-900' : 'text-blue-900'}`}>
                              Day {daysElapsed + 1}
                            </p>
                            <p className="text-xs text-gray-600">of {rental.daysRented} days</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Return By</p>
                            <p className={`font-bold ${isOverdue ? 'text-red-900' : 'text-gray-900'}`}>
                              {returnDate.toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${isOverdue ? 'bg-red-600' : 'bg-blue-600'}`}
                            style={{ width: `${Math.min(((daysElapsed + 1) / rental.daysRented) * 100, 100)}%` }}
                          ></div>
                        </div>

                        {isOverdue && (
                          <p className="text-xs text-red-700 mt-3 font-medium">
                            ⚠️ Please return the item soon to avoid extra charges
                          </p>
                        )}
                      </div>

                      {/* Payment Info */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-sm text-gray-900 mb-3">Payment Breakdown:</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Rent ({rental.daysRented} days):</span>
                            <span className="font-medium text-gray-900">₹{totalRent}</span>
                          </div>
                          {rental.securityDeposit && rental.securityDeposit > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Security Deposit:</span>
                              <span className="font-medium text-purple-900">₹{rental.securityDeposit}</span>
                            </div>
                          )}
                          <div className="border-t pt-2 flex justify-between">
                            <span className="text-gray-900 font-semibold">Total Paid:</span>
                            <span className="font-bold text-blue-900">₹{rental.totalPaid}</span>
                          </div>
                        </div>
                        {rental.securityDeposit && rental.securityDeposit > 0 && (
                          <p className="text-xs text-gray-600 mt-3">
                            💡 Security deposit will be refunded after return
                          </p>
                        )}
                      </div>

                      {rental.paymentStatus === 'PENDING' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                          <p className="text-sm text-yellow-800">
                            ⏳ Payment verification pending
                          </p>
                        </div>
                      )}

                      {/* Owner Contact */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Item Owner</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Name:</span>
                            <p className="font-medium">{rental.sellerName}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Room:</span>
                            <p className="font-medium">{rental.sellerRoom}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Phone:</span>
                            <p className="font-medium">{rental.sellerPhone}</p>
                          </div>
                        </div>
                      </div>
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
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Completed Rentals</h3>
                <p className="text-gray-600">Your rental history will appear here.</p>
              </div>
            ) : (
              completedRentals.map(rental => (
                <div key={rental.id} className="bg-white rounded-lg shadow border">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{rental.itemName}</h3>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${rental.status === 'RETURNED' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                          {rental.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">₹{rental.totalPaid}</div>
                        <div className="text-sm text-gray-500">{rental.daysRented} days</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-gray-500">Started:</span>
                        <p className="font-medium">
                          {new Date(rental.startDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Returned:</span>
                        <p className="font-medium">
                          {rental.returnedAt ? new Date(rental.returnedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          }) : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {rental.securityDeposit && rental.securityDeposit > 0 && rental.status === 'RETURNED' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                          ✅ Security deposit of ₹{rental.securityDeposit} will be refunded
                        </p>
                      </div>
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