// File: src/app/admin/orders/page.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import bgimg from '../../bgimg.jpg'
import OrderChat from '@/components/OrderChat'

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
  confirmedAt?: string
  readyAt?: string
  completedAt?: string
  adminNotes?: string
  customerName: string
  customerEmail: string
  user: {
    name: string
    email: string
    phone?: string
    roomNumber?: string
  }
  orderItems: OrderItem[]
  paymentPin?: string
}

export default function AdminOrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchOrders()
  }, [session, status, router])

  const fetchOrders = async () => {
    try {
      const queryParams = new URLSearchParams()
      if (statusFilter !== 'all') queryParams.append('status', statusFilter)
      if (paymentFilter !== 'all') queryParams.append('paymentMethod', paymentFilter)
      
      const response = await fetch(`/api/admin/orders?${queryParams.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch orders')
      
      const ordersData = await response.json()
      setOrders(ordersData)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  // Refetch when filters change
  useEffect(() => {
    if (session?.user.role === 'ADMIN') {
      fetchOrders()
    }
  }, [statusFilter, paymentFilter])

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdating(orderId)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      
      if (response.ok) {
        fetchOrders()
        if (selectedOrder?.id === orderId) {
          const updatedOrder = await response.json()
          setSelectedOrder(updatedOrder)
        }
      }
    } catch (error) {
      console.error('Error updating order status:', error)
    } finally {
      setUpdating(null)
    }
  }

  const updatePaymentStatus = async (orderId: string, paymentStatus: string) => {
    setUpdating(orderId)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus })
      })
      
      if (response.ok) {
        fetchOrders()
        if (selectedOrder?.id === orderId) {
          const updatedOrder = await response.json()
          setSelectedOrder(updatedOrder)
        }
      }
    } catch (error) {
      console.error('Error updating payment status:', error)
    } finally {
      setUpdating(null)
    }
  }

  const addAdminNote = async (orderId: string, note: string) => {
    setUpdating(orderId)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: note })
      })
      
      if (response.ok) {
        fetchOrders()
        if (selectedOrder?.id === orderId) {
          const updatedOrder = await response.json()
          setSelectedOrder(updatedOrder)
        }
      }
    } catch (error) {
      console.error('Error adding admin note:', error)
    } finally {
      setUpdating(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'ready':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPaymentStatusColor = (status: string, method: string) => {
    if (method === 'CASH') {
      return status === 'COMPLETED' 
        ? 'text-green-600 bg-green-50'
        : 'text-orange-600 bg-orange-50'
    }
    // UPI
    return status === 'COMPLETED'
      ? 'text-green-600 bg-green-50'
      : 'text-yellow-600 bg-yellow-50'
  }

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Get available next actions based on current state
  const getAvailableActions = (order: Order) => {
    const actions: { type: 'order' | 'payment', status: string, label: string, color: string }[] = []

    // Payment actions
    if (order.paymentStatus === 'PENDING' && order.status !== 'CANCELLED') {
      if (order.paymentMethod === 'UPI') {
        actions.push({
          type: 'payment',
          status: 'COMPLETED',
          label: 'Verify UPI Payment',
          color: 'bg-green-600 hover:bg-green-700'
        })
      } else if (order.paymentMethod === 'CASH') {
        actions.push({
          type: 'payment',
          status: 'COMPLETED',
          label: 'Mark Cash Received',
          color: 'bg-green-600 hover:bg-green-700'
        })
      }
    }

    // Order status actions
    if (order.status === 'PENDING' && order.paymentStatus === 'COMPLETED') {
      actions.push({
        type: 'order',
        status: 'CONFIRMED',
        label: 'Confirm Order',
        color: 'bg-blue-600 hover:bg-blue-700'
      })
    }

    if (order.status === 'CONFIRMED') {
      actions.push({
        type: 'order',
        status: 'READY',
        label: 'Pack Order (Ready)',
        color: 'bg-purple-600 hover:bg-purple-700'
      })
    }

    if (order.status === 'READY') {
      actions.push({
        type: 'order',
        status: 'COMPLETED',
        label: order.deliveryMethod === 'PICKUP' ? 'Mark as Picked Up' : 'Mark as Delivered',
        color: 'bg-green-600 hover:bg-green-700'
      })
    }

    // Cancel action (if not already completed/cancelled)
    if (!['COMPLETED', 'CANCELLED'].includes(order.status)) {
      actions.push({
        type: 'order',
        status: 'CANCELLED',
        label: 'Cancel Order',
        color: 'bg-red-600 hover:bg-red-700'
      })
    }

    return actions
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen text-gray-400 text-lg">Loading...</div>
  }

  return (
    <div className="min-h-screen " 
    style={{
      backgroundImage: `url(${bgimg.src})`,
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed'
    }} >
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin')}
                className="text-blue-600 hover:text-blue-800 mr-4 font-medium"
              >
                ← Back to Products
              </button>
              <h1 className="text-xl font-semibold text-gray-400">📦 Order Management</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-400"
                >
                  <option value="all">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="READY">Ready</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-400"
                >
                  <option value="all">All Methods</option>
                  <option value="UPI">UPI Payment</option>
                  <option value="CASH">Cash Payment</option>
                </select>
              </div>

              <div className="flex items-end">
                <div className="text-sm text-gray-600">
                  <strong>{orders.length}</strong> orders found
                </div>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orders Column */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Orders</h2>
              
              {orders.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="text-gray-400 text-4xl mb-4">📦</div>
                  <p className="text-gray-500">No orders found with current filters</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-screen overflow-y-auto">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`bg-white rounded-lg shadow border-2 transition cursor-pointer ${
                        selectedOrder?.id === order.id
                          ? 'border-blue-500'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              #{order.orderNumber || order.id.slice(-8)}
                            </h3>
                            <p className="text-sm text-gray-600">{order.customerName || order.user.name}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(order.createdAt).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">₹{order.totalAmount}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                            Order: {formatStatus(order.status)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus, order.paymentMethod)}`}>
                            Payment: {formatStatus(order.paymentStatus)}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
                            {order.paymentMethod}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
                            {formatStatus(order.deliveryMethod)}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600">
                          <p>{order.orderItems.length} item(s)</p>
                          {order.roomNumber && (
                            <p>Room: {order.roomNumber}</p>
                          )}
                          {order.paymentPin && order.paymentMethod === 'UPI' && (
                            <p className="font-mono text-xs">UPI PIN: ****{order.paymentPin}</p>
                          )}
                        </div>

                        {/* Quick actions for urgent items */}
                        {(order.paymentStatus === 'PENDING' || order.status === 'READY') && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex gap-2">
                              {order.paymentStatus === 'PENDING' && (
                                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                                  {order.paymentMethod === 'UPI' ? '⚠️ Verify Payment' : '💰 Awaiting Cash'}
                                </span>
                              )}
                              {order.status === 'READY' && (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                  🚀 {order.deliveryMethod === 'PICKUP' ? 'Ready for Pickup!' : 'Ready for Delivery!'}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order Details Column */}
            <div className="sticky top-4">
              {selectedOrder ? (
                <OrderDetails
                  order={selectedOrder}
                  onUpdateStatus={updateOrderStatus}
                  onUpdatePayment={updatePaymentStatus}
                  onAddNote={addAdminNote}
                  updating={updating}
                  getStatusColor={getStatusColor}
                  getPaymentStatusColor={getPaymentStatusColor}
                  formatStatus={formatStatus}
                  getAvailableActions={getAvailableActions}
                />
              ) : (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="text-gray-400 text-4xl mb-4">👈</div>
                  <p className="text-gray-500">Select an order to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Order Details Component
interface OrderDetailsProps {
  order: Order
  onUpdateStatus: (orderId: string, status: string) => void
  onUpdatePayment: (orderId: string, paymentStatus: string) => void
  onAddNote: (orderId: string, note: string) => void
  updating: string | null
  getStatusColor: (status: string) => string
  getPaymentStatusColor: (status: string, method: string) => string
  formatStatus: (status: string) => string
  getAvailableActions: (order: Order) => { type: 'order' | 'payment', status: string, label: string, color: string }[]
}

function OrderDetails({ 
  order, 
  onUpdateStatus, 
  onUpdatePayment, 
  onAddNote, 
  updating,
  getStatusColor,
  getPaymentStatusColor,
  formatStatus,
  getAvailableActions
}: OrderDetailsProps) {
  const [noteText, setNoteText] = useState(order.adminNotes || '')
  const availableActions = getAvailableActions(order)

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Order Header */}
      <div className="p-6 border-b">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Order #{order.orderNumber || order.id.slice(-8)}
        </h3>
        <div className="space-y-2 text-gray-400">
          <p><strong>Customer:</strong> {order.customerName || order.user.name}</p>
          <p><strong>Email:</strong> {order.customerEmail || order.user.email}</p>
          {order.user.phone && <p><strong>Phone:</strong> {order.user.phone}</p>}
          {order.roomNumber && <p><strong>Room:</strong> {order.roomNumber}</p>}
          <p><strong>Ordered:</strong> {new Date(order.createdAt).toLocaleString('en-IN')}</p>
          {order.confirmedAt && (
            <p><strong>Confirmed:</strong> {new Date(order.confirmedAt).toLocaleString('en-IN')}</p>
          )}
          {order.readyAt && (
            <p><strong>Ready:</strong> {new Date(order.readyAt).toLocaleString('en-IN')}</p>
          )}
          {order.completedAt && (
            <p><strong>Completed:</strong> {new Date(order.completedAt).toLocaleString('en-IN')}</p>
          )}
        </div>
      </div>

      {/* Current Status */}
      <div className="p-6 border-b text-gray-500">
        <h4 className="font-semibold text-gray-900 mb-4">Current Status</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Order Status:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
              {formatStatus(order.status)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Payment Status:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(order.paymentStatus, order.paymentMethod)}`}>
              {formatStatus(order.paymentStatus)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Payment Method:</span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-600">
              {order.paymentMethod}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Fulfillment:</span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-600">
              {formatStatus(order.deliveryMethod)}
            </span>
          </div>
        </div>

        {/* UPI Payment Info */}
        {order.paymentMethod === 'UPI' && order.paymentPin && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>UPI Reference PIN:</strong> <span className="font-mono">{order.paymentPin}</span>
            </p>
            <p className="text-xs text-blue-600 mt-1">Customer provided this PIN as payment reference</p>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="p-6 border-b">
        <h4 className="font-semibold text-gray-900 mb-4">Items to Pack</h4>
        <div className="space-y-3 text-gray-400">
          {order.orderItems.map((item, index) => (
            <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded">
              <div className="flex-1">
                <p className="font-medium">{item.productName || item.product.name}</p>
                <p className="text-sm text-gray-500">
                  {item.product.category.name} • ₹{item.price} each
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-lg">×{item.quantity}</p>
                <p className="text-sm text-gray-600">₹{item.subtotal}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="border-t mt-4 pt-4 space-y-1 text-gray-500">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹{order.subtotal}</span>
          </div>
          {order.deliveryFee > 0 && (
            <div className="flex justify-between">
              <span>Delivery Fee:</span>
              <span>₹{order.deliveryFee}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>₹{order.totalAmount}</span>
          </div>
        </div>
      </div>

      {/* Available Actions */}
      {availableActions.length > 0 && (
        <div className="p-6 border-b">
          <h4 className="font-semibold text-gray-900 mb-4">Actions</h4>
          <div className="grid grid-cols-1 gap-3">
            {availableActions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  if (action.type === 'payment') {
                    onUpdatePayment(order.id, action.status)
                  } else {
                    onUpdateStatus(order.id, action.status)
                  }
                }}
                disabled={updating === order.id}
                className={`w-full px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 transition ${action.color}`}
              >
                {updating === order.id ? 'Updating...' : action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Special Instructions for Cash Orders */}
      {order.paymentMethod === 'CASH' && order.paymentStatus === 'PENDING' && (
        <div className="p-6 border-b">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">💰</span>
              <div>
                <h5 className="font-semibold text-orange-900">Cash Payment Required</h5>
                <p className="text-sm text-orange-800">
                  Collect <strong>₹{order.totalAmount}</strong> in cash {order.deliveryMethod === 'PICKUP' ? 'when customer picks up' : 'upon delivery'}.
                  Mark payment as completed once cash is received.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Instructions */}
      {order.deliveryMethod === 'DELIVERY' && order.roomNumber && (
        <div className="p-6 border-b">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🏠</span>
              <div>
                <h5 className="font-semibold text-purple-900">Delivery Address</h5>
                <p className="text-sm text-purple-800">
                  <strong>Room {order.roomNumber}</strong>
                  {order.user.phone && (
                    <span className="block">Contact: {order.user.phone}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

<div className="p-6 border-t">
  <h4 className="font-semibold text-gray-900 mb-4">💬 Chat with Customer</h4>
  <OrderChat orderId={order.id} customerName={order.customerName || order.user.name} />
</div>

      {/* Admin Notes */}
      <div className="p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
        <div className="space-y-3">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
            placeholder="Add internal notes or customer messages..."
          />
          <button
            onClick={() => onAddNote(order.id, noteText)}
            disabled={updating === order.id}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  )
}