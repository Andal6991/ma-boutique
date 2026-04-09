// src/app/api/fournisseurs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GERANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  const data = await req.json()
  const f = await prisma.fournisseur.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data,
  })
  return NextResponse.json(f)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  await prisma.fournisseur.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: { actif: false },
  })
  return NextResponse.json({ ok: true })
}
