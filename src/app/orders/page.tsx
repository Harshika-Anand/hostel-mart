// File: src/app/orders/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

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
  orderItems: OrderItem[]
}

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchOrders()
  }, [session, status, router])

  const fetchOrders = async () => {
    try {
      setError('')
      const response = await fetch('/api/orders')
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }
      const ordersData = await response.json()
      setOrders(ordersData)
    } catch (error) {
      console.error('Error fetching orders:', error)
      setError('Failed to load orders. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const cancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return
    }

    setCancelling(orderId)
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel order')
      }

      // Refresh orders list
      fetchOrders()
      alert('Order cancelled successfully')
    } catch (error: any) {
      console.error('Error cancelling order:', error)
      alert(error.message || 'Failed to cancel order')
    } finally {
      setCancelling(null)
    }
  }

  const canCancelOrder = (order: Order) => {
    const nonCancellableStatuses = ['COMPLETED', 'CANCELLED', 'OUT_FOR_DELIVERY']
    return !nonCancellableStatuses.includes(order.status)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'out_for_delivery':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified':
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getStatusMessage = (order: Order) => {
    if (order.status === 'CANCELLED') {
      return {
        title: 'Order Cancelled',
        message: 'This order has been cancelled.',
        icon: '❌'
      }
    }

    if (order.paymentMethod === 'UPI') {
      switch (order.status.toLowerCase()) {
        case 'pending':
          return {
            title: 'Payment Under Review',
            message: 'Your UPI payment is being verified. This usually takes a few minutes.',
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
            message: 'Your order is on the way to your room.',
            icon: '🚚'
          }
        case 'completed':
          return {
            title: 'Order Completed',
            message: 'Your order has been delivered. Thank you!',
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
            message: 'Your cash-on-delivery order is being processed.',
            icon: '⏳'
          }
        case 'confirmed':
          return {
            title: 'Order Confirmed!',
            message: 'Your order is confirmed and being prepared.',
            icon: '✅'
          }
        case 'out_for_delivery':
          return {
            title: 'Out for Delivery',
            message: `Your order is on the way. Pay ₹${order.totalAmount} in cash upon delivery.`,
            icon: '🚚'
          }
        case 'completed':
          return {
            title: 'Order Completed',
            message: 'Your order has been completed. Thank you!',
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

  if (status === 'loading' || loading) {
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
                onClick={() => router.push('/')}
                className="text-blue-600 hover:text-blue-800 mr-4 font-medium"
              >
                ← Back to Home
              </button>
              <h1 className="text-xl font-semibold text-gray-900">My Orders</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/shop')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Shop Now
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={fetchOrders}
              className="mt-2 text-red-600 underline hover:text-red-800"
            >
              Try again
            </button>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-600 mb-6">Start shopping to see your orders here!</p>
            <button
              onClick={() => router.push('/shop')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const statusInfo = getStatusMessage(order)
              return (
                <div key={order.id} className="bg-white rounded-lg shadow border">
                  {/* Order Header */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.orderNumber || order.id.slice(-8)}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                            {formatStatus(order.status)}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                            Payment: {formatStatus(order.paymentStatus)}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                            {order.paymentMethod}
                          </span>
                          {order.deliveryMethod && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
                              {formatStatus(order.deliveryMethod)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 lg:mt-0 lg:flex-col lg:items-end">
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">₹{order.totalAmount}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        {canCancelOrder(order) && (
                          <button
                            onClick={() => cancelOrder(order.id)}
                            disabled={cancelling === order.id}
                            className="ml-4 lg:ml-0 lg:mt-2 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                          >
                            {cancelling === order.id ? 'Cancelling...' : 'Cancel Order'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Message */}
                  <div className="px-6 py-4 bg-gray-50 border-b">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{statusInfo.icon}</span>
                      <div>
                        <h4 className="font-semibold text-gray-900">{statusInfo.title}</h4>
                        <p className="text-sm text-gray-600">{statusInfo.message}</p>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="px-6 py-4">
                    <div className="space-y-3">
                      {order.orderItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {item.productName || item.product.name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {item.product.category.name} • Qty: {item.quantity} • ₹{item.price} each
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-gray-900">₹{item.subtotal}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Summary */}
                    <div className="border-t border-gray-200 mt-4 pt-4">
                      <div className="space-y-1 text-sm text-gray-300">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Subtotal:</span>
                          <span>₹{order.subtotal}</span>
                        </div>
                        {order.deliveryFee > 0 && (
                          <div className="flex justify-between text-gray-300">
                            <span className="text-gray-600">Delivery Fee:</span>
                            <span>₹{order.deliveryFee}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold text-base text-gray-300">
                          <span>Total:</span>
                          <span>₹{order.totalAmount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Info */}
                    {order.roomNumber && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Delivery to:</strong> Room {order.roomNumber}
                        </p>
                      </div>
                    )}

                    {/* Admin Notes */}
                    {order.adminNotes && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> {order.adminNotes}
                        </p>
                      </div>
                    )}

                    {/* Completion Info */}
                    {order.completedAt && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-800">
                          <strong>Completed on:</strong> {new Date(order.completedAt).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 mt-4 pt-4 border-t">
                      <button
                        onClick={() => router.push(`/order-confirmation?orderId=${order.id}`)}
                        className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}