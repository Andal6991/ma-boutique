// src/app/(dashboard)/layout.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { AlertTriangle } from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { actif: true, dateFinAbonnement: true, nom: true, plan: true },
  })

  const now = new Date()
  const abonnementExpire = !tenant?.actif || (tenant?.dateFinAbonnement && new Date(tenant.dateFinAbonnement) < now)
  const joursRestants = tenant?.dateFinAbonnement
    ? Math.ceil((new Date(tenant.dateFinAbonnement).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const expireBientot = joursRestants > 0 && joursRestants <= 7

  if (abonnementExpire && session.user.role !== 'SUPERADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-red-200 shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Abonnement expiré</h1>
          <p className="text-gray-500 text-sm mb-6">
            Votre abonnement Ma Boutique a expiré. Contactez votre administrateur pour le renouveler.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <p className="font-medium">{tenant?.nom}</p>
            <p className="text-gray-400 mt-1">Plan {tenant?.plan}</p>
          </div>
          <a href="tel:+22666810504" className="block mt-4 text-blue-600 font-bold text-lg">
            +226 66 81 05 04
          </a>
        </div>
      </div>
    )
  }

  const headerUser = {
    name: session.user.name ?? null,
    email: session.user.email,
    role: session.user.role,
    tenantNom: session.user.tenantNom,
    toutesLesBoutiques: (session.user.toutesLesBoutiques ?? []).map(b => ({
      id: b.id,
      nom: b.nom,
      role: b.role,
    })),
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar role={session.user.role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={headerUser} />
        {expireBientot && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Votre abonnement expire dans <strong>{joursRestants} jour{joursRestants > 1 ? 's' : ''}</strong>.
            </span>
          </div>
        )}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
