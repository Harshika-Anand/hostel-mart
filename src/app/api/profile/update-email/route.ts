import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { newEmail } = await request.json()

    // Validate email domain
    if (!newEmail.endsWith('@thapar.edu')) {
      return NextResponse.json(
        { error: 'Only @thapar.edu email addresses are allowed' },
        { status: 400 }
      )
    }

    // Check if email already in use
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail }
    })

    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      )
    }

    // Update email and reset verification
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        email: newEmail,
        emailVerified: false // Reset verification
      }
    })

    return NextResponse.json({
      message: 'Email updated successfully. Please verify your new email.',
      email: updatedUser.email
    })
  } catch (error) {
    console.error('Error updating email:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}