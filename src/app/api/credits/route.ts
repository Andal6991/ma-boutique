// src/app/api/credits/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const creditSchema = z.object({
  clientId: z.string(),
  montantInitial: z.number().positive(),
  echeance: z.string(),
  notes: z.string().optional(),
  venteId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GERANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const statut = searchParams.get('statut')
  const clientId = searchParams.get('clientId')

  const credits = await prisma.credit.findMany({
    where: {
      client: { tenantId: session.user.tenantId },
      ...(statut && { statut }),
      ...(clientId && { clientId }),
    },
    include: {
      client: { select: { id: true, nom: true, prenom: true, telephone: true } },
      vente: { select: { numero: true, montantTTC: true } },
      remboursements: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { echeance: 'asc' },
  })

  // Mettre à jour automatiquement les crédits en retard
  const now = new Date()
  const aMettre = credits.filter(
    c => c.statut === 'EN_COURS' && new Date(c.echeance) < now && c.soldeRestant > 0
  )
  if (aMettre.length > 0) {
    await prisma.credit.updateMany({
      where: { id: { in: aMettre.map(c => c.id) } },
      data: { statut: 'EN_RETARD' },
    })
    aMettre.forEach(c => { c.statut = 'EN_RETARD' })
  }

  return NextResponse.json(credits)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GERANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const data = creditSchema.parse(await req.json())

    const client = await prisma.client.findFirst({
      where: { id: data.clientId, tenantId: session.user.tenantId },
    })
    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    const nouvelEncours = client.encours + data.montantInitial
    if (client.creditMax > 0 && nouvelEncours > client.creditMax) {
      return NextResponse.json({
        error: `Plafond dépassé. Disponible: ${client.creditMax - client.encours} FCFA`,
      }, { status: 422 })
    }

    const [credit] = await prisma.$transaction([
      prisma.credit.create({
        data: {
          montantInitial: data.montantInitial,
          soldeRestant: data.montantInitial,
          echeance: new Date(data.echeance),
          statut: 'EN_COURS',
          notes: data.notes,
          clientId: data.clientId,
          venteId: data.venteId,
        },
        include: { client: true },
      }),
      prisma.client.update({
        where: { id: data.clientId },
        data: { encours: { increment: data.montantInitial } },
      }),
    ])

    return NextResponse.json(credit, { status: 201 })
  } catch (e: any) {
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
