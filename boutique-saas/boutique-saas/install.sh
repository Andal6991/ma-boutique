#!/bin/bash
# install.sh — Installation automatique de BoutiqueManager

set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     BoutiqueManager — Installation   ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé."
    echo "   Téléchargez-le sur : https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ requis. Version actuelle : $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) détecté"
echo ""

# Installation des dépendances
echo "📦 Installation des dépendances npm..."
npm install --silent
echo "✅ Dépendances installées"
echo ""

# Configuration base de données
echo "🗄️  Configuration de la base de données SQLite..."
npx prisma db push --skip-generate 2>/dev/null || npx prisma db push
echo "✅ Base de données configurée"
echo ""

# Seed
echo "🌱 Chargement des données de démonstration..."
npx tsx prisma/seed.ts
echo ""

echo "╔══════════════════════════════════════╗"
echo "║           ✅ Prêt à démarrer !        ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "  Lancez l'application avec :"
echo ""
echo "    npm run dev"
echo ""
echo "  Puis ouvrez : http://localhost:3000"
echo ""
echo "  Comptes de test :"
echo "    admin@boutique.com   / admin123"
echo "    gerant@boutique.com  / gerant123"
echo "    vendeur@boutique.com / vendeur123"
echo ""
