'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  stockQuantity: number
}

export default function CheckoutPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cod'>('upi')
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load cart from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('hostel-mart-cart')
      if (savedCart) {
        setCart(JSON.parse(savedCart))
      }
    }
  }, [])

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size must be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file')
        return
      }
      setPaymentProof(file)
      setError('')
    }
  }

  const placeOrder = async () => {
    if (cart.length === 0) {
      setError('Your cart is empty')
      return
    }

    if (paymentMethod === 'upi' && !paymentProof) {
      setError('Please upload payment screenshot for UPI payment')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      
      // Add order data
      formData.append('items', JSON.stringify(cart))
      formData.append('paymentMethod', paymentMethod)
      formData.append('totalAmount', cartTotal.toString())
      
      // Add payment proof if UPI
      if (paymentMethod === 'upi' && paymentProof) {
        formData.append('paymentProof', paymentProof)
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to place order')
      }

      const order = await response.json()
      
      // Clear cart
      localStorage.removeItem('hostel-mart-cart')
      
      // Redirect to order confirmation
      router.push(`/order-confirmation?orderId=${order.id}`)

    } catch (error: any) {
      console.error('Error placing order:', error)
      setError(error.message || 'Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) {
    return null
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <button
            onClick={() => router.push('/shop')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => router.push('/shop')}
              className="text-blue-600 hover:text-blue-800 mr-4 font-medium"
            >
              ← Back to Shop
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Checkout</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              {cart.map(item => (
                <div key={item.productId} className="flex justify-between items-center py-3 border-b border-gray-100">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                  </div>
                  <span className="font-semibold text-gray-900">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-xl font-bold text-gray-900">
                <span>Total:</span>
                <span>₹{cartTotal}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Method</h2>
            
            {/* Payment Options */}
            <div className="space-y-4 mb-6">
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment"
                  value="upi"
                  checked={paymentMethod === 'upi'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'upi')}
                  className="mr-3"
                />
                <div className="flex-1">
                  <span className="font-medium">UPI Payment</span>
                  <p className="text-sm text-gray-500">Pay via UPI and upload screenshot</p>
                </div>
              </label>

              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'cod')}
                  className="mr-3"
                />
                <div className="flex-1">
                  <span className="font-medium">Cash on Delivery</span>
                  <p className="text-sm text-gray-500">Pay when you collect your order</p>
                </div>
              </label>
            </div>

            {/* UPI Payment Details */}
            {paymentMethod === 'upi' && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-3">UPI Payment Instructions</h3>
                <div className="text-center mb-4">
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                      <span className="text-gray-500">QR Code</span>
                      {/* You can add an actual QR code image here */}
                    </div>
                    <p className="text-sm text-gray-600">Scan QR code to pay</p>
                  </div>
                </div>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>1. Scan the QR code or use UPI ID: your-upi@paytm</p>
                  <p>2. Pay exactly ₹{cartTotal}</p>
                  <p>3. Take screenshot of successful payment</p>
                  <p>4. Upload screenshot below</p>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Payment Screenshot *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {paymentProof && (
                    <p className="text-sm text-green-600 mt-2">Screenshot uploaded successfully</p>
                  )}
                </div>
              </div>
            )}

            {/* Cash on Delivery Details */}
            {paymentMethod === 'cod' && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">Cash on Delivery Instructions</h3>
                <div className="text-sm text-green-800 space-y-1">
                  <p>1. Your order will be confirmed after admin verification</p>
                  <p>2. You'll receive a notification when ready for pickup</p>
                  <p>3. Come to room [Your Room Number] to collect</p>
                  <p>4. Pay ₹{cartTotal} in cash during pickup</p>
                  <p>5. Keep exact change if possible</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Place Order Button */}
            <button
              onClick={placeOrder}
              disabled={loading || (paymentMethod === 'upi' && !paymentProof)}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Placing Order...' : `Place Order - ₹${cartTotal}`}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              By placing this order, you agree to collect it within 24 hours of confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}