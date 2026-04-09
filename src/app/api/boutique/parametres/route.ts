// src/app/api/boutique/parametres/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  nom: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal('')),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  devise: z.string().default('FCFA'),
  pointsParMille: z.number().int().min(0).max(100).default(1),
  seuilFidelite: z.number().int().min(10).default(100),
  couleurPrimaire: z.string().default('#1e40af'),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: {
      id: true, nom: true, email: true, telephone: true, adresse: true,
      logo: true, devise: true, pointsParMille: true, seuilFidelite: true,
      couleurPrimaire: true, plan: true, dateFinAbonnement: true,
      maxVendeurs: true, maxProduits: true, maxClients: true,
    },
  })

  if (!tenant) return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })
  return NextResponse.json(tenant)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GERANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Seul un Admin ou Gérant peut modifier la boutique' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const tenant = await prisma.tenant.update({
      where: { id: session.user.tenantId },
      data: {
        nom: data.nom,
        email: data.email || null,
        telephone: data.telephone || null,
        adresse: data.adresse || null,
        devise: data.devise,
        pointsParMille: data.pointsParMille,
        seuilFidelite: data.seuilFidelite,
        couleurPrimaire: data.couleurPrimaire,
      },
    })
    return NextResponse.json({ ok: true, tenant })
  } catch (e: any) {
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
