// src/app/api/dashboard/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfDay, startOfMonth, subMonths, endOfMonth, differenceInDays } from 'date-fns'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const tenantId = session.user.tenantId

  const now = new Date()
  const debutJour = startOfDay(now)
  const debutMois = startOfMonth(now)
  const debutMoisPrec = startOfMonth(subMonths(now, 1))
  const finMoisPrec = endOfMonth(subMonths(now, 1))

  const [ventesJour, ventesMois, ventesMoisPrec, credits, alertesStock, ventesParJour] =
    await Promise.all([
      // CA aujourd'hui
      prisma.vente.aggregate({
        where: { tenantId, createdAt: { gte: debutJour }, statut: { not: 'ANNULEE' } },
        _sum: { montantTTC: true },
        _count: true,
      }),
      // CA ce mois
      prisma.vente.aggregate({
        where: { tenantId, createdAt: { gte: debutMois }, statut: { not: 'ANNULEE' } },
        _sum: { montantTTC: true },
      }),
      // CA mois précédent
      prisma.vente.aggregate({
        where: { tenantId, createdAt: { gte: debutMoisPrec, lte: finMoisPrec }, statut: { not: 'ANNULEE' } },
        _sum: { montantTTC: true },
      }),
      // Crédits en cours et en retard
      prisma.credit.findMany({
        where: {
          client: { tenantId },
          statut: { in: ['EN_COURS', 'EN_RETARD'] },
        },
        include: { client: true },
        orderBy: { echeance: 'asc' },
      }),
      // Produits en alerte de stock
      prisma.produit.count({
        where: { tenantId, actif: true },
      }),
      // Ventes des 30 derniers jours
      prisma.vente.findMany({
        where: { tenantId, createdAt: { gte: debutMois }, statut: { not: 'ANNULEE' } },
        select: { createdAt: true, montantTTC: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

  // Alerte stock — comparer stock vs stockMin
  const tousLesProduits = await prisma.produit.findMany({
    where: { tenantId, actif: true },
    select: { stock: true, stockMin: true },
  })
  const alerteStockCount = tousLesProduits.filter(p => p.stock <= p.stockMin).length

  // Grouper ventes par jour
  const ventesGroupees: Record<string, number> = {}
  ventesParJour.forEach(v => {
    const d = v.createdAt.toISOString().slice(0, 10)
    ventesGroupees[d] = (ventesGroupees[d] || 0) + v.montantTTC
  })
  const ventesParJourArray = Object.entries(ventesGroupees).map(([date, montant]) => ({ date, montant }))

  // Top produits ce mois
  const topProduits = await prisma.venteLigne.groupBy({
    by: ['produitId'],
    where: { vente: { tenantId, createdAt: { gte: debutMois }, statut: { not: 'ANNULEE' } } },
    _sum: { quantite: true, prixUnitaire: true },
    orderBy: { _sum: { quantite: 'desc' } },
    take: 5,
  })
  const topProduitsDetails = await Promise.all(
    topProduits.map(async t => {
      const p = await prisma.produit.findUnique({ where: { id: t.produitId } })
      return {
        libelle: p?.libelle ?? 'Inconnu',
        quantite: t._sum.quantite ?? 0,
        montant: (t._sum.quantite ?? 0) * (t._sum.prixUnitaire ?? 0),
      }
    })
  )

  // Crédits en retard avec jours de retard
  const creditsEnRetard = credits
    .filter(c => c.statut === 'EN_RETARD' || new Date(c.echeance) < now)
    .map(c => ({
      id: c.id,
      clientNom: `${c.client.prenom ?? ''} ${c.client.nom}`.trim(),
      soldeRestant: c.soldeRestant,
      echeance: c.echeance.toISOString(),
      joursRetard: Math.max(0, differenceInDays(now, c.echeance)),
    }))

  const encoursTotalCredits = credits.reduce((s, c) => s + c.soldeRestant, 0)

  // Dépenses du mois
  const depensesMois = await prisma.depense.aggregate({
    where: { tenantId, date: { gte: debutMois } },
    _sum: { montant: true },
  })

  return NextResponse.json({
    depensesMois: depensesMois._sum.montant ?? 0,
    beneficeNet: (ventesMois._sum?.montantTTC ?? 0) - (depensesMois._sum?.montant ?? 0),
    caJour: ventesJour._sum.montantTTC ?? 0,
    caMois: ventesMois._sum.montantTTC ?? 0,
    caMoisPrecedent: ventesMoisPrec._sum.montantTTC ?? 0,
    nbVentesJour: ventesJour._count,
    encoursTotalCredits,
    nbCreditsEnRetard: creditsEnRetard.length,
    nbAlerteStock: alerteStockCount,
    ventesParJour: ventesParJourArray,
    creditsEnRetard,
    topProduits: topProduitsDetails,
  })
}
