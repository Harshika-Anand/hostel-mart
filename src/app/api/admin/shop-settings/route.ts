import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/shop-settings - Get shop settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create shop settings - use correct Prisma model name
    let settings = await prisma.shopSettings.findFirst()
    
    if (!settings) {
      settings = await prisma.shopSettings.create({
        data: {
          isOpen: true, // Default to open
          message: 'Welcome to our shop!'
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching shop settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/shop-settings - Update shop settings (Admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { isOpen, message } = await request.json()

    // Get or create shop settings - use correct Prisma model name
    let settings = await prisma.shopSettings.findFirst()
    
    if (!settings) {
      settings = await prisma.shopSettings.create({
        data: {
          isOpen: isOpen !== undefined ? isOpen : true,
          message: message || 'Welcome to our shop!'
        }
      })
    } else {
      settings = await prisma.shopSettings.update({
        where: { id: settings.id },
        data: {
          ...(isOpen !== undefined && { isOpen }),
          ...(message !== undefined && { message })
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating shop settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}