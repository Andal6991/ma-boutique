import { NextRequest, NextResponse } from 'next/server'
import { getSuperAdminSession } from '@/lib/superadmin-auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth } from 'date-fns'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSuperAdminSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const tenantId = params.id
  const debutMois = startOfMonth(new Date())

  const [
    tenant, nbVendeurs, nbProduits, nbClients,
    ventesTotal, ventesMois, dernieresVentes
  ] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.user.count({ where: { tenantId } }),
    prisma.produit.count({ where: { tenantId, actif: true } }),
    prisma.client.count({ where: { tenantId, actif: true } }),
    prisma.vente.aggregate({
      where: { tenantId, statut: { not: 'ANNULEE' } },
      _sum: { montantTTC: true }, _count: true,
    }),
    prisma.vente.aggregate({
      where: { tenantId, statut: { not: 'ANNULEE' }, createdAt: { gte: debutMois } },
      _sum: { montantTTC: true }, _count: true,
    }),
    prisma.vente.findMany({
      where: { tenantId },
      include: { user: { select: { name: true } }, client: { select: { nom: true, prenom: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  return NextResponse.json({
    tenant,
    stats: {
      nbVendeurs, nbProduits, nbClients,
      caTotal: ventesTotal._sum.montantTTC ?? 0,
      nbVentesTotal: ventesTotal._count,
      caMois: ventesMois._sum.montantTTC ?? 0,
      nbVentesMois: ventesMois._count,
    },
    dernieresVentes,
  })
}
