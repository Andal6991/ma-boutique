// src/app/api/rapports/vendeurs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GERANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const periode = searchParams.get('periode') ?? 'mois'
  const tenantId = session.user.tenantId
  const now = new Date()

  let debut: Date
  let fin: Date

  if (periode === 'mois') {
    debut = startOfMonth(now)
    fin = now
  } else if (periode === 'mois_prec') {
    debut = startOfMonth(subMonths(now, 1))
    fin = endOfMonth(subMonths(now, 1))
  } else if (periode === 'annee') {
    debut = new Date(now.getFullYear(), 0, 1)
    fin = now
  } else {
    // Personnalisé
    debut = new Date(searchParams.get('debut') ?? startOfMonth(now).toISOString())
    fin = new Date(searchParams.get('fin') ?? now.toISOString())
  }

  // Récupérer tous les vendeurs de la boutique
  const vendeurs = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  })

  // Pour chaque vendeur, calculer ses stats
  const stats = await Promise.all(vendeurs.map(async vendeur => {
    const ventes = await prisma.vente.findMany({
      where: {
        tenantId,
        userId: vendeur.id,
        statut: { not: 'ANNULEE' },
        createdAt: { gte: debut, lte: fin },
      },
      include: {
        lignes: true,
        paiements: true,
        client: { select: { nom: true, prenom: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const totalCA = ventes.reduce((s, v) => s + v.montantTTC, 0)
    const totalEncaisse = ventes.reduce((s, v) => s + v.montantPaye, 0)
    const nbVentes = ventes.length
    const nbArticles = ventes.reduce((s, v) => s + v.lignes.reduce((ls, l) => ls + l.quantite, 0), 0)
    const panierMoyen = nbVentes > 0 ? totalCA / nbVentes : 0
    const ventesAnnulees = await prisma.vente.count({
      where: { tenantId, userId: vendeur.id, statut: 'ANNULEE', createdAt: { gte: debut, lte: fin } },
    })

    return {
      vendeur: {
        id: vendeur.id,
        nom: vendeur.name ?? vendeur.email,
        email: vendeur.email,
        role: vendeur.role,
      },
      stats: {
        nbVentes,
        totalCA,
        totalEncaisse,
        nbArticles,
        panierMoyen,
        ventesAnnulees,
      },
      dernieresVentes: ventes.slice(0, 5).map(v => ({
        id: v.id,
        numero: v.numero,
        montantTTC: v.montantTTC,
        statut: v.statut,
        createdAt: v.createdAt,
        client: v.client ? `${v.client.prenom ?? ''} ${v.client.nom}`.trim() : 'Comptant',
      })),
    }
  }))

  // Trier par CA décroissant
  stats.sort((a, b) => b.stats.totalCA - a.stats.totalCA)

  return NextResponse.json({
    periode: { debut, fin },
    vendeurs: stats,
    totaux: {
      ca: stats.reduce((s, v) => s + v.stats.totalCA, 0),
      ventes: stats.reduce((s, v) => s + v.stats.nbVentes, 0),
      articles: stats.reduce((s, v) => s + v.stats.nbArticles, 0),
    },
  })
}
