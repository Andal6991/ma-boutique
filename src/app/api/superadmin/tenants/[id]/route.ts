// src/app/api/superadmin/tenants/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSuperAdminSession } from '@/lib/superadmin-auth'
import { prisma } from '@/lib/prisma'

async function guard() {
  const session = await getSuperAdminSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  return null
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const err = await guard(); if (err) return err

  try {
    const data = await req.json()
    
    // Limites selon le plan si changement de plan
    const LIMITES: Record<string, {maxVendeurs: number, maxProduits: number, maxClients: number}> = {
      STARTER: { maxVendeurs: 2, maxProduits: 100, maxClients: 200 },
      PRO: { maxVendeurs: 5, maxProduits: 500, maxClients: 1000 },
      ENTERPRISE: { maxVendeurs: 999999, maxProduits: 999999, maxClients: 999999 },
    }
    const limites = data.plan ? LIMITES[data.plan] : undefined

    const tenant = await prisma.tenant.update({
      where: { id: params.id },
      data: {
        nom: data.nom,
        telephone: data.telephone || null,
        emailContact: data.emailContact || null,
        plan: data.plan,
        prixMensuel: data.prixMensuel,
        notesAdmin: data.notesAdmin || null,
        ...(limites && {
          maxVendeurs: limites.maxVendeurs,
          maxProduits: limites.maxProduits,
          maxClients: limites.maxClients,
        }),
      },
    })
    return NextResponse.json(tenant)
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const err = await guard(); if (err) return err
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    include: { _count: { select: { users: true, clients: true, ventes: true } } },
  })
  if (!tenant) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  return NextResponse.json(tenant)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const err = await guard(); if (err) return err

  try {
    // Supprimer dans l'ordre pour éviter les erreurs de clé étrangère
    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      include: { users: true },
    })
    if (!tenant) return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })

    // Supprimer toutes les données liées
    await prisma.$transaction([
      prisma.commentaireVente.deleteMany({ where: { vente: { tenantId: params.id } } }),
      prisma.paiement.deleteMany({ where: { vente: { tenantId: params.id } } }),
      prisma.ligneVente.deleteMany({ where: { vente: { tenantId: params.id } } }),
      prisma.remboursement.deleteMany({ where: { credit: { client: { tenantId: params.id } } } }),
      prisma.credit.deleteMany({ where: { client: { tenantId: params.id } } }),
      prisma.vente.deleteMany({ where: { tenantId: params.id } }),
      prisma.pointFidelite.deleteMany({ where: { client: { tenantId: params.id } } }),
      prisma.fideliteClient.deleteMany({ where: { client: { tenantId: params.id } } }),
      prisma.client.deleteMany({ where: { tenantId: params.id } }),
      prisma.produit.deleteMany({ where: { tenantId: params.id } }),
      prisma.depense.deleteMany({ where: { tenantId: params.id } }),
      prisma.fournisseur.deleteMany({ where: { tenantId: params.id } }),
      prisma.notification.deleteMany({ where: { tenantId: params.id } }),
      prisma.user.deleteMany({ where: { tenantId: params.id } }),
      prisma.tenant.delete({ where: { id: params.id } }),
    ])

    return NextResponse.json({ ok: true, message: 'Boutique supprimée avec succès' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Erreur lors de la suppression' }, { status: 500 })
  }
}
