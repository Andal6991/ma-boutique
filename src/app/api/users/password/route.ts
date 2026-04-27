// src/app/api/users/password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  ancienPassword: z.string().min(1),
  nouveauPassword: z.string().min(6, 'Le nouveau mot de passe doit faire au moins 6 caractères'),
  confirmation: z.string().min(6),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const data = schema.parse(await req.json())
    if (data.nouveauPassword !== data.confirmation) {
      return NextResponse.json({ error: 'Les mots de passe ne correspondent pas' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user?.password) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    const valid = await bcrypt.compare(data.ancienPassword, user.password)
    if (!valid) return NextResponse.json({ error: 'Ancien mot de passe incorrect' }, { status: 400 })

    const hash = await bcrypt.hash(data.nouveauPassword, 10)
    await prisma.user.update({ where: { id: session.user.id }, data: { password: hash } })

    return NextResponse.json({ ok: true, message: 'Mot de passe modifié avec succès' })
  } catch (e: any) {
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0]?.message ?? 'Erreur' }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
