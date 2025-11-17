'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

interface RentalTransaction {
  id: string
  itemName: string
  rentPerDay: number
  daysRented: number
  totalPaid: number
  securityDeposit: number | null
  status: string
  paymentStatus: string
  paymentMethod: string
  startDate: string
  sellerName: string
  sellerRoom: string
  sellerPhone: string
  renterName: string
  renterEmail: string
}

export default function RentalConfirmationPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const rentalId = searchParams?.get('rentalId')
  
  const [rental, setRental] = useState<RentalTransaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (!rentalId) {
      router.push('/shop')
      return
    }
    fetchRental()
  }, [session, status, rentalId, router])

  const fetchRental = async () => {
    try {
      const response = await fetch(`/api/rentals/${rentalId}`)
      if (response.ok) {
        const data = await response.json()
        setRental(data)
      } else {
        setError('Rental not found')
      }
    } catch (error) {
      console.error('Error fetching rental:', error)
      setError('Failed to load rental details')
    } finally {
      setLoading(false)
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!rental || error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Rental not found'}</p>
          <button
            onClick={() => router.push('/shop')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Shop
          </button>
        </div>
      </div>
    )
  }

  const getStatusInfo = () => {
    if (rental.paymentStatus === 'PENDING') {
      return {
        icon: '⏳',
        title: 'Payment Under Verification',
        message: 'Your rental request has been submitted! Admin is verifying your UPI payment.',
        color: 'bg-yellow-50 border-yellow-200 text-yellow-800'
      }
    }
    if (rental.status === 'ACTIVE') {
      return {
        icon: '✅',
        title: 'Rental Active!',
        message: 'Your rental is now active. Contact the owner to arrange pickup.',
        color: 'bg-green-50 border-green-200 text-green-800'
      }
    }
    return {
      icon: '📋',
      title: 'Rental Submitted',
      message: 'Your rental request is being processed.',
      color: 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => router.push('/shop')}
              className="text-blue-600 hover:text-blue-800 mr-4 font-medium"
            >
              ← Back to Shop
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Rental Confirmation</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        <div className="bg-white rounded-lg shadow p-8 text-center mb-8">
          <div className="text-6xl mb-4">{statusInfo.icon}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{statusInfo.title}</h2>
          <p className="text-gray-600 mb-4">{statusInfo.message}</p>
          <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium border ${statusInfo.color}`}>
            Status: {rental.status}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Rental Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Rental Details</h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-500">Item:</span>
                <p className="font-medium text-gray-900">{rental.itemName}</p>
              </div>

              <div>
                <span className="text-sm text-gray-500">Rental Rate:</span>
                <p className="font-medium text-gray-900">₹{rental.rentPerDay}/day</p>
              </div>

              <div>
                <span className="text-sm text-gray-500">Start Date:</span>
                <p className="font-medium text-gray-900">
                  {new Date(rental.startDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              <div>
                <span className="text-sm text-gray-500">Payment Method:</span>
                <p className="font-medium text-gray-900">{rental.paymentMethod}</p>
              </div>

              <div>
                <span className="text-sm text-gray-500">Payment Status:</span>
                <p className={`font-medium ${
                  rental.paymentStatus === 'PAID' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {rental.paymentStatus}
                </p>
              </div>

              <div className="pt-4 border-t">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="font-medium">₹{rental.totalPaid}</span>
                  </div>
                  {rental.securityDeposit && rental.securityDeposit > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Security Deposit:</span>
                      <span className="font-medium">₹{rental.securityDeposit}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Owner Contact Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Item Owner Contact</h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-500">Owner Name:</span>
                <p className="font-medium text-gray-900">{rental.sellerName}</p>
              </div>

              <div>
                <span className="text-sm text-gray-500">Room Number:</span>
                <p className="font-medium text-gray-900">{rental.sellerRoom}</p>
              </div>

              <div>
                <span className="text-sm text-gray-500">Phone Number:</span>
                <p className="font-medium text-gray-900">{rental.sellerPhone}</p>
              </div>

              {rental.status === 'ACTIVE' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                  <p className="text-sm text-green-800 font-medium mb-2">
                    ✅ You can now contact the owner to arrange item pickup!
                  </p>
                  <a
                    href={`tel:${rental.sellerPhone}`}
                    className="block w-full text-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    📞 Call Owner
                  </a>
                </div>
              )}

              {rental.paymentStatus === 'PENDING' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                  <p className="text-sm text-yellow-800">
                    ⏳ Please wait for admin to verify your payment before contacting the owner.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* What's Next Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="font-semibold text-blue-900 mb-4">📋 What Happens Next?</h3>
          <div className="space-y-3 text-sm text-blue-800">
            {rental.paymentStatus === 'PENDING' ? (
              <>
                <div className="flex items-start">
                  <span className="font-bold mr-2">1.</span>
                  <p>Admin will verify your UPI payment (usually within a few hours)</p>
                </div>
                <div className="flex items-start">
                  <span className="font-bold mr-2">2.</span>
                  <p>Once verified, you will be able to contact the owner</p>
                </div>
                <div className="flex items-start">
                  <span className="font-bold mr-2">3.</span>
                  <p>Arrange pickup time and location with the owner</p>
                </div>
                <div className="flex items-start">
                  <span className="font-bold mr-2">4.</span>
                  <p>Daily charges will accumulate automatically</p>
                </div>
                <div className="flex items-start">
                  <span className="font-bold mr-2">5.</span>
                  <p>Return the item when done to get your security deposit back</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start">
                  <span className="font-bold mr-2">1.</span>
                  <p>Contact the owner using the details above</p>
                </div>
                <div className="flex items-start">
                  <span className="font-bold mr-2">2.</span>
                  <p>Arrange a convenient time to pick up the item</p>
                </div>
                <div className="flex items-start">
                  <span className="font-bold mr-2">3.</span>
                  <p>Daily charges are accumulating automatically</p>
                </div>
                <div className="flex items-start">
                  <span className="font-bold mr-2">4.</span>
                  <p>Take good care of the item</p>
                </div>
                <div className="flex items-start">
                  <span className="font-bold mr-2">5.</span>
                  <p>Contact admin when ready to return to get your security deposit back</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Important Reminders */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-yellow-900 mb-4">⚠️ Important Reminders</h3>
          <ul className="text-sm text-yellow-800 space-y-2">
            <li>• Daily rental charges accumulate automatically</li>
            <li>• Keep the item in good condition</li>
            <li>• Contact admin before the rental period to avoid extra charges</li>
            <li>• Security deposit will be refunded after item return inspection</li>
            <li>• Any damage may be deducted from the security deposit</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button
            onClick={() => router.push('/shop')}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Continue Shopping
          </button>
          <button
            onClick={() => router.push('/orders')}
            className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition font-medium"
          >
            View My Orders
          </button>
        </div>
      </div>
    </div>
  )
}