import * as jose from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_dev_only')

export async function signJWT(payload: any) {
    return await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(JWT_SECRET)
}

export async function verifyJWT(token: string) {
    try {
        const { payload } = await jose.jwtVerify(token, JWT_SECRET)
        return payload
    } catch {
        return null
    }
}

export async function getSession() {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return null
    return await verifyJWT(token)
}
