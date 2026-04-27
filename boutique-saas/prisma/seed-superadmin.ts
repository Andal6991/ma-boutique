// prisma/seed-superadmin.ts
// Exécuter une seule fois : npx tsx prisma/seed-superadmin.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('SuperAdmin2025!', 10)

  const sa = await prisma.superAdmin.upsert({
    where: { email: 'superadmin@boutique-manager.com' },
    update: {},
    create: {
      email: 'superadmin@boutique-manager.com',
      password,
      nom: 'Super Administrateur',
    },
  })

  // Mettre à jour le tenant démo avec des dates d'abonnement
  await prisma.tenant.updateMany({
    where: { sousDomaine: 'demo' },
    data: {
      dateDebutAbonnement: new Date(),
      dateFinAbonnement: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours
      plan: 'PRO',
      prixMensuel: 15000,
      emailContact: 'demo@boutique.com',
      telephone: '+226 70 00 00 00',
    },
  })

  console.log('✅ SuperAdmin créé :')
  console.log('   Email    :', sa.email)
  console.log('   Password : SuperAdmin2025!')
  console.log('   URL      : http://localhost:3000/superadmin/login')
}

main().catch(console.error).finally(() => prisma.$disconnect())
