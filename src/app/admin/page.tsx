'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [shopSettings, setShopSettings] = useState<ShopSettings>({ isOpen: false })
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    categoryId: '',
    stockQuantity: '',
    imageUrl: ''
  })

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchData()
  }, [session, status])

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes, shopRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/categories'),
        fetch('/api/admin/shop-settings')
      ])
      
      const productsData = await productsRes.json()
      const categoriesData = await categoriesRes.json()
      const shopData = await shopRes.json()
      
      setProducts(productsData)
      setCategories(categoriesData)
      setShopSettings(shopData)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
    setLoading(false)
  }

  const toggleShopStatus = async () => {
    try {
      const response = await fetch('/api/admin/shop-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: !shopSettings.isOpen })
      })
      
      if (response.ok) {
        const updated = await response.json()
        setShopSettings(updated)
      }
    } catch (error) {
      console.error('Error updating shop status:', error)
    }
  }

  const toggleProductAvailability = async (productId: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !currentStatus })
      })
      fetchData()
    } catch (error) {
      console.error('Error updating product:', error)
    }
  }

  const updateStock = async (productId: string, change: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    
    const newStock = Math.max(0, product.stockQuantity + change)
    
    try {
      await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: newStock })
      })
      fetchData()
    } catch (error) {
      console.error('Error updating stock:', error)
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategory.trim()) return
    
    try {
      await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategory.trim() })
      })
      setShowAddCategory(false)
      setNewCategory('')
      fetchData()
    } catch (error) {
      console.error('Error adding category:', error)
    }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProduct,
          price: parseFloat(newProduct.price),
          stockQuantity: parseInt(newProduct.stockQuantity)
        })
      })
      setShowAddProduct(false)
      setNewProduct({ name: '', price: '', categoryId: '', stockQuantity: '', imageUrl: '' })
      fetchData()
    } catch (error) {
      console.error('Error adding product:', error)
    }
  }

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return
    
    try {
      await fetch(`/api/admin/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProduct.name,
          price: parseFloat(newProduct.price),
          categoryId: newProduct.categoryId,
          stockQuantity: parseInt(newProduct.stockQuantity),
          imageUrl: newProduct.imageUrl || null
        })
      })
      setEditingProduct(null)
      setNewProduct({ name: '', price: '', categoryId: '', stockQuantity: '', imageUrl: '' })
      fetchData()
    } catch (error) {
      console.error('Error updating product:', error)
    }
  }

  const startEditing = (product: Product) => {
    setEditingProduct(product)
    setNewProduct({
      name: product.name,
      price: product.price.toString(),
      categoryId: product.category.id,
      stockQuantity: product.stockQuantity.toString(),
      imageUrl: product.imageUrl || ''
    })
  }

  const deleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    
    try {
      await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE'
      })
      fetchData()
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo/Title */}
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                <span className="hidden sm:inline">🏪 Admin Dashboard</span>
                <span className="sm:hidden">🏪 Admin</span>
              </h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Shop Status Toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Shop Status:</span>
                <button
                  onClick={toggleShopStatus}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    shopSettings.isOpen
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                >
                  {shopSettings.isOpen ? '🟢 OPEN' : '🔴 CLOSED'}
                </button>
              </div>
              
              <button
                onClick={() => router.push('/admin/orders')}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                📦 Orders
              </button>
              <button
                onClick={() => router.push('/')}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Back to Main
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {showMobileMenu && (
            <div className="md:hidden border-t border-gray-200 py-3 space-y-3">
              {/* Mobile Shop Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Shop Status:</span>
                <button
                  onClick={toggleShopStatus}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    shopSettings.isOpen
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                >
                  {shopSettings.isOpen ? '🟢 OPEN' : '🔴 CLOSED'}
                </button>
              </div>
              
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => {
                    router.push('/admin/orders')
                    setShowMobileMenu(false)
                  }}
                  className="text-left text-blue-600 hover:text-blue-800 font-medium text-sm py-2"
                >
                  📦 Orders
                </button>
                <button
                  onClick={() => {
                    router.push('/')
                    setShowMobileMenu(false)
                  }}
                  className="text-left text-blue-600 hover:text-blue-800 text-sm py-2"
                >
                  Back to Main
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto">
        
        {/* Quick Stats - Mobile Responsive Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-xl sm:text-2xl">📦</div>
              </div>
              <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                  {products.length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Total Products</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-xl sm:text-2xl">✅</div>
              </div>
              <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 truncate">
                  {products.filter(p => p.isAvailable).length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Available</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-xl sm:text-2xl">⚠️</div>
              </div>
              <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600 truncate">
                  {products.filter(p => p.stockQuantity < 3 && p.isAvailable).length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Low Stock</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-xl sm:text-2xl">🏷️</div>
              </div>
              <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 truncate">
                  {categories.length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Categories</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Header with Actions - Mobile Responsive */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Product Management</h2>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your inventory and product catalog</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-3">
              <button
                onClick={() => setShowAddCategory(true)}
                className="bg-green-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 text-sm font-medium"
              >
                <span>+</span>
                <span>Add Category</span>
              </button>
              <button
                onClick={() => setShowAddProduct(true)}
                className="bg-blue-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 text-sm font-medium"
              >
                <span>+</span>
                <span>Add Product</span>
              </button>
            </div>
          </div>
        </div>

        {/* Shop Status Card - Mobile Optimized */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Shop Status</h3>
              <p className="text-gray-600 mt-1 text-sm">
                {shopSettings.isOpen 
                  ? 'Customers can browse and place orders' 
                  : 'Shop is closed - customers will see a closed message'
                }
              </p>
            </div>
            <button
              onClick={toggleShopStatus}
              className={`px-4 py-3 sm:px-6 sm:py-3 rounded-lg font-medium text-white transition text-sm w-full sm:w-auto ${
                shopSettings.isOpen
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {shopSettings.isOpen ? 'Close Shop' : 'Open Shop'}
            </button>
          </div>
        </div>

        {/* Products Section - Mobile Cards + Desktop Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Products ({products.length})
            </h3>
          </div>
          
          {/* Mobile Card View */}
          <div className="sm:hidden">
            {products.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No products yet. Add some products to get started!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {products.map((product) => (
                  <div key={product.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{product.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">ID: {product.id.slice(-8)}</p>
                      </div>
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                        {product.category.name}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-gray-900">₹{product.price}</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateStock(product.id, -1)}
                          disabled={product.stockQuantity === 0}
                          className="w-7 h-7 rounded bg-red-100 hover:bg-red-200 text-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                        >
                          -
                        </button>
                        <span className={`font-medium min-w-[2rem] text-center text-sm ${
                          product.stockQuantity < 5 ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {product.stockQuantity}
                        </span>
                        <button
                          onClick={() => updateStock(product.id, 1)}
                          className="w-7 h-7 rounded bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    
                    {product.stockQuantity < 3 && (
                      <div className="text-xs text-red-600 mb-3 font-medium">⚠️ Low stock!</div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleProductAvailability(product.id, product.isAvailable)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          product.isAvailable
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {product.isAvailable ? 'Available' : 'Unavailable'}
                      </button>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => startEditing(product)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">ID: {product.id.slice(-8)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {product.category.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{product.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateStock(product.id, -1)}
                          disabled={product.stockQuantity === 0}
                          className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 text-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className={`font-medium min-w-[2rem] text-center ${
                          product.stockQuantity < 5 ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {product.stockQuantity}
                        </span>
                        <button
                          onClick={() => updateStock(product.id, 1)}
                          className="w-6 h-6 rounded bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                      {product.stockQuantity < 5 && (
                        <div className="text-xs text-red-600 mt-1">Low stock!</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleProductAvailability(product.id, product.isAvailable)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          product.isAvailable
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {product.isAvailable ? 'Available' : 'Unavailable'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => startEditing(product)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {products.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No products yet. Add some products to get started!</p>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Product Modal - Mobile Responsive */}
        {(showAddProduct || editingProduct) && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
            <div className="relative top-4 mx-auto border shadow-lg rounded-lg bg-white max-w-md w-full">
              <div className="p-4 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
                <form onSubmit={editingProduct ? handleEditProduct : handleAddProduct} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Product Name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price (₹)"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                    required
                  />
                  <select
                    value={newProduct.categoryId}
                    onChange={(e) => setNewProduct({...newProduct, categoryId: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  >
                    <option value="" className="text-gray-400">Select Category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Stock Quantity"
                    value={newProduct.stockQuantity}
                    onChange={(e) => setNewProduct({...newProduct, stockQuantity: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                    required
                  />
                  <input
                    type="url"
                    placeholder="Image URL (optional)"
                    value={newProduct.imageUrl}
                    onChange={(e) => setNewProduct({...newProduct, imageUrl: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                  />
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-medium"
                    >
                      {editingProduct ? 'Update Product' : 'Add Product'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddProduct(false)
                        setEditingProduct(null)
                        setNewProduct({ name: '', price: '', categoryId: '', stockQuantity: '', imageUrl: '' })
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Add Category Modal - Mobile Responsive */}
        {showAddCategory && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
            <div className="relative top-20 mx-auto border shadow-lg rounded-lg bg-white max-w-md w-full">
              <div className="p-4 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Category</h3>
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Category Name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-400"
                    required
                  />
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 font-medium"
                    >
                      Add Category
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCategory(false)
                        setNewCategory('')
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}