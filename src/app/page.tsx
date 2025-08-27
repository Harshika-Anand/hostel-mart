// File: src/app/page.tsx (REPLACE existing)
'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function Home() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🍕 Hostel Mart</h1>
          <p className="text-gray-600 mb-8">Late night snack delivery for your hostel</p>
          <div className="space-x-4">
            <Link 
              href="/auth/signin"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Sign In
            </Link>
            <Link 
              href="/auth/signup"
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-12 px-6">
        <div className="text-center space-y-8">
          {/* Welcome Section */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome back, {session.user.name}! 👋
            </h1>
            <p className="text-gray-600 text-lg mb-6">
              {session.user.role === 'ADMIN' 
                ? 'Manage your hostel mart efficiently' 
                : 'What would you like to order today?'
              }
            </p>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {session.user.role === 'CUSTOMER' ? (
                <>
                  <Link
                    href="/shop"
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium text-lg"
                  >
                    🛒 Start Shopping
                  </Link>
                  <Link
                    href="/orders"
                    className="bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition font-medium text-lg"
                  >
                    📦 My Orders
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/admin"
                    className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition font-medium text-lg"
                  >
                    🏪 Manage Products
                  </Link>
                  <Link
                    href="/admin/orders"
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium text-lg"
                  >
                    📦 Manage Orders
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Delivery</h3>
              <p className="text-gray-600 text-sm">
                Order now, get it delivered to your room or pick it up
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl mb-3">💳</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy Payment</h3>
              <p className="text-gray-600 text-sm">
                Pay via UPI or cash on delivery - your choice
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl mb-3">🌙</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Late Night Available</h3>
              <p className="text-gray-600 text-sm">
                Satisfy those midnight cravings anytime
              </p>
            </div>
          </div>

          {/* Stats Section for Admin */}
          {session.user.role === 'ADMIN' && (
            <AdminStats />
          )}
        </div>
      </main>
    </div>
  )
}

// Admin Stats Component
function AdminStats() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">Loading stats...</div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Today's Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.todayOrders || 0}</div>
          <div className="text-sm text-gray-600">Orders Today</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">₹{stats.todayRevenue || 0}</div>
          <div className="text-sm text-gray-600">Revenue Today</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders || 0}</div>
          <div className="text-sm text-gray-600">Pending Orders</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.totalProducts || 0}</div>
          <div className="text-sm text-gray-600">Products</div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'