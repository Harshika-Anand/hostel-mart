// File: src/components/Navigation.tsx
'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'
import { useState } from 'react'

export default function Navigation() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { getCartCount, getCartTotal } = useCart()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and Desktop Navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-blue-600 hover:text-blue-800 transition">
              🍕 Hostel Mart
            </Link>
            
            {/* Desktop Navigation */}
            {session.user.role === 'CUSTOMER' && (
  <div className="hidden md:flex space-x-6">
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
    <Link
      href="/my-listings"
      className={`px-3 py-2 rounded-md text-sm font-medium transition ${
        isActive('/my-listings')
          ? 'text-green-600 bg-green-50'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      My Listings
    </Link>
    {/* 👇 ADD THIS NEW LINK */}
    <Link
      href="/sell-rent"
      className={`px-3 py-2 rounded-md text-sm font-medium transition ${
        isActive('/sell-rent')
          ? 'text-green-600 bg-green-50'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      🏷️ Rent Your Items
    </Link>
  </div>
)}

            {session.user.role === 'ADMIN' && (
              <div className="hidden md:flex space-x-6">
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
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Desktop Cart for customers */}
            {session.user.role === 'CUSTOMER' && (
              <div className="hidden lg:flex items-center space-x-3">
                {cartCount > 0 && (
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {cartCount} items • ₹{cartTotal}
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

            {/* Mobile Cart Badge */}
            {session.user.role === 'CUSTOMER' && cartCount > 0 && (
              <div className="lg:hidden">
                <button
                  onClick={() => router.push('/checkout')}
                  className="relative bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l1.5 6m7.5-6v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
                  </svg>
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                </button>
              </div>
            )}

            {/* Desktop User info */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900">
                  {session.user.name}
                </p>
                <p className="text-xs text-gray-500">
                  {session.user.role === 'ADMIN' ? 'Admin' : 'Customer'}
                </p>
              </div>

              {/* Desktop Sign out button */}
              <button
                onClick={() => signOut()}
                className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-700 transition text-xs sm:text-sm font-medium"
              >
                Sign Out
              </button>
            </div>

            {/* Mobile hamburger menu button */}
            <div className="sm:hidden">
              <button
                type="button"
                className="bg-white inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                onClick={toggleMobileMenu}
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  // X icon when menu is open
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  // Hamburger icon when menu is closed
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile navigation menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* User info at top */}
              <div className="px-3 py-2 border-b border-gray-100 mb-2">
                <p className="text-sm font-medium text-gray-900">
                  {session.user.name}
                </p>
                <p className="text-xs text-gray-500">
                  {session.user.role === 'ADMIN' ? 'Administrator' : 'Customer'}
                </p>
              </div>

              {/* Customer menu items */}
              {session.user.role === 'CUSTOMER' && (
                <>
                  <Link
                    href="/shop"
                    onClick={closeMobileMenu}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      isActive('/shop')
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    🛍️ Shop
                  </Link>
                  <Link
                    href="/orders"
                    onClick={closeMobileMenu}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      isActive('/orders')
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    📋 My Orders
                  </Link>
                  <Link
      href="/my-listings"
      onClick={closeMobileMenu}
      className={`block px-3 py-2 rounded-md text-base font-medium ${
        isActive('/my-listings')
          ? 'text-green-600 bg-green-50'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      📋 My Listings
    </Link>
                  <Link
      href="/sell-rent"
      onClick={closeMobileMenu}
      className={`block px-3 py-2 rounded-md text-base font-medium ${
        isActive('/sell-rent')
          ? 'text-green-600 bg-green-50'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      🏷️ Rent Your Items
    </Link>
                  
                  {/* Mobile cart info */}
                  {cartCount > 0 && (
                    <div className="px-3 py-2">
                      <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-medium text-center mb-2">
                        Cart: {cartCount} items • ₹{cartTotal}
                      </div>
                      <button
                        onClick={() => {
                          router.push('/checkout')
                          closeMobileMenu()
                        }}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium text-sm"
                      >
                        Proceed to Checkout
                      </button>
                    </div>
                  )}
                </>
              )}
              
              {/* Admin menu items */}
              {session.user.role === 'ADMIN' && (
                <>
                  <Link
                    href="/admin"
                    onClick={closeMobileMenu}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      isActive('/admin')
                        ? 'text-green-600 bg-green-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    📦 Products
                  </Link>
                  <Link
                    href="/admin/orders"
                    onClick={closeMobileMenu}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      isActive('/admin/orders')
                        ? 'text-green-600 bg-green-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    📋 Orders
                  </Link>
                </>
              )}

              {/* Mobile Sign out button */}
              <div className="px-3 py-2 border-t border-gray-100 mt-2">
                <button
                  onClick={() => {
                    signOut()
                    closeMobileMenu()
                  }}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm font-medium"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}