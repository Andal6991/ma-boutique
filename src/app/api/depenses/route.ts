// src/app/api/depenses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { startOfMonth, endOfMonth } from 'date-fns'

const schema = z.object({
  libelle: z.string().min(1),
  montant: z.number().positive(),
  categorie: z.enum(['LOYER', 'ELECTRICITE', 'INTERNET', 'SALAIRE', 'TRANSPORT', 'FOURNITURE', 'AUTRE']).default('AUTRE'),
  date: z.string().default(() => new Date().toISOString()),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GERANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const mois = searchParams.get('mois') // format: 2025-04
  const tenantId = session.user.tenantId

  let dateDebut: Date | undefined
  let dateFin: Date | undefined

  if (mois) {
    const [annee, m] = mois.split('-').map(Number)
    const refDate = new Date(annee, m - 1, 1)
    dateDebut = startOfMonth(refDate)
    dateFin = endOfMonth(refDate)
  }

  const depenses = await prisma.depense.findMany({
    where: {
      tenantId,
      ...(dateDebut && dateFin && { date: { gte: dateDebut, lte: dateFin } }),
    },
    include: { user: { select: { name: true } } },
    orderBy: { date: 'desc' },
  })

  // Stats par catégorie
  const parCategorie: Record<string, number> = {}
  let totalMois = 0
  for (const d of depenses) {
    parCategorie[d.categorie] = (parCategorie[d.categorie] ?? 0) + d.montant
    totalMois += d.montant
  }

  return NextResponse.json({ depenses, parCategorie, totalMois })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GERANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const data = schema.parse(await req.json())
    const depense = await prisma.depense.create({
      data: {
        libelle: data.libelle,
        montant: data.montant,
        categorie: data.categorie,
        date: new Date(data.date),
        notes: data.notes,
        tenantId: session.user.tenantId,
        userId: session.user.id,
      },
      include: { user: { select: { name: true } } },
    })
    return NextResponse.json(depense, { status: 201 })
  } catch (e: any) {
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
