// File: src/app/order-confirmation/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

interface OrderItem {
  id: string
  quantity: number
  productName: string
  price: number
  subtotal: number
  product: {
    name: string
    category: {
      name: string
    }
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentMethod: string
  paymentStatus: string
  deliveryMethod: string
  roomNumber?: string
  subtotal: number
  deliveryFee: number
  totalAmount: number
  createdAt: string
  completedAt?: string
  adminNotes?: string
  customerName: string
  customerEmail: string
  paymentPin?: string
  orderItems: OrderItem[]
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
      setError('')
      const response = await fetch(`/api/orders/${orderId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Order not found')
        }
        if (response.status === 403) {
          throw new Error('Access denied')
        }
        throw new Error('Failed to load order')
      }
      const orderData = await response.json()
      setOrder(orderData)
    } catch (error: any) {
      console.error('Error fetching order:', error)
      setError(error.message || 'Failed to load order details')
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
          <div className="space-x-4">
            <button
              onClick={() => router.push('/shop')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to Shop
            </button>
            <button
              onClick={() => router.push('/orders')}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              View Orders
            </button>
          </div>
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
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      case 'out_for_delivery':
        return 'text-blue-600 bg-blue-50'
      case 'cancelled':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusMessage = () => {
    if (order.status === 'CANCELLED') {
      return {
        title: 'Order Cancelled',
        message: 'This order has been cancelled. If you paid via UPI, your refund will be processed.',
        icon: '❌'
      }
    }

    if (order.paymentMethod === 'UPI') {
      switch (order.status.toLowerCase()) {
        case 'pending':
          return {
            title: 'Payment Under Review',
            message: 'Your UPI payment is being verified. You\'ll be notified once confirmed. This usually takes a few minutes.',
            icon: '⏳'
          }
        case 'confirmed':
          return {
            title: 'Order Confirmed!',
            message: 'Your payment has been verified. Your order is being prepared.',
            icon: '✅'
          }
        case 'out_for_delivery':
          return {
            title: 'Out for Delivery',
            message: `Your order is on the way to room ${order.roomNumber}. Please be available to receive it.`,
            icon: '🚚'
          }
        case 'completed':
          return {
            title: 'Order Completed',
            message: 'Your order has been delivered successfully. Thank you for your order!',
            icon: '🎉'
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
            message: 'Your cash-on-delivery order is being processed. Stock is being reserved for you.',
            icon: '⏳'
          }
        case 'confirmed':
          return {
            title: 'Order Confirmed!',
            message: 'Your order is confirmed and being prepared. You\'ll pay when you receive it.',
            icon: '✅'
          }
        case 'out_for_delivery':
          return {
            title: 'Out for Delivery',
            message: `Your order is on the way to room ${order.roomNumber}. Please have ₹${order.totalAmount} ready in cash.`,
            icon: '🚚'
          }
        case 'completed':
          return {
            title: 'Order Completed',
            message: 'Your order has been completed successfully. Thank you for your order!',
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
          <p className="text-gray-600 mb-4 max-w-2xl mx-auto">{statusInfo.message}</p>
          <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
            Status: {order.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Order Details</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Number:</span>
                <span className="font-medium">{order.orderNumber || `#${order.id.slice(-8)}`}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Order Date:</span>
                <span>{new Date(order.createdAt).toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium">
                  {order.paymentMethod === 'UPI' ? 'UPI Payment' : 'Cash on Delivery'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Method:</span>
                <span className="font-medium">
                  {order.deliveryMethod === 'DELIVERY' ? 'Room Delivery' : 'Self Pickup'}
                </span>
              </div>

              {order.roomNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Address:</span>
                  <span className="font-medium">Room {order.roomNumber}</span>
                </div>
              )}

              {order.paymentPin && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment PIN:</span>
                  <span className="font-mono text-sm">****{order.paymentPin}</span>
                </div>
              )}
              
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span>₹{order.totalAmount}</span>
                </div>
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
                    <h4 className="font-medium text-gray-900">
                      {item.productName || item.product.name}
                    </h4>
                    <p className="text-sm text-gray-500">{item.product.category.name}</p>
                    <p className="text-sm text-gray-500">₹{item.price} × {item.quantity}</p>
                  </div>
                  <span className="font-semibold">₹{item.subtotal}</span>
                </div>
              ))}
            </div>

            <div className="border-t mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span>₹{order.subtotal}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee:</span>
                  <span>₹{order.deliveryFee}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                <span>Total:</span>
                <span>₹{order.totalAmount}</span>
              </div>
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
                  <p>• Your UPI payment is being verified by our admin</p>
                  <p>• You'll receive an update once your payment is confirmed</p>
                  <p>• This process usually takes 5-10 minutes</p>
                </>
              ) : order.status === 'CONFIRMED' ? (
                <>
                  <p>• Your order is being prepared by our team</p>
                  <p>• You'll be notified when it's ready</p>
                  <p>• Estimated preparation time: 15-30 minutes</p>
                </>
              ) : order.status === 'OUT_FOR_DELIVERY' ? (
                order.deliveryMethod === 'DELIVERY' ? (
                  <>
                    <p>• Your order is out for delivery</p>
                    <p>• Please be available at room {order.roomNumber}</p>
                    <p>• Our delivery person will contact you</p>
                  </>
                ) : (
                  <>
                    <p>• Your order is ready for pickup!</p>
                    <p>• Come to the pickup location to collect your order</p>
                    <p>• Show this confirmation or your order number</p>
                  </>
                )
              ) : (
                <>
                  <p>• Your order process is complete</p>
                  <p>• Thank you for choosing Hostel Mart!</p>
                </>
              )
            ) : (
              order.status === 'PENDING' ? (
                <>
                  <p>• Your cash-on-delivery order is being processed</p>
                  <p>• Stock is being reserved for you</p>
                  <p>• You'll be notified when it's ready</p>
                </>
              ) : order.status === 'CONFIRMED' ? (
                order.deliveryMethod === 'DELIVERY' ? (
                  <>
                    <p>• Your order is being prepared for delivery to room {order.roomNumber}</p>
                    <p>• Please have ₹{order.totalAmount} ready in cash</p>
                    <p>• Estimated preparation time: 15-30 minutes</p>
                  </>
                ) : (
                  <>
                    <p>• Your order is being prepared for pickup</p>
                    <p>• Come to the pickup location with ₹{order.totalAmount} in cash</p>
                    <p>• Please bring exact change if possible</p>
                  </>
                )
              ) : order.status === 'OUT_FOR_DELIVERY' ? (
                <>
                  <p>• Your order is out for delivery to room {order.roomNumber}</p>
                  <p>• Please have ₹{order.totalAmount} ready in cash</p>
                  <p>• Our delivery person will arrive shortly</p>
                </>
              ) : (
                <>
                  <p>• Your order process is complete</p>
                  <p>• Thank you for choosing Hostel Mart!</p>
                </>
              )
            )}
          </div>
        </div>

        {/* Admin Notes */}
        {order.adminNotes && (
          <div className="bg-yellow-50 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">Admin Note</h3>
            <p className="text-yellow-800">{order.adminNotes}</p>
          </div>
        )}

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