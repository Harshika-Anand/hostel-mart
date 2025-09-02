// File: src/app/shop/page.tsx (Mobile-Optimized Version)
'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'

interface Product {
  id: string
  name: string
  price: number
  stockQuantity: number
  isAvailable: boolean
  imageUrl?: string
  category: {
    id: string
    name: string
  }
}

interface Category {
  id: string
  name: string
}

interface ShopSettings {
  isOpen: boolean
  message?: string
}

export default function Shop() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [shopSettings, setShopSettings] = useState<ShopSettings>({ isOpen: false })
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Use the CartContext
  const {
    cart,
    addToCart: addToCartContext,
    removeFromCart,
    updateQuantity,
    getCartTotal,
    getCartCount,
    isLoading: cartLoading
  } = useCart()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchData()
  }, [session, status, router])

  const fetchData = async () => {
    try {
      setError('')
      const [productsRes, categoriesRes, shopRes] = await Promise.all([
        fetch('/api/shop/products'),
        fetch('/api/shop/categories'),
        fetch('/api/admin/shop-settings')
      ])
      
      if (!productsRes.ok || !categoriesRes.ok || !shopRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const productsData = await productsRes.json()
      const categoriesData = await categoriesRes.json()
      const shopData = await shopRes.json()
      
      setProducts(productsData)
      setCategories(categoriesData)
      setShopSettings(shopData)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load shop data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = selectedCategory === 'all' 
    ? products.filter(p => p.isAvailable && p.stockQuantity > 0)
    : products.filter(p => p.isAvailable && p.stockQuantity > 0 && p.category.id === selectedCategory)

  const addToCart = (product: Product) => {
    addToCartContext({
      productId: product.id,
      name: product.name,
      price: product.price,
      stockQuantity: product.stockQuantity,
      quantity: 1
    })
  }

  const updateCartQuantity = (productId: string, quantity: number) => {
    updateQuantity(productId, quantity)
  }

  const cartTotal = getCartTotal()

  if (status === 'loading' || loading || cartLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Show shop closed message if not open (except for admins)
  if (!shopSettings.isOpen && session.user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
            <div className="text-4xl sm:text-6xl mb-4">🏪</div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Shop is Closed</h1>
            <p className="text-gray-600 mb-6 text-sm sm:text-base">
              {shopSettings.message || 'Sorry, we are currently closed. Please check back later!'}
            </p>
            <div className="text-2xl sm:text-4xl mb-4">😴</div>
            <p className="text-xs sm:text-sm text-gray-500">
              We will be back soon with fresh snacks and treats!
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition w-full sm:w-auto"
            >
              Go Back Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Shop</h1>
              <p className="text-gray-600 text-sm sm:text-base">Browse our collection of snacks and treats</p>
            </div>
            
            {/* Show shop status for admin */}
            {session.user.role === 'ADMIN' && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm text-gray-600">Shop Status:</span>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                    shopSettings.isOpen
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {shopSettings.isOpen ? '🟢 OPEN' : '🔴 CLOSED'}
                  </span>
                  {!shopSettings.isOpen && (
                    <span className="text-xs text-gray-500 hidden sm:inline">(Admin can still browse)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Filter Toggle and Cart Info */}
        <div className="lg:hidden mb-4 space-y-3">
          {/* Mobile Filter Button */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="w-full bg-white border border-gray-300 rounded-lg p-3 flex items-center justify-between"
          >
            <span className="font-medium text-gray-900">
              {selectedCategory === 'all' ? 'All Categories' : categories.find(c => c.id === selectedCategory)?.name}
            </span>
            <svg className={`w-5 h-5 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Mobile Categories Dropdown */}
          {showMobileFilters && (
            <div className="bg-white rounded-lg shadow border p-3">
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSelectedCategory('all')
                    setShowMobileFilters(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded transition ${
                    selectedCategory === 'all'
                      ? 'bg-blue-100 text-blue-900 font-medium'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  All Items ({products.filter(p => p.isAvailable && p.stockQuantity > 0).length})
                </button>
                {categories.map(category => {
                  const categoryProductCount = products.filter(p => 
                    p.isAvailable && p.stockQuantity > 0 && p.category.id === category.id
                  ).length
                  return (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.id)
                        setShowMobileFilters(false)
                      }}
                      className={`w-full text-left px-3 py-2 rounded transition ${
                        selectedCategory === category.id
                          ? 'bg-blue-100 text-blue-900 font-medium'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {category.name} ({categoryProductCount})
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Mobile Cart Summary */}
          {cart.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-green-800">
                    Cart: {cart.length} item{cart.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-lg font-bold text-green-900 ml-2">₹{cartTotal}</span>
                </div>
                <button
                  onClick={() => router.push('/checkout')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium text-sm"
                >
                  Checkout
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            {/* Categories */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-3 py-2 rounded transition ${
                    selectedCategory === 'all'
                      ? 'bg-blue-100 text-blue-900 font-medium'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  All Items ({products.filter(p => p.isAvailable && p.stockQuantity > 0).length})
                </button>
                {categories.map(category => {
                  const categoryProductCount = products.filter(p => 
                    p.isAvailable && p.stockQuantity > 0 && p.category.id === category.id
                  ).length
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-3 py-2 rounded transition ${
                        selectedCategory === category.id
                          ? 'bg-blue-100 text-blue-900 font-medium'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {category.name} ({categoryProductCount})
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Desktop Cart Summary */}
            {cart.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Cart</h3>
                <div className="space-y-3">
                  {cart.slice(0, 3).map(item => (
                    <div key={item.productId} className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-sm text-gray-500">₹{item.price} × {item.quantity}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-red-600 hover:text-red-800 text-sm ml-2 flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {cart.length > 3 && (
                    <p className="text-sm text-gray-500">...and {cart.length - 3} more items</p>
                  )}
                  <div className="border-t pt-3 mt-4">
                    <div className="flex justify-between items-center font-semibold text-gray-900">
                      <span>Total:</span>
                      <span>₹{cartTotal}</span>
                    </div>
                    <button
                      onClick={() => router.push('/checkout')}
                      className="w-full mt-3 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition font-medium"
                    >
                      Checkout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Products Grid */}
          <div className="col-span-1 lg:col-span-3">
            <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <p className="text-gray-600 text-sm">
                {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
              </p>
              {selectedCategory !== 'all' && (
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium text-left sm:text-right"
                >
                  Clear Filter
                </button>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-4xl sm:text-6xl mb-4">🛒</div>
                <p className="text-gray-500 text-base sm:text-lg">No products available in this category</p>
                {selectedCategory !== 'all' && (
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View All Products
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {filteredProducts.map(product => {
                  const cartItem = cart.find(item => item.productId === product.id)
                  const canAddMore = !cartItem || cartItem.quantity < product.stockQuantity

                  return (
                    <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-md transition">
                      <div className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex-1">{product.name}</h3>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full flex-shrink-0 self-start">
                            {product.category.name}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-xl sm:text-2xl font-bold text-green-600">₹{product.price}</span>
                          <span className={`text-sm ${product.stockQuantity < 5 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {product.stockQuantity} left
                          </span>
                        </div>

                        {cartItem ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => updateCartQuantity(product.id, cartItem.quantity - 1)}
                                className="w-10 h-10 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center justify-center transition font-medium"
                              >
                                -
                              </button>
                              <span className="font-semibold text-lg w-8 text-center text-gray-700">
                                {cartItem.quantity}
                              </span>
                              <button
                                onClick={() => updateCartQuantity(product.id, cartItem.quantity + 1)}
                                disabled={!canAddMore}
                                className="w-10 h-10 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => removeFromCart(product.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
                          >
                            Add to Cart
                          </button>
                        )}

                        {product.stockQuantity < 5 && (
                          <p className="text-xs text-red-600 mt-2 font-medium">
                            ⚠️ Low stock - order soon!
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}