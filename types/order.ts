// Common type definitions to fix the TypeScript errors
// Add these to your existing files or create a types file

// For admin stats route (src/app/api/admin/stats/route.ts)
interface OrderWithItems {
    id: string
    orderNumber: string
    customerName: string
    totalAmount: number
    status: string
    createdAt: Date
    user: {
      name: string
      email: string
    } | null
    orderItems: Array<{
      product: {
        name: string
      }
    }>
  }
  
  // For orders route (src/app/api/orders/[id]/route.ts)
  interface UpdateOrderData {
    status?: string
    paymentStatus?: string
    adminNotes?: string
    deliveryMethod?: string
    roomNumber?: string
    completedAt?: Date
  }
  
  // For frontend interfaces - update these in your existing files:
  
  // Updated Order interface for frontend components
  interface Order {
    id: string
    orderNumber: string | null  // Make nullable since it might not exist
    status: string
    paymentMethod: string
    paymentStatus: string
    deliveryMethod: string
    roomNumber?: string
    subtotal: number
    deliveryFee: number
    totalAmount: number
    createdAt: string
    completedAt?: string | null
    adminNotes?: string | null
    customerName: string
    customerEmail: string
    user: {
      name: string
      email: string
      phone?: string | null
      roomNumber?: string | null
    }
    orderItems: OrderItem[]
    paymentPin?: string | null
  }
  
  // Updated OrderItem interface
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