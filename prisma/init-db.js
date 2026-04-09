// prisma/init-db.js
// Script d'initialisation compatible Node.js sans tsx
const { execSync } = require('child_process')

try {
  console.log('🔄 Création des tables...')
  execSync('npx prisma db push --force-reset', { stdio: 'inherit' })
  console.log('✅ Tables créées')
} catch(e) {
  console.log('Tables déjà existantes ou erreur:', e.message)
}
