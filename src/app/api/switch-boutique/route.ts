// src/app/api/switch-boutique/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { tenantId } = await req.json()
  if (!tenantId) return NextResponse.json({ error: 'tenantId requis' }, { status: 400 })

  // Vérifier que l'utilisateur a accès à cette boutique
  const access = session.user.toutesLesBoutiques?.find(b => b.id === tenantId)
  // Aussi vérifier dans UserTenant si pas dans la session
  if (!access) {
    const ut = await prisma.userTenant.findFirst({
      where: { userId: session.user.id, tenantId, actif: true },
      include: { tenant: true },
    })
    if (!ut) return NextResponse.json({ error: 'Accès refusé à cette boutique' }, { status: 403 })
  }

  return NextResponse.json({ ok: true, tenantId })
}
