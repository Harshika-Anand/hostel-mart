// File: src/contexts/CartContext.tsx
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  stockQuantity: number
}

interface CartContextType {
  cart: CartItem[]
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getCartTotal: () => number
  getCartCount: () => number
  isLoading: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// Helper function to get initial cart state from localStorage
const getInitialCart = (): CartItem[] => {
  if (typeof window === 'undefined') return []
  
  try {
    const savedCart = localStorage.getItem('hostel-mart-cart')
    return savedCart ? JSON.parse(savedCart) : []
  } catch (error) {
    console.error('Error parsing saved cart:', error)
    localStorage.removeItem('hostel-mart-cart')
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(getInitialCart)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize cart from localStorage only once on mount
  useEffect(() => {
    const savedCart = getInitialCart()
    setCart(savedCart)
    setIsLoading(false)
  }, [])

  // Save cart to localStorage whenever cart changes (but not during initial load)
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('hostel-mart-cart', JSON.stringify(cart))
    }
  }, [cart, isLoading])

  const addToCart = (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    const quantity = item.quantity || 1
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.productId === item.productId)
           
      if (existingItem) {
        // Update quantity if item already exists
        return prevCart.map(cartItem =>
          cartItem.productId === item.productId
            ? { ...cartItem, quantity: Math.min(cartItem.quantity + quantity, item.stockQuantity) }
            : cartItem
        )
      } else {
        // Add new item
        return [...prevCart, { ...item, quantity: Math.min(quantity, item.stockQuantity) }]
      }
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.productId === productId
          ? { ...item, quantity: Math.min(quantity, item.stockQuantity) }
          : item
      )
    )
  }

  const clearCart = () => {
    setCart([])
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const getCartCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const value: CartContextType = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    isLoading
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}