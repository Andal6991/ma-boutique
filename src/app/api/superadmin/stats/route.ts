// src/app/api/superadmin/stats/route.ts
import { NextResponse } from 'next/server'
import { getSuperAdminSession } from '@/lib/superadmin-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSuperAdminSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const now = new Date()
  const dans7jours = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [
    totalTenants, tenantsActifs, tenantsExpires, tenantsExpirentBientot,
    totalUsers, totalVentes, revenuMensuelTotal,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { actif: true, dateFinAbonnement: { gte: now } } }),
    prisma.tenant.count({ where: { OR: [{ actif: false }, { dateFinAbonnement: { lt: now } }] } }),
    prisma.tenant.count({ where: { actif: true, dateFinAbonnement: { gte: now, lte: dans7jours } } }),
    prisma.user.count(),
    prisma.vente.count(),
    prisma.tenant.aggregate({ _sum: { prixMensuel: true }, where: { actif: true } }),
  ])

  // Top 5 tenants par activité (ventes ce mois)
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1)
  const topTenants = await prisma.vente.groupBy({
    by: ['tenantId'],
    where: { createdAt: { gte: debutMois } },
    _count: { id: true },
    _sum: { montantTTC: true },
    orderBy: { _sum: { montantTTC: 'desc' } },
    take: 5,
  })
  const topTenantsDetails = await Promise.all(
    topTenants.map(async t => {
      const tenant = await prisma.tenant.findUnique({ where: { id: t.tenantId }, select: { nom: true, sousDomaine: true } })
      return { ...tenant, nbVentes: t._count.id, caTotal: t._sum.montantTTC ?? 0 }
    })
  )

  // Tenants expirant bientôt
  const expirantBientot = await prisma.tenant.findMany({
    where: { actif: true, dateFinAbonnement: { gte: now, lte: dans7jours } },
    select: { id: true, nom: true, sousDomaine: true, dateFinAbonnement: true, emailContact: true },
    orderBy: { dateFinAbonnement: 'asc' },
  })

  return NextResponse.json({
    totalTenants,
    tenantsActifs,
    tenantsExpires,
    tenantsExpirentBientot,
    totalUsers,
    totalVentes,
    revenuMensuelTotal: revenuMensuelTotal._sum.prixMensuel ?? 0,
    topTenants: topTenantsDetails,
    expirantBientot,
  })
}
