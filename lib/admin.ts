import { getSession } from '@/lib/jwt'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@lanora.ai'

export async function isAdmin() {
  const session = await getSession()
  return session?.email === ADMIN_EMAIL
}
