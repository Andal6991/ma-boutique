// src/app/api/boutique/limites/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const tenantId = session.user.tenantId
  const [tenant, nbVendeurs, nbProduits, nbClients] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, maxVendeurs: true, maxProduits: true, maxClients: true, dateFinAbonnement: true, nom: true },
    }),
    prisma.user.count({ where: { tenantId } }),
    prisma.produit.count({ where: { tenantId, actif: true } }),
    prisma.client.count({ where: { tenantId, actif: true } }),
  ])

  if (!tenant) return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })

  const joursRestants = tenant.dateFinAbonnement
    ? Math.ceil((new Date(tenant.dateFinAbonnement).getTime() - Date.now()) / 86400000)
    : null

  return NextResponse.json({
    plan: tenant.plan,
    nomBoutique: tenant.nom,
    joursRestants,
    limites: {
      vendeurs: { actuel: nbVendeurs, max: tenant.maxVendeurs, pct: Math.min(100, Math.round((nbVendeurs / tenant.maxVendeurs) * 100)) },
      produits: { actuel: nbProduits, max: tenant.maxProduits, pct: Math.min(100, Math.round((nbProduits / tenant.maxProduits) * 100)) },
      clients: { actuel: nbClients, max: tenant.maxClients, pct: Math.min(100, Math.round((nbClients / tenant.maxClients) * 100)) },
    },
  })
}
