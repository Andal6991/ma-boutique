// src/app/api/fidelite/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const FCFA_PAR_POINT = 1000
export const POINTS_PAR_REMISE = 100

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'clientId requis' }, { status: 400 })

  const fidelite = await prisma.fideliteClient.findUnique({ where: { clientId } })
  const historique = await prisma.pointFidelite.findMany({
    where: { clientId }, orderBy: { createdAt: 'desc' }, take: 20,
  })

  return NextResponse.json({
    points: fidelite?.points ?? 0,
    pointsTotal: fidelite?.pointsTotal ?? 0,
    remiseDispo: Math.floor((fidelite?.points ?? 0) / POINTS_PAR_REMISE) * 1000,
    historique,
  })
}
