// src/app/api/superadmin/tenants/[id]/abonnement/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSuperAdminSession } from '@/lib/superadmin-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  action: z.enum(['RENOUVELER', 'MODIFIER_DATE', 'SUSPENDRE', 'REACTIVER']),
  dureeJours: z.number().int().min(1).optional(),
  dateFinManuelle: z.string().optional(),
  plan: z.enum(['STARTER', 'PRO', 'ENTERPRISE']).optional(),
  prixMensuel: z.number().min(0).optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSuperAdminSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const tenant = await prisma.tenant.findUnique({ where: { id: params.id } })
  if (!tenant) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  try {
    const body = schema.parse(await req.json())
    let updateData: any = {}

    if (body.action === 'RENOUVELER' && body.dureeJours) {
      // Renouveler depuis aujourd'hui si expiré, depuis la date de fin si encore actif
      const base = new Date(tenant.dateFinAbonnement) > new Date()
        ? new Date(tenant.dateFinAbonnement)
        : new Date()
      updateData.dateFinAbonnement = new Date(base.getTime() + body.dureeJours * 24 * 60 * 60 * 1000)
      updateData.actif = true
    } else if (body.action === 'MODIFIER_DATE' && body.dateFinManuelle) {
      updateData.dateFinAbonnement = new Date(body.dateFinManuelle)
    } else if (body.action === 'SUSPENDRE') {
      updateData.actif = false
    } else if (body.action === 'REACTIVER') {
      updateData.actif = true
    }

    if (body.plan) updateData.plan = body.plan
    if (body.prixMensuel !== undefined) updateData.prixMensuel = body.prixMensuel

    const updated = await prisma.tenant.update({ where: { id: params.id }, data: updateData })
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
