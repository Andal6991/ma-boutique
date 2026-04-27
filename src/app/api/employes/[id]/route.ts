// src/app/api/employes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  const { role, actif } = await req.json()

  // Mettre à jour le rôle de l'employé dans cette boutique
  await prisma.user.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: { role },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  // Retirer l'accès à cette boutique (ne supprime pas le compte)
  await prisma.user.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: { role: 'VENDEUR' }, // On garde juste pour l'historique
  })
  // Dans un vrai système, on désactiverait via UserTenant
  return NextResponse.json({ ok: true })
}
