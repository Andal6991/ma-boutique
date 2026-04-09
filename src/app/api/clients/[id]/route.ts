// src/app/api/clients/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  nom: z.string().min(1).optional(),
  prenom: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  adresse: z.string().optional(),
  creditMax: z.number().min(0).optional(),
  actif: z.boolean().optional(),
})

async function getClient(id: string, tenantId: string) {
  return prisma.client.findFirst({ where: { id, tenantId } })
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      ventes: {
        include: { lignes: { include: { produit: true } }, paiements: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      credits: {
        include: { remboursements: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!client) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  return NextResponse.json(client)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const client = await getClient(params.id, session.user.tenantId)
  if (!client) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  try {
    const data = updateSchema.parse(await req.json())
    const updated = await prisma.client.update({ where: { id: params.id }, data })
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GERANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  const client = await getClient(params.id, session.user.tenantId)
  if (!client) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  await prisma.client.update({ where: { id: params.id }, data: { actif: false } })
  return NextResponse.json({ ok: true })
}
