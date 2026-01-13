// src/server/security/signedCookie.ts
type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue }
type JsonObject = { [k: string]: JsonValue }

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function toBase64(bytes: Uint8Array): string {
  // Works in Edge and Node
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any
  if (typeof g.btoa === 'function') {
    let s = ''
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
    return g.btoa(s)
  }
  return Buffer.from(bytes).toString('base64')
}

function fromBase64(b64: string): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any
  if (typeof g.atob === 'function') {
    const bin = g.atob(b64)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }
  return new Uint8Array(Buffer.from(b64, 'base64'))
}

function base64UrlEncode(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecodeToBytes(b64url: string): Uint8Array {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4
  if (pad) b64 += '='.repeat(4 - pad)
  return fromBase64(b64)
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, textEncoder.encode(data))
  return new Uint8Array(sig)
}

export async function signPayload(payload: JsonObject, secret: string): Promise<string> {
  const payloadJson = JSON.stringify(payload)
  const payloadB64 = base64UrlEncode(textEncoder.encode(payloadJson))
  const sigBytes = await hmacSha256(secret, payloadB64)
  const sigB64 = base64UrlEncode(sigBytes)
  return `${payloadB64}.${sigB64}`
}

export async function verifyPayload<T extends JsonObject>(
  token: string | undefined,
  secret: string
): Promise<T | null> {
  if (!token) return null
  const [payloadB64, sigB64] = token.split('.')
  if (!payloadB64 || !sigB64) return null

  const expectedSig = await hmacSha256(secret, payloadB64)
  const gotSig = base64UrlDecodeToBytes(sigB64)
  if (!constantTimeEqual(expectedSig, gotSig)) return null

  try {
    const payloadJson = textDecoder.decode(base64UrlDecodeToBytes(payloadB64))
    return JSON.parse(payloadJson) as T
  } catch {
    return null
  }
}
