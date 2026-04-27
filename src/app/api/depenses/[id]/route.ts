// src/app/api/depenses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Seul un Admin peut supprimer une dépense' }, { status: 403 })
  }
  await prisma.depense.deleteMany({
    where: { id: params.id, tenantId: session.user.tenantId },
  })
  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GERANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  const data = await req.json()
  await prisma.depense.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: { libelle: data.libelle, montant: data.montant, categorie: data.categorie, date: new Date(data.date), notes: data.notes },
  })
  return NextResponse.json({ ok: true })
}
