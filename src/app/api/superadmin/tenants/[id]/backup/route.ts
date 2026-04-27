// src/app/api/superadmin/tenants/[id]/backup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSuperAdminSession } from '@/lib/superadmin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSuperAdminSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const tenantId = params.id

  // Récupérer toutes les données de la boutique
  const [tenant, users, produits, clients, ventes, credits, depenses, fournisseurs] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.user.findMany({ where: { tenantId } }),
    prisma.produit.findMany({ where: { tenantId } }),
    prisma.client.findMany({ where: { tenantId } }),
    prisma.vente.findMany({
      where: { tenantId },
      include: { lignes: true, paiements: true },
    }),
    prisma.credit.findMany({
      where: { client: { tenantId } },
      include: { remboursements: true },
    }),
    prisma.depense.findMany({ where: { tenantId } }),
    prisma.fournisseur.findMany({ where: { tenantId } }),
  ])

  const backup = {
    version: '1.0',
    date: new Date().toISOString(),
    boutique: tenant?.nom,
    data: {
      tenant,
      users: users.map(u => ({ ...u, password: '***' })), // Masquer les mots de passe
      produits,
      clients,
      ventes,
      credits,
      depenses,
      fournisseurs,
    },
    stats: {
      nbProduits: produits.length,
      nbClients: clients.length,
      nbVentes: ventes.length,
      nbDepenses: depenses.length,
    },
  }

  const json = JSON.stringify(backup, null, 2)
  const filename = `backup-${tenant?.nom?.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
