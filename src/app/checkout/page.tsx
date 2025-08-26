'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'

export default function CheckoutPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { cart, clearCart, getCartTotal } = useCart()
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cod'>('upi')
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup')
  const [roomNumber, setRoomNumber] = useState('')
  const [paymentPin, setPaymentPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const cartTotal = getCartTotal()
  const deliveryFee = deliveryMethod === 'delivery' ? 10 : 0
  const finalTotal = cartTotal + deliveryFee

  const placeOrder = async () => {
    if (cart.length === 0) {
      setError('Your cart is empty')
      return
    }

    if (paymentMethod === 'upi' && !paymentPin) {
      setError('Please enter the last 4 digits of your UPI transaction ID')
      return
    }

    if (deliveryMethod === 'delivery' && !roomNumber) {
      setError('Please enter your room number for delivery')
      return
    }

    if (paymentMethod === 'cod' && deliveryMethod === 'delivery' && !roomNumber) {
      setError('Please enter your room number for delivery')
      return
    }

    setLoading(true)
    setError('')

    try {
      const orderData = {
        items: cart,
        paymentMethod,
        deliveryMethod,
        roomNumber: deliveryMethod === 'delivery' ? roomNumber : null,
        paymentPin: paymentMethod === 'upi' ? paymentPin : null,
        subtotal: cartTotal,
        deliveryFee,
        totalAmount: finalTotal
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to place order')
      }

      const order = await response.json()
      
      // Clear cart only after successful order
      clearCart()
      
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

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>₹{cartTotal}</span>
              </div>
              {deliveryMethod === 'delivery' && (
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee:</span>
                  <span>₹{deliveryFee}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xl font-bold text-gray-900 pt-2 border-t">
                <span>Total:</span>
                <span>₹{finalTotal}</span>
              </div>
            </div>
          </div>

          {/* Payment & Delivery */}
          <div className="space-y-6">
            {/* Delivery Method */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Delivery Method</h2>
              
              <div className="space-y-4">
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="delivery"
                    value="pickup"
                    checked={deliveryMethod === 'pickup'}
                    onChange={(e) => setDeliveryMethod(e.target.value as 'pickup')}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <span className="font-medium">Self Pickup</span>
                    <p className="text-sm text-gray-500">Collect from our room - FREE</p>
                  </div>
                  <span className="font-semibold text-green-600">Free</span>
                </label>

                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="delivery"
                    value="delivery"
                    checked={deliveryMethod === 'delivery'}
                    onChange={(e) => setDeliveryMethod(e.target.value as 'delivery')}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <span className="font-medium">Room Delivery</span>
                    <p className="text-sm text-gray-500">We'll bring it to your room</p>
                  </div>
                  <span className="font-semibold text-blue-600">₹10</span>
                </label>
              </div>

              {deliveryMethod === 'delivery' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Number *
                  </label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g., A-101, B-205"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Method</h2>
              
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
                    <p className="text-sm text-gray-500">Pay now via UPI - Instant confirmation</p>
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
                    <span className="font-medium">Cash on {deliveryMethod === 'delivery' ? 'Delivery' : 'Pickup'}</span>
                    <p className="text-sm text-gray-500">Pay when you receive your order</p>
                  </div>
                </label>
              </div>

              {/* UPI Payment Details */}
              {paymentMethod === 'upi' && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-3">UPI Payment Instructions</h3>
                  <div className="text-center mb-4">
                    <div className="bg-white p-4 rounded-lg inline-block">
                      <div className="w-40 h-40 bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                        <span className="text-gray-500 text-sm">QR Code</span>
                      </div>
                      <p className="text-sm font-semibold">UPI ID: hostelmart@paytm</p>
                    </div>
                  </div>
                  
                  <div className="text-sm text-blue-800 mb-4 space-y-1">
                    <p>1. Pay exactly ₹{finalTotal}</p>
                    <p>2. Use UPI ID: <strong>hostelmart@paytm</strong></p>
                    <p>3. Enter last 4 digits of transaction ID below</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last 4 digits of UPI Transaction ID *
                    </label>
                    <input
                      type="text"
                      value={paymentPin}
                      onChange={(e) => setPaymentPin(e.target.value.slice(0, 4))}
                      placeholder="e.g., 1234"
                      maxLength={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Find this in your payment app after successful payment
                    </p>
                  </div>
                </div>
              )}

              {/* Cash Payment Details */}
              {paymentMethod === 'cod' && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-3">Cash Payment Instructions</h3>
                  <div className="text-sm text-green-800 space-y-1">
                    {deliveryMethod === 'pickup' ? (
                      <>
                        <p>1. Come to our room for pickup</p>
                        <p>2. Pay ₹{finalTotal} in cash</p>
                        <p>3. Collect your items</p>
                      </>
                    ) : (
                      <>
                        <p>1. We'll deliver to room {roomNumber || '[Your Room]'}</p>
                        <p>2. Pay ₹{finalTotal} in cash during delivery</p>
                        <p>3. Keep exact change if possible</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {/* Place Order Button */}
              <button
                onClick={placeOrder}
                disabled={loading}
                className="w-full mt-6 bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Placing Order...' : `Place Order - ₹${finalTotal}`}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Your order will be confirmed within 5-10 minutes after verification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}