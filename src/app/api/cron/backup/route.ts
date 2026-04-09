import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  try {
    const now = new Date()
    // Mettre à jour les crédits en retard automatiquement
    const creditsMisAJour = await prisma.credit.updateMany({
      where: { statut: 'EN_COURS', echeance: { lt: now }, soldeRestant: { gt: 0 } },
      data: { statut: 'EN_RETARD' },
    })
    return NextResponse.json({ ok: true, timestamp: now.toISOString(), creditsMisAJour: creditsMisAJour.count })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
