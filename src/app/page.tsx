'use client'

import { useSession, signOut } from 'next-auth/react'
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
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">🍕 Hostel Mart</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {session.user.name}! 
                {session.user.role === 'ADMIN' && (
                  <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                    Admin
                  </span>
                )}
              </span>
              {session.user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                >
                  Admin Panel
                </Link>
              )}
              <button
                onClick={() => signOut()}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Section */}
      <main className="max-w-4xl mx-auto py-12 px-6">
        <div className="flex flex-col items-center space-y-6">
          {/* Buttons Row */}
          <div className="flex space-x-4">
            {session.user.role === 'CUSTOMER' && (
              <Link
                href="/shop"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                🛒 Start Shopping
              </Link>
            )}
            {session.user.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium"
              >
                📊 Admin Panel
              </Link>
            )}
          </div>

          {/* Tagline */}
          <div className="text-center max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Late Night Cravings? We've Got You! 🌙
            </h2>
            <p className="text-gray-600">
              Order snacks, noodles, and treats from your room. Pay via UPI or cash on pickup. 
              No more WhatsApp group chaos — just simple, organized ordering.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
