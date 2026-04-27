// src/app/api/ventes/[id]/commentaires/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  contenu: z.string().min(1),
  type: z.enum(['NOTE', 'DEMANDE_SUPPRESSION']).default('NOTE'),
})

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const commentaires = await prisma.commentaireVente.findMany({
    where: { venteId: params.id },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(commentaires)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Vérifier que la vente appartient au tenant
  const vente = await prisma.vente.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  })
  if (!vente) return NextResponse.json({ error: 'Vente introuvable' }, { status: 404 })
  if (vente.statut === 'ANNULEE') return NextResponse.json({ error: 'Vente déjà annulée' }, { status: 400 })

  try {
    const data = schema.parse(await req.json())

    // Un vendeur ne peut faire que des NOTE ou DEMANDE_SUPPRESSION
    // Un Admin/Gérant peut faire VALIDATION_SUPPRESSION
    if (data.type === 'DEMANDE_SUPPRESSION' && session.user.role === 'ADMIN') {
      return NextResponse.json({ error: 'Un Admin annule directement sans demande' }, { status: 400 })
    }

    const commentaire = await prisma.commentaireVente.create({
      data: {
        contenu: data.contenu,
        type: data.type,
        venteId: params.id,
        userId: session.user.id,
      },
      include: { user: { select: { name: true, role: true } } },
    })

    return NextResponse.json(commentaire, { status: 201 })
  } catch (e: any) {
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
