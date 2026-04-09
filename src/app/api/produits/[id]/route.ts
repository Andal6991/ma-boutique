// src/app/api/produits/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  libelle: z.string().min(1).optional(),
  description: z.string().optional(),
  prixHT: z.number().positive().optional(),
  tauxTVA: z.number().min(0).max(100).optional(),
  stock: z.number().int().min(0).optional(),
  stockMin: z.number().int().min(0).optional(),
  unite: z.string().optional(),
  categorieId: z.string().nullable().optional(),
  actif: z.boolean().optional(),
  imageUrl: z.string().url().nullable().optional().or(z.literal('')),
})

async function getProduit(id: string, tenantId: string) {
  return prisma.produit.findFirst({ where: { id, tenantId } })
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const produit = await getProduit(params.id, session.user.tenantId)
  if (!produit) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  return NextResponse.json(produit)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GERANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  const produit = await getProduit(params.id, session.user.tenantId)
  if (!produit) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  try {
    const body = await req.json()
    const data = updateSchema.parse(body)
    
    // Nettoyer imageUrl si chaîne vide
    if (data.imageUrl === '') data.imageUrl = null
    
    const updated = await prisma.produit.update({
      where: { id: params.id },
      data,
      include: { categorie: true },
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  const produit = await getProduit(params.id, session.user.tenantId)
  if (!produit) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  await prisma.produit.update({ where: { id: params.id }, data: { actif: false } })
  return NextResponse.json({ ok: true })
}
