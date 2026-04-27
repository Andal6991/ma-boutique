// src/lib/superadmin-auth.ts
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.SUPERADMIN_SECRET ?? 'superadmin-secret-change-in-prod-32chars'
)

export async function signSuperAdminToken(id: string, email: string) {
  return new SignJWT({ id, email, role: 'SUPERADMIN' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(SECRET)
}

export async function verifySuperAdminToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { id: string; email: string; role: string }
  } catch {
    return null
  }
}

export async function getSuperAdminSession() {
  const token = cookies().get('sa_token')?.value
  if (!token) return null
  return verifySuperAdminToken(token)
}

export function abonnementStatut(dateFinAbonnement: Date, actif: boolean) {
  if (!actif) return 'SUSPENDU'
  const now = new Date()
  const fin = new Date(dateFinAbonnement)
  const joursRestants = Math.ceil((fin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (joursRestants < 0) return 'EXPIRE'
  if (joursRestants <= 7) return 'EXPIRE_BIENTOT'
  return 'ACTIF'
}

export function joursRestants(dateFinAbonnement: Date) {
  const diff = new Date(dateFinAbonnement).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
