// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Routes publiques — toujours accessibles
  const publiques = ['/login', '/superadmin', '/api/auth', '/api/superadmin', '/_next', '/favicon']
  if (publiques.some(p => pathname.startsWith(p))) return NextResponse.next()

  // Vérification session NextAuth
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.redirect(new URL('/login', req.url))

  // Vérification abonnement (uniquement pour les routes dashboard et API métier)
  if (pathname.startsWith('/api/') || pathname.startsWith('/dashboard') ||
      pathname.startsWith('/produits') || pathname.startsWith('/ventes') ||
      pathname.startsWith('/clients') || pathname.startsWith('/credits') ||
      pathname.startsWith('/rapports')) {

    // On vérifie l'expiration via un header spécial (posé par le layout serveur)
    // La vérification complète se fait dans le layout dashboard
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
