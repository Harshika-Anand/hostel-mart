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

export default function Shop() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // Use the CartContext instead of local state
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
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/api/shop/products'),
        fetch('/api/shop/categories')
      ])
      
      if (!productsRes.ok || !categoriesRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const productsData = await productsRes.json()
      const categoriesData = await categoriesRes.json()
      
      setProducts(productsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load products. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = selectedCategory === 'all' 
    ? products.filter(p => p.isAvailable && p.stockQuantity > 0)
    : products.filter(p => p.isAvailable && p.stockQuantity > 0 && p.category.id === selectedCategory)

  // Updated to use CartContext method
  const addToCart = (product: Product) => {
    addToCartContext({
      productId: product.id,
      name: product.name,
      price: product.price,
      stockQuantity: product.stockQuantity,
      quantity: 1
    })
  }

  // Updated to use CartContext method
  const updateCartQuantity = (productId: string, quantity: number) => {
    updateQuantity(productId, quantity)
  }

  const cartTotal = getCartTotal()
  const cartItemCount = getCartCount()

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
      <div className="min-h-screen flex items-center justify-center">
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
                ← Back
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Hostel Mart</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium">
                Cart: {cartItemCount} items • ₹{cartTotal}
              </div>
              {cartItemCount > 0 && (
                <button
                  onClick={() => router.push('/checkout')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Checkout
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Categories */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-3 py-2 rounded transition ${
                    selectedCategory === 'all'
                      ? 'bg-blue-100 text-blue-900 font-medium'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  All Items
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded transition ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 text-blue-900 font-medium'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Cart Summary */}
            {cart.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Cart</h3>
                <div className="space-y-3">
                  {cart.map(item => (
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
                  <div className="border-t pt-3 mt-4">
                    <div className="flex justify-between items-center font-semibold text-gray-900">
                      <span>Total:</span>
                      <span>₹{cartTotal}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🛒</div>
                <p className="text-gray-500 text-lg">No products available in this category</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => {
                  const cartItem = cart.find(item => item.productId === product.id)
                  const canAddMore = !cartItem || cartItem.quantity < product.stockQuantity

                  return (
                    <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-md transition">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 flex-1">{product.name}</h3>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full ml-2 flex-shrink-0">
                            {product.category.name}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-2xl font-bold text-green-600">₹{product.price}</span>
                          <span className="text-sm text-gray-500">
                            {product.stockQuantity} left
                          </span>
                        </div>

                        {cartItem ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => updateCartQuantity(product.id, cartItem.quantity - 1)}
                                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition"
                              >
                                -
                              </button>
                              <span className="font-semibold text-lg w-8 text-center">
                                {cartItem.quantity}
                              </span>
                              <button
                                onClick={() => updateCartQuantity(product.id, cartItem.quantity + 1)}
                                disabled={!canAddMore}
                                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
                          >
                            Add to Cart
                          </button>
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