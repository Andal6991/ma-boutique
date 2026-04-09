// src/app/api/rapports/export/route.ts
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
  const type = searchParams.get('type') ?? 'ventes'
  const periode = searchParams.get('periode') ?? 'mois'
  const tenantId = session.user.tenantId

  const now = new Date()
  const debut = periode === 'mois' ? startOfMonth(now)
    : periode === 'mois_prec' ? startOfMonth(subMonths(now, 1))
    : new Date(now.getFullYear(), 0, 1)
  const fin = periode === 'mois_prec' ? endOfMonth(subMonths(now, 1)) : now

  if (type === 'ventes') {
    const ventes = await prisma.vente.findMany({
      where: { tenantId, createdAt: { gte: debut, lte: fin }, statut: { not: 'ANNULEE' } },
      include: {
        client: { select: { nom: true, prenom: true } },
        user: { select: { name: true } },
        lignes: { include: { produit: { select: { libelle: true, reference: true } } } },
        paiements: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // CSV
    const lignesCsv = ['Numéro,Date,Client,Vendeur,Montant TTC,Montant Payé,Statut,Mode paiement']
    for (const v of ventes) {
      const client = v.client ? `${v.client.prenom ?? ''} ${v.client.nom}`.trim() : 'Comptant'
      const modes = v.paiements.map(p => p.mode).join('+')
      lignesCsv.push(`${v.numero},${new Date(v.createdAt).toLocaleDateString('fr-FR')},${client},${v.user?.name ?? ''},${v.montantTTC},${v.montantPaye},${v.statut},${modes}`)
    }

    return new NextResponse(lignesCsv.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ventes_${new Date().toISOString().slice(0,10)}.csv"`,
      },
    })
  }

  if (type === 'credits') {
    const credits = await prisma.credit.findMany({
      where: { client: { tenantId } },
      include: {
        client: { select: { nom: true, prenom: true, telephone: true } },
        remboursements: true,
      },
      orderBy: { echeance: 'asc' },
    })

    const lignesCsv = ['Client,Telephone,Montant initial,Solde restant,Echeance,Statut,Nb remboursements']
    for (const c of credits) {
      const nom = `${c.client.prenom ?? ''} ${c.client.nom}`.trim()
      lignesCsv.push(`${nom},${c.client.telephone ?? ''},${c.montantInitial},${c.soldeRestant},${new Date(c.echeance).toLocaleDateString('fr-FR')},${c.statut},${c.remboursements.length}`)
    }

    return new NextResponse(lignesCsv.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="credits_${new Date().toISOString().slice(0,10)}.csv"`,
      },
    })
  }

  return NextResponse.json({ error: 'Type non supporté' }, { status: 400 })
}
