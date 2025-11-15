'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Rental {
  id: string
  itemName: string
  rentPerDay: number
  daysRented: number
  totalPaid: number
  amountOwedToSeller: number
  securityDeposit: number | null
  status: string
  paymentStatus: string
  startDate: string
  returnedAt: string | null
  sellerName: string
  sellerRoom: string
  sellerPhone: string
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

  const activeRentals = rentals.filter(r => r.status === 'ACTIVE' || r.status === 'PENDING')
  const completedRentals = rentals.filter(r => r.status === 'RETURNED' || r.status === 'CANCELLED')

  const totalActiveCharges = activeRentals.reduce((sum, r) => sum + (r.rentPerDay * r.daysRented), 0)
  const totalSecurityDeposits = activeRentals.reduce((sum, r) => sum + (r.securityDeposit || 0), 0)

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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              <div className="text-3xl mr-4">💰</div>
              <div>
                <div className="text-2xl font-bold text-orange-600">₹{totalActiveCharges.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Total Charges</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">🔒</div>
              <div>
                <div className="text-2xl font-bold text-purple-600">₹{totalSecurityDeposits}</div>
                <div className="text-sm text-gray-600">Security Deposits</div>
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
                        <div className="text-2xl font-bold text-purple-600">₹{rental.rentPerDay}/day</div>
                        <div className="text-sm text-gray-500">{rental.daysRented} days rented</div>
                      </div>
                    </div>

                    {/* Accumulating Charges */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-orange-900 mb-2">💰 Accumulating Charges</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Daily Rate:</span>
                          <p className="font-bold text-orange-900">₹{rental.rentPerDay}/day</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Days Rented:</span>
                          <p className="font-bold text-orange-900">{rental.daysRented} days</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total So Far:</span>
                          <p className="font-bold text-orange-900">₹{(rental.rentPerDay * rental.daysRented).toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Already Paid:</span>
                          <p className="font-bold text-green-900">₹{rental.totalPaid}</p>
                        </div>
                      </div>
                      {rental.securityDeposit && rental.securityDeposit > 0 && (
                        <p className="text-xs text-orange-700 mt-2">
                          🔒 Security Deposit: ₹{rental.securityDeposit} (Refundable on return)
                        </p>
                      )}
                    </div>

                    {/* Owner Contact */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
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

                    {/* Rental Details */}
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Start Date:</strong> {new Date(rental.startDate).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</p>
                      {rental.status === 'ACTIVE' && (
                        <p className="text-orange-600 font-medium">
                          ⚠️ Charges are accumulating daily. Contact admin when ready to return.
                        </p>
                      )}
                      {rental.paymentStatus === 'PENDING' && (
                        <p className="text-yellow-600 font-medium">
                          ⏳ Waiting for admin to verify your payment.
                        </p>
                      )}
                    </div>

                    {/* Contact Owner Button */}
                    {rental.status === 'ACTIVE' && (
                      <div className="mt-4">
                        <a
                          href={`tel:${rental.sellerPhone}`}
                          className="block w-full text-center bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium"
                        >
                          📞 Contact Owner
                        </a>
                      </div>
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
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                          rental.status === 'RETURNED' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {rental.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">
                          Total: ₹{(rental.rentPerDay * rental.daysRented).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">{rental.daysRented} days</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-500">Owner:</span>
                        <p className="font-medium">{rental.sellerName}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Duration:</span>
                        <p className="font-medium">
                          {new Date(rental.startDate).toLocaleDateString()} - 
                          {rental.returnedAt ? new Date(rental.returnedAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {rental.securityDeposit && rental.securityDeposit > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                          ✅ Security deposit of ₹{rental.securityDeposit} should be refunded.
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