// File: src/components/Navigation.tsx
'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'

export default function Navigation() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { getCartCount, getCartTotal } = useCart()

  if (status === 'loading') {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center h-16 items-center">
            <div className="text-gray-400">Loading...</div>
          </div>
        </div>
      </nav>
    )
  }

  if (!session) {
    return null
  }

  const cartCount = getCartCount()
  const cartTotal = getCartTotal()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-blue-600 hover:text-blue-800 transition">
              🍕 Hostel Mart
            </Link>
            
            {session.user.role === 'CUSTOMER' && (
              <div className="hidden sm:flex space-x-6">
                <Link
                  href="/shop"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    isActive('/shop')
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Shop
                </Link>
                <Link
                  href="/orders"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    isActive('/orders')
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  My Orders
                </Link>
              </div>
            )}

            {session.user.role === 'ADMIN' && (
              <div className="hidden sm:flex space-x-6">
                <Link
                  href="/admin"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    isActive('/admin')
                      ? 'text-green-600 bg-green-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Products
                </Link>
                <Link
                  href="/admin/orders"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    isActive('/admin/orders')
                      ? 'text-green-600 bg-green-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Orders
                </Link>
              </div>
            )}
          </div>

          {/* Right side - Cart, User info, Actions */}
          <div className="flex items-center space-x-4">
            {/* Cart for customers */}
            {session.user.role === 'CUSTOMER' && (
              <div className="flex items-center space-x-3">
                {cartCount > 0 && (
                  <div className="hidden sm:block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    Cart: {cartCount} items • ₹{cartTotal}
                  </div>
                )}
                {cartCount > 0 && (
                  <button
                    onClick={() => router.push('/checkout')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium text-sm"
                  >
                    Checkout
                  </button>
                )}
              </div>
            )}

            {/* User info */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">
                  {session.user.name}
                </p>
                <p className="text-xs text-gray-500">
                  {session.user.role === 'ADMIN' ? 'Administrator' : 'Customer'}
                </p>
              </div>

              {/* Mobile menu button */}
              <div className="sm:hidden">
                <button
                  type="button"
                  className="bg-white inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  onClick={() => {
                    // You can implement a mobile menu here
                  }}
                >
                  <span className="sr-only">Open main menu</span>
                  {/* Hamburger icon */}
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {/* Sign out button */}
              <button
                onClick={() => signOut()}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="sm:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {session.user.role === 'CUSTOMER' && (
              <>
                <Link
                  href="/shop"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive('/shop')
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Shop
                </Link>
                <Link
                  href="/orders"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive('/orders')
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  My Orders
                </Link>
                {cartCount > 0 && (
                  <div className="px-3 py-2">
                    <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-medium text-center">
                      Cart: {cartCount} items • ₹{cartTotal}
                    </div>
                  </div>
                )}
              </>
            )}
            
            {session.user.role === 'ADMIN' && (
              <>
                <Link
                  href="/admin"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive('/admin')
                      ? 'text-green-600 bg-green-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Products
                </Link>
                <Link
                  href="/admin/orders"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive('/admin/orders')
                      ? 'text-green-600 bg-green-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Orders
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}