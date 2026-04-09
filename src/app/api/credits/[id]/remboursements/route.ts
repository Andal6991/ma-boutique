// src/app/api/credits/[id]/remboursements/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const rembSchema = z.object({
  montant: z.number().positive(),
  mode: z.enum(['ESPECES', 'MOBILE_MONEY', 'CHEQUE', 'VIREMENT']),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GERANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const credit = await prisma.credit.findFirst({
    where: { id: params.id, client: { tenantId: session.user.tenantId } },
    include: { client: true },
  })
  if (!credit) return NextResponse.json({ error: 'Crédit introuvable' }, { status: 404 })
  if (['SOLDE', 'ANNULE'].includes(credit.statut)) {
    return NextResponse.json({ error: 'Crédit déjà soldé ou annulé' }, { status: 400 })
  }

  try {
    const data = rembSchema.parse(await req.json())

    if (data.montant > credit.soldeRestant) {
      return NextResponse.json({
        error: `Montant trop élevé. Solde restant: ${credit.soldeRestant} FCFA`,
      }, { status: 422 })
    }

    const nouveauSolde = credit.soldeRestant - data.montant
    const nouveauStatut = nouveauSolde <= 0 ? 'SOLDE' : credit.statut === 'EN_RETARD' ? 'EN_RETARD' : 'EN_COURS'

    const remboursement = await prisma.$transaction(async tx => {
      const r = await tx.remboursement.create({
        data: {
          montant: data.montant,
          mode: data.mode,
          reference: data.reference,
          notes: data.notes,
          creditId: params.id,
        },
      })

      await tx.credit.update({
        where: { id: params.id },
        data: { soldeRestant: nouveauSolde, statut: nouveauStatut },
      })

      await tx.client.update({
        where: { id: credit.clientId },
        data: { encours: { decrement: data.montant } },
      })

      return r
    })

    return NextResponse.json({
      remboursement,
      nouveauSolde,
      statut: nouveauStatut,
      solde: nouveauSolde <= 0,
    }, { status: 201 })
  } catch (e: any) {
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const remboursements = await prisma.remboursement.findMany({
    where: { creditId: params.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(remboursements)
}
