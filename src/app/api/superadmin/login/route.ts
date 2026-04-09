// src/app/api/superadmin/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { signSuperAdminToken } from '@/lib/superadmin-auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const sa = await prisma.superAdmin.findUnique({ where: { email } })
  if (!sa) return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })

  const valid = await bcrypt.compare(password, sa.password)
  if (!valid) return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })

  const token = await signSuperAdminToken(sa.id, sa.email)

  const res = NextResponse.json({ ok: true })
  res.cookies.set('sa_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8h
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('sa_token')
  return res
}
