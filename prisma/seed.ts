// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Créer le tenant principal
  const tenant = await prisma.tenant.upsert({
    where: { sousDomaine: 'demo' },
    update: {},
    create: {
      nom: 'Boutique Demo',
      sousDomaine: 'demo',
      plan: 'PRO',
    },
  })

  // Créer les utilisateurs
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@boutique.com' },
    update: {},
    create: {
      email: 'admin@boutique.com',
      name: 'Administrateur',
      password: adminPassword,
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  })

  const gerantPassword = await bcrypt.hash('gerant123', 10)
  await prisma.user.upsert({
    where: { email: 'gerant@boutique.com' },
    update: {},
    create: {
      email: 'gerant@boutique.com',
      name: 'Amadou Diallo',
      password: gerantPassword,
      role: 'GERANT',
      tenantId: tenant.id,
    },
  })

  const vendeurPassword = await bcrypt.hash('vendeur123', 10)
  await prisma.user.upsert({
    where: { email: 'vendeur@boutique.com' },
    update: {},
    create: {
      email: 'vendeur@boutique.com',
      name: 'Fatima Ouédraogo',
      password: vendeurPassword,
      role: 'VENDEUR',
      tenantId: tenant.id,
    },
  })

  // Créer les catégories
  const catAlimentaire = await prisma.categorie.create({
    data: { nom: 'Alimentaire', tenantId: tenant.id },
  })
  const catHygiene = await prisma.categorie.create({
    data: { nom: 'Hygiène & Beauté', tenantId: tenant.id },
  })
  const catMenage = await prisma.categorie.create({
    data: { nom: 'Ménage', tenantId: tenant.id },
  })

  // Créer les produits
  const produits = await Promise.all([
    prisma.produit.create({
      data: {
        reference: 'ALI001', libelle: 'Sucre cristallisé 1kg', prixHT: 650,
        stock: 120, stockMin: 20, unite: 'kg',
        tenantId: tenant.id, categorieId: catAlimentaire.id,
      },
    }),
    prisma.produit.create({
      data: {
        reference: 'ALI002', libelle: 'Huile de palme 1L', prixHT: 1100,
        stock: 60, stockMin: 15, unite: 'litre',
        tenantId: tenant.id, categorieId: catAlimentaire.id,
      },
    }),
    prisma.produit.create({
      data: {
        reference: 'ALI003', libelle: 'Farine de blé 5kg', prixHT: 3200,
        stock: 40, stockMin: 10, unite: 'sac',
        tenantId: tenant.id, categorieId: catAlimentaire.id,
      },
    }),
    prisma.produit.create({
      data: {
        reference: 'ALI004', libelle: 'Riz local 25kg', prixHT: 14500,
        stock: 8, stockMin: 5, unite: 'sac',
        tenantId: tenant.id, categorieId: catAlimentaire.id,
      },
    }),
    prisma.produit.create({
      data: {
        reference: 'HYG001', libelle: 'Savon de Marseille 200g', prixHT: 350,
        stock: 200, stockMin: 30, unite: 'pièce',
        tenantId: tenant.id, categorieId: catHygiene.id,
      },
    }),
    prisma.produit.create({
      data: {
        reference: 'HYG002', libelle: 'Lessive Ariel 500g', prixHT: 1800,
        stock: 45, stockMin: 10, unite: 'pièce',
        tenantId: tenant.id, categorieId: catHygiene.id,
      },
    }),
    prisma.produit.create({
      data: {
        reference: 'MEN001', libelle: 'Eau de Javel 1L', prixHT: 500,
        stock: 3, stockMin: 10, unite: 'litre',
        tenantId: tenant.id, categorieId: catMenage.id,
      },
    }),
  ])

  // Créer des clients
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        nom: 'Koné', prenom: 'Fatou', telephone: '+226 70 11 22 33',
        email: 'fatou.kone@email.com', creditMax: 50000, encours: 32500,
        tenantId: tenant.id,
      },
    }),
    prisma.client.create({
      data: {
        nom: 'Ouédraogo', prenom: 'Idrissa', telephone: '+226 76 44 55 66',
        creditMax: 75000, encours: 18000,
        tenantId: tenant.id,
      },
    }),
    prisma.client.create({
      data: {
        nom: 'Traoré', prenom: 'Mariam', telephone: '+226 65 77 88 99',
        creditMax: 100000, encours: 55000,
        tenantId: tenant.id,
      },
    }),
    prisma.client.create({
      data: {
        nom: 'Diallo', prenom: 'Salif', telephone: '+226 70 22 33 44',
        creditMax: 30000, encours: 0,
        tenantId: tenant.id,
      },
    }),
    prisma.client.create({
      data: {
        nom: 'Sawadogo', prenom: 'Bibata', telephone: '+226 78 55 66 77',
        creditMax: 80000, encours: 75000,
        tenantId: tenant.id,
      },
    }),
  ])

  // Créer quelques ventes et crédits
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15)
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 10)

  // Vente 1 — Fatou Koné, crédit en retard
  const vente1 = await prisma.vente.create({
    data: {
      numero: 'V-2025-001',
      montantHT: 32500, montantTTC: 32500, montantPaye: 0,
      statut: 'EN_ATTENTE',
      tenantId: tenant.id, clientId: clients[0].id, userId: admin.id,
      createdAt: twoMonthsAgo,
      lignes: {
        create: [
          { quantite: 5, prixUnitaire: 3200, produitId: produits[2].id },
          { quantite: 10, prixUnitaire: 1100, produitId: produits[1].id },
          { quantite: 10, prixUnitaire: 650, produitId: produits[0].id },
        ],
      },
    },
  })
  await prisma.credit.create({
    data: {
      montantInitial: 32500, soldeRestant: 32500,
      echeance: lastMonth,
      statut: 'EN_RETARD',
      clientId: clients[0].id, venteId: vente1.id,
      createdAt: twoMonthsAgo,
    },
  })

  // Vente 2 — Mariam Traoré, crédit en retard
  const vente2 = await prisma.vente.create({
    data: {
      numero: 'V-2025-002',
      montantHT: 55000, montantTTC: 55000, montantPaye: 0,
      statut: 'EN_ATTENTE',
      tenantId: tenant.id, clientId: clients[2].id, userId: admin.id,
      createdAt: twoMonthsAgo,
      lignes: {
        create: [
          { quantite: 3, prixUnitaire: 14500, produitId: produits[3].id },
          { quantite: 5, prixUnitaire: 1600, produitId: produits[5].id },
        ],
      },
    },
  })
  await prisma.credit.create({
    data: {
      montantInitial: 55000, soldeRestant: 55000,
      echeance: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      statut: 'EN_RETARD',
      clientId: clients[2].id, venteId: vente2.id,
      createdAt: twoMonthsAgo,
    },
  })

  // Vente 3 — Bibata Sawadogo, crédit en cours avec remboursement partiel
  const vente3 = await prisma.vente.create({
    data: {
      numero: 'V-2025-003',
      montantHT: 100000, montantTTC: 100000, montantPaye: 25000,
      statut: 'PARTIELLEMENT_PAYEE',
      tenantId: tenant.id, clientId: clients[4].id, userId: admin.id,
      lignes: {
        create: [
          { quantite: 6, prixUnitaire: 14500, produitId: produits[3].id },
          { quantite: 10, prixUnitaire: 1100, produitId: produits[1].id },
        ],
      },
    },
  })
  const credit3 = await prisma.credit.create({
    data: {
      montantInitial: 100000, soldeRestant: 75000,
      echeance: new Date(now.getFullYear(), now.getMonth() + 1, 30),
      statut: 'EN_COURS',
      clientId: clients[4].id, venteId: vente3.id,
    },
  })
  await prisma.remboursement.create({
    data: {
      montant: 25000, mode: 'ESPECES',
      creditId: credit3.id,
    },
  })
  await prisma.paiement.create({
    data: { montant: 25000, mode: 'ESPECES', venteId: vente3.id },
  })

  // Quelques ventes payées pour les stats
  for (let i = 4; i <= 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), i)
    await prisma.vente.create({
      data: {
        numero: `V-2025-00${i}`,
        montantHT: Math.floor(Math.random() * 50000 + 10000),
        montantTTC: Math.floor(Math.random() * 50000 + 10000),
        montantPaye: Math.floor(Math.random() * 50000 + 10000),
        statut: 'PAYEE',
        tenantId: tenant.id,
        userId: admin.id,
        createdAt: date,
        lignes: {
          create: [{ quantite: 2, prixUnitaire: 1100, produitId: produits[1].id }],
        },
      },
    })
  }

  console.log('✅ Seed terminé !')
  console.log('')
  console.log('Comptes de test :')
  console.log('  admin@boutique.com    / admin123  (Admin)')
  console.log('  gerant@boutique.com   / gerant123 (Gérant)')
  console.log('  vendeur@boutique.com  / vendeur123 (Vendeur)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
