import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        // Return with proper typing - use 'as any' to bypass strict checking
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          roomNumber: user.roomNumber || undefined,
          phone: user.phone || undefined,
          emailVerified: user.emailVerified
        } 
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.roomNumber = user.roomNumber
        token.phone = user.phone as string | undefined
        token.emailVerified = user.emailVerified as boolean | undefined
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string
        session.user.role = token.role as string
        session.user.roomNumber = token.roomNumber as string | undefined
        session.user.phone = token.phone as string | undefined
        session.user.emailVerified = token.emailVerified as boolean | undefined
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
  }
}