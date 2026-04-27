// src/app/api/employes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  nom: z.string().min(2),
  email: z.string().email(),
  telephone: z.string().optional(),
  role: z.enum(['GERANT', 'VENDEUR']).default('VENDEUR'),
  password: z.string().min(6),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GERANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const employes = await prisma.user.findMany({
    where: { tenantId: session.user.tenantId, id: { not: session.user.id } },
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      userTenants: { where: { tenantId: session.user.tenantId }, select: { actif: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(employes)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Seul un Admin peut créer des employés' }, { status: 403 })
  }

  try {
    const data = schema.parse(await req.json())

    // Vérifier la limite du plan
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { maxVendeurs: true },
    })
    const nbActuels = await prisma.user.count({ where: { tenantId: session.user.tenantId } })
    if (tenant && nbActuels >= tenant.maxVendeurs) {
      return NextResponse.json({
        error: 'Limite de vendeurs atteinte pour votre plan. Contactez Ma Boutique pour upgrader.',
      }, { status: 403 })
    }

    // Vérifier si email déjà utilisé
    const exists = await prisma.user.findUnique({ where: { email: data.email } })
    if (exists) {
      // Si l'utilisateur existe déjà, l'associer à cette boutique
      const alreadyLinked = await prisma.userTenant.findFirst({
        where: { userId: exists.id, tenantId: session.user.tenantId },
      })
      if (alreadyLinked) return NextResponse.json({ error: 'Cet email est déjà utilisé dans cette boutique' }, { status: 409 })

      await prisma.userTenant.create({
        data: { userId: exists.id, tenantId: session.user.tenantId, role: data.role },
      })
      return NextResponse.json({ ...exists, message: 'Employé associé à la boutique' }, { status: 201 })
    }

    const hash = await bcrypt.hash(data.password, 10)
    const employe = await prisma.user.create({
      data: {
        name: data.nom,
        email: data.email,
        password: hash,
        role: data.role,
        tenantId: session.user.tenantId,
      },
    })
    return NextResponse.json(employe, { status: 201 })
  } catch (e: any) {
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
