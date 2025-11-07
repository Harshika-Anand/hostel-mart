import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      roomNumber?: string
      phone?: string
      emailVerified?: boolean
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: string
    roomNumber?: string
    phone?: string
    emailVerified?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: string
    roomNumber?: string
    phone?: string
    emailVerified?: boolean
  }
}