// src/app/api/ventes/[id]/annuler/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  
  // ADMIN UNIQUEMENT
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Seul un administrateur peut annuler une vente' }, { status: 403 })
  }

  const vente = await prisma.vente.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { lignes: true, credit: true },
  })
  if (!vente) return NextResponse.json({ error: 'Vente introuvable' }, { status: 404 })
  if (vente.statut === 'ANNULEE') return NextResponse.json({ error: 'Vente déjà annulée' }, { status: 400 })

  const { raison } = await req.json()
  if (!raison?.trim()) return NextResponse.json({ error: 'La raison est obligatoire' }, { status: 400 })

  await prisma.$transaction(async tx => {
    // Annuler la vente
    await tx.vente.update({
      where: { id: params.id },
      data: { statut: 'ANNULEE', annuleeParId: session.user.id, raisonAnnulation: raison },
    })

    // Remettre le stock
    for (const ligne of vente.lignes) {
      await tx.produit.update({
        where: { id: ligne.produitId },
        data: { stock: { increment: ligne.quantite } },
      })
    }

    // Annuler le crédit associé si existant
    if (vente.credit) {
      await tx.credit.update({
        where: { id: vente.credit.id },
        data: { statut: 'ANNULE' },
      })
      await tx.client.update({
        where: { id: vente.clientId! },
        data: { encours: { decrement: vente.credit.soldeRestant } },
      })
    }
  })

  return NextResponse.json({ ok: true, message: 'Vente annulée avec succès' })
}
