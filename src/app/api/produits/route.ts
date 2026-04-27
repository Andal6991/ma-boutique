// src/app/api/produits/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const produitSchema = z.object({
  reference: z.string().min(1),
  libelle: z.string().min(1),
  imageUrl: z.string().url().optional().or(z.literal('')).or(z.null()),
  description: z.string().optional(),
  prixHT: z.number().positive(),
  tauxTVA: z.number().min(0).max(100).default(0),
  stock: z.number().int().min(0).default(0),
  stockMin: z.number().int().min(0).default(5),
  unite: z.string().default('pièce'),
  categorieId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q') ?? ''
  const categorieId = searchParams.get('categorieId')
  const alerteStock = searchParams.get('alerteStock') === '1'

  const produits = await prisma.produit.findMany({
    where: {
      tenantId: session.user.tenantId,
      actif: true,
      ...(search && {
        OR: [
          { libelle: { contains: search } },
          { reference: { contains: search } },
        ],
      }),
      ...(categorieId && { categorieId }),

    },
    include: { categorie: true },
    orderBy: { libelle: 'asc' },
  })

  return NextResponse.json(produits)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GERANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  // Vérifier limite plan
  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { maxProduits: true } })
  const nbProduits = await prisma.produit.count({ where: { tenantId: session.user.tenantId, actif: true } })
  if (tenant && nbProduits >= tenant.maxProduits) {
    return NextResponse.json({ error: 'Limite de produits atteinte. Upgradez votre plan.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = produitSchema.parse(body)

    // Vérifie unicité de la référence
    const exists = await prisma.produit.findUnique({
      where: { tenantId_reference: { tenantId: session.user.tenantId, reference: data.reference } },
    })
    if (exists) return NextResponse.json({ error: 'Référence déjà utilisée' }, { status: 409 })

    const produit = await prisma.produit.create({
      data: { ...data, tenantId: session.user.tenantId },
      include: { categorie: true },
    })
    return NextResponse.json(produit, { status: 201 })
  } catch (e: any) {
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
