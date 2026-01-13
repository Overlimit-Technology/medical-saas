// src/server/clinics/mgClinic.ts
import { signPayload, verifyPayload } from '@/server/security/signedCookie'

export type MgClinicPayload = {
  userId: string
  clinicId: string
  setAt: number // unix seconds
  exp: number   // unix seconds
}

export async function createMgClinicToken(input: MgClinicPayload): Promise<string> {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not set')
  return signPayload(input, secret)
}

export async function readMgClinic(cookieValue: string | undefined): Promise<MgClinicPayload | null> {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not set')

  const payload = await verifyPayload<MgClinicPayload>(cookieValue, secret)
  if (!payload) return null

  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp !== 'number' || payload.exp <= now) return null
  if (!payload.userId || !payload.clinicId) return null

  return payload
}
