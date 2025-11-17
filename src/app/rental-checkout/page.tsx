'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

interface Listing {
  id: string
  itemName: string
  description: string
  finalRent: number
  securityDeposit: number | null
  sellerName: string
  sellerRoom: string
  sellerPhone: string
  category: {
    id: string
    name: string
  }
}

export default function RentalCheckoutPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const listingId = searchParams?.get('listingId')
  
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [rentalDays, setRentalDays] = useState(7)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentPin, setPaymentPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchListing = async () => {
    try {
      const response = await fetch(`/api/listings/${listingId}`)
      if (response.ok) {
        const data = await response.json()
        setListing(data)
      } else {
        setError('Listing not found')
      }
    } catch (err) {
      console.error('Error fetching listing:', err)
      setError('Failed to load listing')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (!listingId) {
      router.push('/shop')
      return
    }
    fetchListing()
  }, [session, status, listingId, router, fetchListing])

  const handleRent = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/rentals/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing?.id,
          rentalDays,
          paymentPin,
          startDate
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process rental')
      }

      // Redirect to confirmation page
      router.push(`/rental-confirmation?rentalId=${data.rental.id}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process rental'
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!listing || error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Listing not found'}</p>
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

  const totalRent = listing.finalRent * rentalDays
  const securityDeposit = listing.securityDeposit || 0
  const totalAmount = totalRent + securityDeposit

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-800 mr-4 font-medium"
            >
              ← Back
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Rent: {listing.itemName}</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Item Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Item Details</h2>
            
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-500">Item Name:</span>
                <p className="font-medium text-gray-900">{listing.itemName}</p>
              </div>

              <div>
                <span className="text-sm text-gray-500">Category:</span>
                <p className="font-medium text-gray-900">{listing.category.name}</p>
              </div>

              <div>
                <span className="text-sm text-gray-500">Description:</span>
                <p className="text-gray-700">{listing.description}</p>
              </div>

              <div className="pt-4 border-t">
                <span className="text-sm text-gray-500">Owner:</span>
                <p className="font-medium text-gray-900">{listing.sellerName}</p>
                <p className="text-sm text-gray-600">Room: {listing.sellerRoom}</p>
                <p className="text-sm text-gray-600">Phone: {listing.sellerPhone}</p>
              </div>
            </div>
          </div>

          {/* Rental Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Rental Details</h2>
            
            <form onSubmit={handleRent} className="space-y-6">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                />
              </div>

              {/* Rental Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rental Period (Days) *
                </label>
                <input
                  type="number"
                  value={rentalDays}
                  onChange={(e) => setRentalDays(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 1 day. You can extend later if needed.
                </p>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-3">Cost Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Rent (₹{listing.finalRent}/day × {rentalDays} days):</span>
                    <span className="font-medium">₹{totalRent}</span>
                  </div>
                  {securityDeposit > 0 && (
                    <div className="flex justify-between">
                      <span>Security Deposit (refundable):</span>
                      <span className="font-medium">₹{securityDeposit}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-purple-300 font-bold text-base">
                    <span>Total Amount:</span>
                    <span className="text-purple-900">₹{totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">UPI Payment Instructions</h3>
                <div className="text-center mb-4">
                  <Image 
                    src="/QRCode.jpg" 
                    alt="UPI QR Code"
                    width={192}
                    height={192}
                    className="mx-auto rounded-lg border"
                  />
                  <p className="text-sm font-semibold text-blue-800 mt-2">
                    UPI ID: harshika.anand-1@okhdfcbank
                  </p>
                </div>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>1. Pay exactly ₹{totalAmount} via UPI</p>
                  <p>2. Enter last 4 digits of transaction ID below</p>
                  <p>3. Admin will verify and activate your rental</p>
                </div>
              </div>

              {/* Payment PIN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last 4 digits of UPI Transaction ID *
                </label>
                <input
                  type="text"
                  value={paymentPin}
                  onChange={(e) => setPaymentPin(e.target.value.slice(0, 4))}
                  placeholder="1234"
                  maxLength={4}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50"
              >
                {submitting ? 'Processing...' : `Rent for ₹${totalAmount}`}
              </button>

              <p className="text-xs text-gray-500 text-center">
                By renting, you agree to return the item in good condition. 
                {securityDeposit > 0 && ' Security deposit will be refunded upon return.'}
              </p>
            </form>
          </div>
        </div>

        {/* Important Notes */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-900 mb-3">📋 Important Notes</h3>
          <ul className="text-sm text-yellow-800 space-y-2">
            <li>• Daily charges will accumulate automatically</li>
            <li>• Contact the owner directly to arrange pickup</li>
            <li>• Return the item in the same condition to get your security deposit back</li>
            <li>• Late returns may incur additional charges</li>
            <li>• Admin will verify your payment within a few hours</li>
          </ul>
        </div>
      </div>
    </div>
  )
}