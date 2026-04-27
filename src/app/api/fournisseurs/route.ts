// src/app/api/fournisseurs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  nom: z.string().min(1),
  telephone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  adresse: z.string().optional(),
  contact: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''

  const fournisseurs = await prisma.fournisseur.findMany({
    where: {
      tenantId: session.user.tenantId, actif: true,
      ...(q && { nom: { contains: q } }),
    },
    include: { _count: { select: { produits: true } } },
    orderBy: { nom: 'asc' },
  })
  return NextResponse.json(fournisseurs)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GERANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  try {
    const data = schema.parse(await req.json())
    const f = await prisma.fournisseur.create({ data: { ...data, tenantId: session.user.tenantId } })
    return NextResponse.json(f, { status: 201 })
  } catch (e: any) {
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
