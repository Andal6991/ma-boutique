// src/app/api/ventes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const vente = await prisma.vente.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      client: true,
      user: { select: { name: true, email: true } },
      lignes: { include: { produit: { include: { categorie: true } } } },
      paiements: true,
      credit: { include: { remboursements: { orderBy: { createdAt: 'desc' } } } },
    },
  })

  if (!vente) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  return NextResponse.json(vente)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GERANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const vente = await prisma.vente.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  })
  if (!vente) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const { montant, mode, reference } = await req.json()

  if (!montant || !mode) {
    return NextResponse.json({ error: 'montant et mode requis' }, { status: 400 })
  }

  const paiement = await prisma.$transaction(async tx => {
    const p = await tx.paiement.create({
      data: { montant, mode, reference, venteId: params.id },
    })

    const totalPaye = (vente.montantPaye ?? 0) + montant
    const statut = totalPaye >= vente.montantTTC ? 'PAYEE' : 'PARTIELLEMENT_PAYEE'

    await tx.vente.update({
      where: { id: params.id },
      data: { montantPaye: totalPaye, statut },
    })

    return p
  })

  return NextResponse.json(paiement, { status: 201 })
}
