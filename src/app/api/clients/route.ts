// src/app/api/clients/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const clientSchema = z.object({
  nom: z.string().min(1),
  prenom: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  adresse: z.string().optional(),
  creditMax: z.number().min(0).default(0),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q') ?? ''
  const avecCredit = searchParams.get('avecCredit') === '1'

  const clients = await prisma.client.findMany({
    where: {
      tenantId: session.user.tenantId,
      actif: true,
      ...(search && {
        OR: [
          { nom: { contains: search } },
          { prenom: { contains: search } },
          { telephone: { contains: search } },
        ],
      }),
      ...(avecCredit && { encours: { gt: 0 } }),
    },
    include: {
      _count: { select: { ventes: true, credits: true } },
      credits: {
        where: { statut: { in: ['EN_COURS', 'EN_RETARD'] } },
        select: { id: true, soldeRestant: true, echeance: true, statut: true },
      },
    },
    orderBy: { nom: 'asc' },
  })

  return NextResponse.json(clients)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const data = clientSchema.parse(await req.json())
    const client = await prisma.client.create({
      data: { ...data, tenantId: session.user.tenantId },
    })
    return NextResponse.json(client, { status: 201 })
  } catch (e: any) {
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
