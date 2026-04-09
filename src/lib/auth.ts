// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            tenant: true,
            userTenants: { include: { tenant: true }, where: { actif: true } },
          },
        })

        if (!user || !user.password) return null

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        // Liste de toutes les boutiques accessibles
        const boutiquesPrincipale = { id: user.tenantId, nom: user.tenant.nom, role: user.role }
        const autresBoutiques = user.userTenants
          .filter(ut => ut.tenantId !== user.tenantId)
          .map(ut => ({ id: ut.tenantId, nom: ut.tenant.nom, role: ut.role }))
        const toutesLesBoutiques = [boutiquesPrincipale, ...autresBoutiques]

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantNom: user.tenant.nom,
          toutesLesBoutiques,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session: newSession }) {
      if (user) {
        token.role = (user as any).role
        token.tenantId = (user as any).tenantId
        token.tenantNom = (user as any).tenantNom
        token.toutesLesBoutiques = (user as any).toutesLesBoutiques
      }
      // Switch de boutique via update()
      if (trigger === 'update' && newSession?.tenantId) {
        const boutique = (token.toutesLesBoutiques as any[])?.find((b: any) => b.id === newSession.tenantId)
        if (boutique) {
          token.tenantId = boutique.id
          token.tenantNom = boutique.nom
          token.role = boutique.role
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.tenantId = token.tenantId as string
        session.user.tenantNom = token.tenantNom as string
        session.user.toutesLesBoutiques = token.toutesLesBoutiques as any[]
      }
      return session
    },
  },
}
