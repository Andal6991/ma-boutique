// src/app/api/superadmin/tenants/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSuperAdminSession } from '@/lib/superadmin-auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

async function guard() {
  const session = await getSuperAdminSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  return null
}

const createSchema = z.object({
  // Boutique
  nomBoutique: z.string().min(2),
  sousDomaine: z.string().min(2),
  telephone: z.string().optional().or(z.literal('')),
  emailContact: z.string().email().optional().or(z.literal('')),
  adresse: z.string().optional().or(z.literal('')),
  // Abonnement
  plan: z.enum(['STARTER', 'PRO', 'ENTERPRISE']).default('STARTER'),
  prixMensuel: z.number().min(0).default(0),
  dureeJours: z.number().int().min(1).default(30),
  // Compte admin de la boutique
  adminNom: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
  // Notes
  notesAdmin: z.string().optional().or(z.literal('')),
})

export async function GET(req: NextRequest) {
  const err = await guard(); if (err) return err

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q') ?? ''
  const statut = searchParams.get('statut') ?? ''

  const tenants = await prisma.tenant.findMany({
    where: {
      ...(search && {
        OR: [
          { nom: { contains: search } },
          { sousDomaine: { contains: search } },
          { emailContact: { contains: search } },
        ],
      }),
    },
    include: {
      _count: { select: { users: true, clients: true, ventes: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Enrichir avec le statut d'abonnement
  const now = new Date()
  const enriched = tenants.map(t => {
    const fin = new Date(t.dateFinAbonnement)
    const jours = Math.ceil((fin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    let statutAbo = 'ACTIF'
    if (!t.actif) statutAbo = 'SUSPENDU'
    else if (jours < 0) statutAbo = 'EXPIRE'
    else if (jours <= 7) statutAbo = 'EXPIRE_BIENTOT'
    return { ...t, joursRestants: jours, statutAbo }
  })

  // Filtre statut côté serveur
  const filtered = statut ? enriched.filter(t => t.statutAbo === statut) : enriched

  return NextResponse.json(filtered)
}

export async function POST(req: NextRequest) {
  const err = await guard(); if (err) return err

  try {
    const body = createSchema.parse(await req.json())

    // Vérifier unicité du sous-domaine
    const exists = await prisma.tenant.findUnique({ where: { sousDomaine: body.sousDomaine } })
    if (exists) return NextResponse.json({ error: 'Ce sous-domaine est déjà utilisé' }, { status: 409 })

    const dateDebut = new Date()
    const dateFin = new Date(Date.now() + body.dureeJours * 24 * 60 * 60 * 1000)
    const hashedPassword = await bcrypt.hash(body.adminPassword, 10)

    const tenant = await prisma.$transaction(async tx => {
      // Limites selon le plan
      const LIMITES: Record<string, {maxVendeurs: number, maxProduits: number, maxClients: number}> = {
        STARTER: { maxVendeurs: 2, maxProduits: 100, maxClients: 200 },
        PRO: { maxVendeurs: 5, maxProduits: 500, maxClients: 1000 },
        ENTERPRISE: { maxVendeurs: 999999, maxProduits: 999999, maxClients: 999999 },
      }
      const limites = LIMITES[body.plan] ?? LIMITES.STARTER

      const t = await tx.tenant.create({
        data: {
          nom: body.nomBoutique,
          sousDomaine: body.sousDomaine,
          plan: body.plan,
          prixMensuel: body.prixMensuel,
          dateDebutAbonnement: dateDebut,
          dateFinAbonnement: dateFin,
          telephone: body.telephone,
          emailContact: body.emailContact,
          adresse: body.adresse,
          notesAdmin: body.notesAdmin,
          actif: true,
          maxVendeurs: limites.maxVendeurs,
          maxProduits: limites.maxProduits,
          maxClients: limites.maxClients,
        },
      })

      await tx.user.create({
        data: {
          email: body.adminEmail,
          name: body.adminNom,
          password: hashedPassword,
          role: 'ADMIN',
          tenantId: t.id,
        },
      })

      return t
    })

    return NextResponse.json(tenant, { status: 201 })
  } catch (e: any) {
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: e.message ?? 'Erreur serveur' }, { status: 500 })
  }
}
