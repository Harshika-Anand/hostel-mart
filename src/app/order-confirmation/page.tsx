'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Order {
  id: string
  totalAmount: number
  paymentMethod: string
  status: string
  createdAt: string
  orderItems: Array<{
    quantity: number
    priceAtTime: number
    product: {
      name: string
      category: {
        name: string
      }
    }
  }>
  payment?: {
    status: string
  }
}

export default function OrderConfirmationPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams?.get('orderId')
  
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (!orderId) {
      router.push('/shop')
      return
    }

    fetchOrder()
  }, [status, orderId, router])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (!response.ok) {
        throw new Error('Order not found')
      }
      const orderData = await response.json()
      setOrder(orderData)
    } catch (error) {
      console.error('Error fetching order:', error)
      setError('Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session || error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Please sign in to view your order'}</p>
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

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Order not found</p>
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'text-green-600 bg-green-50'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      case 'completed':
        return 'text-blue-600 bg-blue-50'
      case 'cancelled':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusMessage = () => {
    if (order.paymentMethod === 'UPI') {
      switch (order.status.toLowerCase()) {
        case 'pending':
          return {
            title: 'Payment Under Review',
            message: 'Your payment screenshot is being verified. You\'ll be notified once confirmed.',
            icon: '⏳'
          }
        case 'confirmed':
          return {
            title: 'Order Confirmed!',
            message: 'Your payment has been verified. Your order is being prepared.',
            icon: '✅'
          }
        case 'completed':
          return {
            title: 'Order Ready for Pickup',
            message: 'Your order is ready! Come collect it from the specified location.',
            icon: '📦'
          }
        default:
          return {
            title: 'Order Placed',
            message: 'Your order has been received.',
            icon: '📋'
          }
      }
    } else {
      // COD
      switch (order.status.toLowerCase()) {
        case 'pending':
          return {
            title: 'Order Under Review',
            message: 'Your order is being processed. Stock is being reserved for you.',
            icon: '⏳'
          }
        case 'confirmed':
          return {
            title: 'Order Confirmed!',
            message: 'Your order is ready for pickup. Pay cash when you collect.',
            icon: '✅'
          }
        case 'completed':
          return {
            title: 'Order Completed',
            message: 'Thank you for your purchase!',
            icon: '🎉'
          }
        default:
          return {
            title: 'Order Placed',
            message: 'Your cash-on-delivery order has been received.',
            icon: '📋'
          }
      }
    }
  }

  const statusInfo = getStatusMessage()

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
            <h1 className="text-xl font-semibold text-gray-900">Order Confirmation</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow p-8 text-center mb-8">
          <div className="text-6xl mb-4">{statusInfo.icon}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{statusInfo.title}</h2>
          <p className="text-gray-600 mb-4">{statusInfo.message}</p>
          <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
            {order.status}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Order Details</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-mono text-sm">{order.id}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Order Date:</span>
                <span>{new Date(order.createdAt).toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium">
                  {order.paymentMethod === 'UPI' ? 'UPI Payment' : 'Cash on Delivery'}
                </span>
              </div>
              
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span>₹{order.totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Items Ordered */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Items Ordered</h3>
            
            <div className="space-y-4">
              {order.orderItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                  <div>
                    <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                    <p className="text-sm text-gray-500">{item.product.category.name}</p>
                    <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                  </div>
                  <span className="font-semibold">₹{item.priceAtTime * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">What's Next?</h3>
          <div className="text-blue-800 space-y-2">
            {order.paymentMethod === 'UPI' ? (
              order.status === 'PENDING' ? (
                <>
                  <p>• Your payment screenshot is being verified by the admin</p>
                  <p>• You'll receive an update once your payment is confirmed</p>
                  <p>• This usually takes a few minutes</p>
                </>
              ) : order.status === 'CONFIRMED' ? (
                <>
                  <p>• Your order is being prepared</p>
                  <p>• You'll be notified when it's ready for pickup</p>
                  <p>• Come to collect your order at the specified location</p>
                </>
              ) : (
                <>
                  <p>• Your order is ready for pickup!</p>
                  <p>• Come collect it from the admin's room</p>
                </>
              )
            ) : (
              order.status === 'PENDING' ? (
                <>
                  <p>• Your order is being reviewed by the admin</p>
                  <p>• Stock is being reserved for you</p>
                  <p>• You'll be notified when it's ready for pickup</p>
                </>
              ) : (
                <>
                  <p>• Your order is ready for pickup!</p>
                  <p>• Come to collect and pay ₹{order.totalAmount} in cash</p>
                  <p>• Please bring exact change if possible</p>
                </>
              )
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-8">
          <button
            onClick={() => router.push('/orders')}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
          >
            View All Orders
          </button>
          <button
            onClick={() => router.push('/shop')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  )
}