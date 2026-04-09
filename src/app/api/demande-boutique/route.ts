// src/app/api/demande-boutique/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const data = await req.json()
  
  // Créer une notification pour le SuperAdmin
  await prisma.notification.create({
    data: {
      type: 'DEMANDE_BOUTIQUE',
      titre: 'Demande nouvelle boutique',
      message: `${data.userName ?? data.userEmail} demande une 2e boutique : "${data.nomBoutique}" - ${data.adresse ?? ''} - Tel: ${data.telephone ?? ''} - Notes: ${data.notes ?? ''}`,
      tenantId: session.user.tenantId,
      userId: session.user.id,
    },
  })

  return NextResponse.json({ ok: true })
}
