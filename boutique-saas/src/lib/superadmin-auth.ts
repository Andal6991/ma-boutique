import { getServerSession } from 'next-auth'
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const superAdminAuthOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'superadmin-credentials',
      name: 'SuperAdmin',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const admin = await prisma.superAdmin.findUnique({ where: { email: credentials.email } })
        if (!admin) return null
        const ok = await bcrypt.compare(credentials.password, admin.password)
        if (!ok) return null
        return { id: admin.id, email: admin.email, name: admin.nom, role: 'SUPERADMIN' }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = (user as any).role }
      return token
    },
    async session({ session, token }) {
      if (token) { session.user.id = token.id as string; session.user.role = token.role as string }
      return session
    },
  },
  pages: { signIn: '/superadmin/login' },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: 'next-auth.superadmin-session-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' },
    },
  },
}

export async function getSuperAdminSession() {
  const session = await getServerSession(superAdminAuthOptions)
  if (!session || session.user.role !== 'SUPERADMIN') return null
  return session
}
