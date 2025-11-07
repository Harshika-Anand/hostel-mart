'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Category {
  id: string
  name: string
}

export default function NewListingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    itemName: '',
    description: '',
    categoryId: '',
    rentPerDay: '',
    securityDeposit: '',
    quantity: '1'
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    fetchCategories()
  }, [status, router])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const calculateFees = () => {
    const rent = parseFloat(formData.rentPerDay) || 0
    const platformFee = rent * 0.20
    const finalRent = rent + platformFee
    return { platformFee, finalRent }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit listing')
      }

      // Success - redirect to success page
      router.push('/sell-rent/pending')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const { platformFee, finalRent } = calculateFees()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-800 mr-4 font-medium"
            >
              ← Back
            </button>
            <h1 className="text-xl font-semibold text-gray-900">List Item for Rent</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Item Details</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Item Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Name *
              </label>
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleChange}
                placeholder="e.g., Scientific Calculator"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the item condition, features, any accessories included..."
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity Available
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">How many of this item do you have available?</p>
            </div>

            {/* Rent Per Day */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Expected Rent (per day) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-2 text-gray-500">₹</span>
                <input
                  type="number"
                  name="rentPerDay"
                  value={formData.rentPerDay}
                  onChange={handleChange}
                  placeholder="50"
                  min="1"
                  step="1"
                  required
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">How much do you want to earn per day?</p>
            </div>

            {/* Security Deposit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Security Deposit (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-2 text-gray-500">₹</span>
                <input
                  type="number"
                  name="securityDeposit"
                  value={formData.securityDeposit}
                  onChange={handleChange}
                  placeholder="500"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Refundable amount to protect against damage/loss
              </p>
            </div>

            {/* Price Breakdown */}
            {formData.rentPerDay && parseFloat(formData.rentPerDay) > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Price Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-800">Your rent (per day):</span>
                    <span className="font-semibold text-blue-900">₹{formData.rentPerDay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-800">Platform fee (20%):</span>
                    <span className="font-semibold text-blue-900">₹{platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-blue-300 pt-2 mt-2">
                    <span className="text-blue-900 font-semibold">Customer pays (per day):</span>
                    <span className="font-bold text-blue-900 text-lg">₹{finalRent.toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-3">
                  💡 You will receive ₹{formData.rentPerDay} per day when the item is rented
                </p>
              </div>
            )}

            {/* Contact Info Display */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Your Contact Information</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Name:</strong> {session.user.name}</p>
                <p><strong>Email:</strong> {session.user.email}</p>
                <p><strong>Phone:</strong> {session.user.phone}</p>
                <p><strong>Room:</strong> {session.user.roomNumber}</p>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                This information will be shared with customers who rent your item
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <h4 className="font-semibold text-yellow-900 mb-2">📋 What Happens Next?</h4>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Your listing will be reviewed by the admin</li>
            <li>• You'll be notified once it's approved</li>
            <li>• Approved items will appear in the shop</li>
            <li>• When someone rents, you'll receive their contact details</li>
          </ul>
        </div>
      </div>
    </div>
  )
}