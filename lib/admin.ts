import { getSession } from '@/lib/jwt'

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@lanora.ai').toLowerCase().trim()

export async function isAdmin() {
  const session = await getSession()
  if (!session) return false
  
  const userEmail = (session.email as string || '').toLowerCase().trim()
  const userRole = (session.role as string || '').toLowerCase().trim()
  
  return userRole === 'admin' || (userEmail === ADMIN_EMAIL && userEmail !== '')
}
