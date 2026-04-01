import * as jose from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_dev_only')

export interface SessionPayload {
    userId: string;
    email: string;
    name?: string;
    role?: string;
    picture?: string;
}

export async function signJWT(payload: SessionPayload) {
    return await new jose.SignJWT(payload as unknown as jose.JWTPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(JWT_SECRET)
}

export async function verifyJWT(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jose.jwtVerify(token, JWT_SECRET)
        return payload as unknown as SessionPayload
    } catch {
        return null
    }
}

export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return null
    return await verifyJWT(token)
}
