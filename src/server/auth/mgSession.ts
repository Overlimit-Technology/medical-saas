// src/server/auth/mgSession.ts
import { verifyPayload } from '@/server/security/signedCookie'

export type MgSessionPayload = {
  userId: string
  role: string
  exp: number // unix seconds
  mustChangePassword?: boolean
}

export async function readMgSession(cookieValue: string | undefined): Promise<MgSessionPayload | null> {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET no está configurado.')

  const payload = await verifyPayload<MgSessionPayload>(cookieValue, secret)
  if (!payload) return null

  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp !== 'number' || payload.exp <= now) return null
  if (!payload.userId) return null

  return payload
}
