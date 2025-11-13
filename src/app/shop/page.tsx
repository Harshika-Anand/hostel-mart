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

interface RentalListing {
  id: string
  itemName: string
  description: string
  finalRent: number
  rentPerDay: number
  securityDeposit: number | null
  quantity: number
  status: string
  sellerName: string
  sellerRoom: string
  sellerPhone: string
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
  const [rentals, setRentals] = useState<RentalListing[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [shopSettings, setShopSettings] = useState<ShopSettings>({ isOpen: false })
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'all' | 'buy' | 'rent'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false)

  const {
    cart,
    addToCart: addToCartContext,
    removeFromCart,
    updateQuantity,
    clearCart,
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
      const [productsRes, rentalsRes, categoriesRes, shopRes] = await Promise.all([
        fetch('/api/shop/products'),
        fetch('/api/listings?status=LIVE'),
        fetch('/api/shop/categories'),
        fetch('/api/admin/shop-settings')
      ])
      
      if (!productsRes.ok || !categoriesRes.ok || !shopRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const productsData = await productsRes.json()
      const rentalsData = rentalsRes.ok ? await rentalsRes.json() : []
      const categoriesData = await categoriesRes.json()
      const shopData = await shopRes.json()
      
      setProducts(productsData)
      setRentals(rentalsData)
      setCategories(categoriesData)
      setShopSettings(shopData)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load shop data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Filter products based on category and view mode
  const filteredProducts = products.filter(p => {
    if (!p.isAvailable || p.stockQuantity <= 0) return false
    if (viewMode === 'rent') return false // Don't show products in rent mode
    if (selectedCategory === 'all') return true
    return p.category.id === selectedCategory
  })

  // Filter rentals based on category and view mode
  const filteredRentals = rentals.filter(r => {
    if (r.quantity <= 0) return false
    if (viewMode === 'buy') return false // Don't show rentals in buy mode
    if (selectedCategory === 'all') return true
    return r.category.id === selectedCategory
  })

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

  const handleClearCart = () => {
    clearCart()
    setShowClearCartConfirm(false)
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

  const totalItemsCount = filteredProducts.length + filteredRentals.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clear Cart Confirmation Modal */}
      {showClearCartConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🗑️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Clear Cart?</h3>
              <p className="text-gray-600 text-sm mb-6">
                Are you sure you want to remove all {cart.length} item{cart.length !== 1 ? 's' : ''} from your cart? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowClearCartConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearCart}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Shop</h1>
              <p className="text-gray-600 text-sm sm:text-base">Browse products and rentals</p>
            </div>
            
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

        {/* View Mode Toggle */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All ({products.filter(p => p.isAvailable && p.stockQuantity > 0).length + rentals.length})
          </button>
          <button
            onClick={() => setViewMode('buy')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'buy'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            🛒 Buy ({products.filter(p => p.isAvailable && p.stockQuantity > 0).length})
          </button>
          <button
            onClick={() => setViewMode('rent')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'rent'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            🏷️ Rent ({rentals.length})
          </button>
        </div>

        {/* Mobile Filter Toggle and Cart Info */}
        <div className="lg:hidden mb-4 space-y-3">
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
                  All Items ({totalItemsCount})
                </button>
                {categories.map(category => {
                  const categoryCount = 
                    (viewMode === 'rent' ? 0 : products.filter(p => p.isAvailable && p.stockQuantity > 0 && p.category.id === category.id).length) +
                    (viewMode === 'buy' ? 0 : rentals.filter(r => r.category.id === category.id).length)
                  
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
                      {category.name} ({categoryCount})
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {cart.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
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
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setShowClearCartConfirm(true)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  🗑️ Clear Cart
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
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
                  All Items ({totalItemsCount})
                </button>
                {categories.map(category => {
                  const categoryCount = 
                    (viewMode === 'rent' ? 0 : products.filter(p => p.isAvailable && p.stockQuantity > 0 && p.category.id === category.id).length) +
                    (viewMode === 'buy' ? 0 : rentals.filter(r => r.category.id === category.id).length)
                  
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
                      {category.name} ({categoryCount})
                    </button>
                  )
                })}
              </div>
            </div>

            {cart.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Your Cart</h3>
                  <button
                    onClick={() => setShowClearCartConfirm(true)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
                    title="Clear all items from cart"
                  >
                    🗑️ Clear
                  </button>
                </div>
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

          {/* Products/Rentals Grid */}
          <div className="col-span-1 lg:col-span-3">
            <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <p className="text-gray-600 text-sm">
                {totalItemsCount} item{totalItemsCount !== 1 ? 's' : ''} found
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

            {totalItemsCount === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-4xl sm:text-6xl mb-4">
                  {viewMode === 'rent' ? '🏷️' : '🛒'}
                </div>
                <p className="text-gray-500 text-base sm:text-lg">
                  {viewMode === 'rent' 
                    ? 'No rental items available in this category' 
                    : viewMode === 'buy'
                    ? 'No products available in this category'
                    : 'No items available in this category'
                  }
                </p>
                {selectedCategory !== 'all' && (
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View All Items
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {/* Display Products (Buy) */}
                {viewMode !== 'rent' && filteredProducts.map(product => {
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

                        {product.stockQuantity < 3 && (
                          <p className="text-xs text-red-600 mt-2 font-medium">
                            ⚠️ Low stock - order soon!
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Display Rentals */}
                {viewMode !== 'buy' && filteredRentals.map(rental => (
                  <div key={rental.id} className="bg-purple-50 border-2 border-purple-200 rounded-lg shadow hover:shadow-md transition">
                    <div className="p-4 sm:p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full font-medium">
                          🏷️ RENTAL
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {rental.category.name}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                        {rental.itemName}
                      </h3>
                      
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {rental.description}
                      </p>

                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <span className="text-xl sm:text-2xl font-bold text-purple-600">
                            ₹{rental.finalRent}
                          </span>
                          <span className="text-sm text-gray-500">/day</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {rental.quantity} available
                        </span>
                      </div>

                      {rental.securityDeposit && rental.securityDeposit > 0 && (
                        <p className="text-xs text-gray-600 mb-3">
                          🔒 Security Deposit: ₹{rental.securityDeposit}
                        </p>
                      )}

                      <div className="bg-white border border-purple-200 rounded-lg p-3 mb-3 text-sm">
                        <p className="text-gray-700">
                          <strong>Owner:</strong> {rental.sellerName}
                        </p>
                        <p className="text-gray-700">
                          <strong>Room:</strong> {rental.sellerRoom}
                        </p>
                        <p className="text-gray-700">
                          <strong>Phone:</strong> {rental.sellerPhone}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          // For now, just show contact info
                          alert(`Contact ${rental.sellerName} at ${rental.sellerPhone} (Room ${rental.sellerRoom}) to rent this item.`)
                        }}
                        className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition font-medium"
                      >
                        Contact Owner
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}