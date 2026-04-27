// src/app/api/ventes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ligneSchema = z.object({
  produitId: z.string(),
  quantite: z.number().int().positive(),
  prixUnitaire: z.number().positive(),
  remiseLigne: z.number().min(0).default(0),
})

const paiementSchema = z.object({
  montant: z.number().positive(),
  mode: z.enum(['ESPECES', 'MOBILE_MONEY', 'CHEQUE', 'VIREMENT', 'CREDIT']),
  reference: z.string().optional(),
})

const venteSchema = z.object({
  clientId: z.string().optional(),
  remise: z.number().min(0).default(0),
  lignes: z.array(ligneSchema).min(1),
  paiements: z.array(paiementSchema).default([]),
  // Si crédit : date d'échéance
  echeanceCredit: z.string().optional(),
  notesCredit: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q') ?? ''
  const statut = searchParams.get('statut')
  const clientId = searchParams.get('clientId')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 20

  const ventes = await prisma.vente.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(search && { numero: { contains: search } }),
      ...(statut && { statut }),
      ...(clientId && { clientId }),
    },
    include: {
      client: { select: { nom: true, prenom: true } },
      user: { select: { name: true } },
      lignes: { include: { produit: { select: { libelle: true, reference: true } } } },
      paiements: true,
      credit: { select: { id: true, soldeRestant: true, statut: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })

  const total = await prisma.vente.count({
    where: { tenantId: session.user.tenantId, ...(statut && { statut }), ...(clientId && { clientId }) },
  })

  return NextResponse.json({ ventes, total, page, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const body = venteSchema.parse(await req.json())
    const tenantId = session.user.tenantId

    // Calculer les montants
    let montantHT = 0
    for (const ligne of body.lignes) {
      montantHT += (ligne.prixUnitaire * ligne.quantite) - ligne.remiseLigne
    }
    const montantApresRemise = montantHT - body.remise
    const montantTTC = montantApresRemise // TVA simplifiée

    const montantPaye = body.paiements
      .filter(p => p.mode !== 'CREDIT')
      .reduce((s, p) => s + p.montant, 0)

    const montantCredit = body.paiements
      .filter(p => p.mode === 'CREDIT')
      .reduce((s, p) => s + p.montant, 0)

    let statut = 'EN_ATTENTE'
    if (montantPaye >= montantTTC) statut = 'PAYEE'
    else if (montantPaye > 0) statut = 'PARTIELLEMENT_PAYEE'

    // Vérifier le stock
    for (const ligne of body.lignes) {
      const produit = await prisma.produit.findFirst({
        where: { id: ligne.produitId, tenantId },
      })
      if (!produit) throw new Error(`Produit ${ligne.produitId} introuvable`)
      if (produit.stock < ligne.quantite) {
        throw new Error(`Stock insuffisant pour ${produit.libelle} (dispo: ${produit.stock})`)
      }
    }

    // Génération numéro robuste — cherche le MAX existant pour éviter les doublons
    const annee = new Date().getFullYear()
    const ventesAnnee = await prisma.vente.findMany({
      where: { tenantId, numero: { startsWith: `V-${annee}-` } },
      select: { numero: true },
    })
    let maxSeq = 0
    for (const v of ventesAnnee) {
      const parts = v.numero.split('-')
      const seq = parseInt(parts[2] ?? '0')
      if (seq > maxSeq) maxSeq = seq
    }
    const numero = `V-${annee}-${(maxSeq + 1).toString().padStart(4, '0')}`

    // Transaction atomique
    const vente = await prisma.$transaction(async tx => {
      // Créer la vente
      const v = await tx.vente.create({
        data: {
          numero, montantHT, montantTTC, remise: body.remise,
          montantPaye, statut, tenantId,
          clientId: body.clientId ?? null,
          userId: session.user.id,
          lignes: {
            create: body.lignes.map(l => ({
              produitId: l.produitId,
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire,
              remiseLigne: l.remiseLigne,
            })),
          },
          paiements: {
            create: body.paiements.map(p => ({
              montant: p.montant, mode: p.mode, reference: p.reference,
            })),
          },
        },
        include: {
          lignes: { include: { produit: true } },
          paiements: true,
          client: true,
        },
      })

      // Décrémenter le stock
      for (const ligne of body.lignes) {
        await tx.produit.update({
          where: { id: ligne.produitId },
          data: { stock: { decrement: ligne.quantite } },
        })
      }

      // Créer le crédit si applicable
      if (montantCredit > 0 && body.clientId && body.echeanceCredit) {
        const credit = await tx.credit.create({
          data: {
            montantInitial: montantCredit,
            soldeRestant: montantCredit,
            echeance: new Date(body.echeanceCredit),
            statut: 'EN_COURS',
            notes: body.notesCredit,
            clientId: body.clientId,
            venteId: v.id,
          },
        })

        // Mettre à jour l'encours du client
        await tx.client.update({
          where: { id: body.clientId },
          data: { encours: { increment: montantCredit } },
        })
      }

      return v
    })

    return NextResponse.json(vente, { status: 201 })
  } catch (e: any) {
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: e.message ?? 'Erreur serveur' }, { status: 500 })
  }
}
