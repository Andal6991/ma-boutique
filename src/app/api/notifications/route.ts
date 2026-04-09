// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const tenantId = session.user.tenantId
  const now = new Date()

  // Générer notifications dynamiquement
  const notifs: { id: string; type: string; titre: string; message: string; lu: boolean; createdAt: Date }[] = []

  // Crédits en retard
  const creditsRetard = await prisma.credit.findMany({
    where: { client: { tenantId }, statut: 'EN_RETARD', soldeRestant: { gt: 0 } },
    include: { client: true },
    take: 10,
  })
  for (const c of creditsRetard) {
    const jours = Math.floor((now.getTime() - new Date(c.echeance).getTime()) / 86400000)
    notifs.push({
      id: 'credit-' + c.id,
      type: 'CREDIT_RETARD',
      titre: 'Crédit en retard',
      message: `${c.client.prenom ?? ''} ${c.client.nom} — ${jours}j de retard · ${c.soldeRestant.toLocaleString('fr-FR')} FCFA`,
      lu: false,
      createdAt: c.updatedAt,
    })
  }

  // Stock bas — compatible PostgreSQL
  const stockBas = await prisma.produit.findMany({
    where: {
      tenantId,
      actif: true,
      stock: { gte: 0 },
    },
    select: { id: true, libelle: true, stock: true, stockMin: true },
    take: 10,
  }).then(produits => produits.filter(p => p.stock <= p.stockMin))
  for (const p of stockBas) {
    notifs.push({
      id: 'stock-' + p.id,
      type: 'STOCK_BAS',
      titre: p.stock === 0 ? 'Rupture de stock' : 'Stock bas',
      message: `${p.libelle} — ${p.stock === 0 ? 'En rupture' : p.stock + ' restants (seuil: ' + p.stockMin + ')'}`,
      lu: false,
      createdAt: now,
    })
  }

  // Trier par date décroissante
  notifs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  return NextResponse.json({
    notifications: notifs,
    nbNonLues: notifs.filter(n => !n.lu).length,
  })
}
