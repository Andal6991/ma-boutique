# BoutiqueManager — Application SaaS de gestion de boutique

Application web complète de gestion de boutique : produits, ventes, clients et crédits.

## Stack technique

- **Framework** : Next.js 14 (App Router, full-stack)
- **Base de données** : SQLite via Prisma ORM
- **Authentification** : NextAuth.js (credentials)
- **UI** : Tailwind CSS + Radix UI + Lucide Icons
- **Graphiques** : Recharts

---

## Installation rapide

### Prérequis
- Node.js 18+ installé ([nodejs.org](https://nodejs.org))
- npm ou yarn

### Étapes

```bash
# 1. Aller dans le dossier du projet
cd boutique-saas

# 2. Installer les dépendances
npm install

# 3. Configurer la base de données
npm run db:push

# 4. Charger les données de démonstration
npm run db:seed

# 5. Lancer le serveur de développement
npm run dev
```

Ouvrir ensuite **http://localhost:3000** dans votre navigateur.

---

## Comptes de démonstration

| Email | Mot de passe | Rôle |
|---|---|---|
| admin@boutique.com | admin123 | Administrateur |
| gerant@boutique.com | gerant123 | Gérant |
| vendeur@boutique.com | vendeur123 | Vendeur |

---

## Fonctionnalités

### Dashboard
- KPIs : CA du jour, CA du mois, encours crédits, alertes
- Graphique des ventes par jour
- Top 5 produits vendus
- Liste des crédits en retard

### Caisse / Ventes
- Recherche rapide de produits
- Panier interactif avec ajustement des quantités
- Sélection du client (optionnel)
- Remise globale
- Multi-modes de paiement (espèces, mobile money, chèque, virement, crédit)
- Paiement à crédit avec date d'échéance
- Historique des ventes

### Produits
- CRUD complet (créer, modifier, supprimer)
- Suivi du stock avec alertes visuelles
- Seuil d'alerte personnalisable par produit
- Catégories
- Recherche par référence ou libellé

### Clients
- Fiche client complète
- Plafond de crédit personnalisable
- Suivi de l'encours en temps réel
- Historique des achats
- Vue des crédits actifs

### Crédits clients
- Liste avec filtres (en cours, en retard, soldés)
- Barre de progression du remboursement
- Remboursements partiels avec mode de paiement
- Détection automatique des retards
- Historique des remboursements

### Rapports
- CA du mois (graphique)
- Top produits (graphique horizontal)
- Tableau des clients à risque

---

## Permissions par rôle

| Action | Admin | Gérant | Vendeur |
|---|:---:|:---:|:---:|
| Voir le dashboard | ✅ | ✅ | ✅ |
| Créer une vente | ✅ | ✅ | ✅ |
| Gérer les produits | ✅ | ✅ | ❌ |
| Supprimer un produit | ✅ | ❌ | ❌ |
| Gérer les clients | ✅ | ✅ | ✅ (lecture) |
| Gérer les crédits | ✅ | ✅ | ❌ |
| Voir les rapports | ✅ | ✅ | ❌ |

---

## Structure du projet

```
boutique-saas/
├── prisma/
│   ├── schema.prisma       # Schéma de la base de données
│   └── seed.ts             # Données de démonstration
├── src/
│   ├── app/
│   │   ├── api/            # Routes API (backend)
│   │   │   ├── auth/       # NextAuth
│   │   │   ├── produits/   # CRUD produits
│   │   │   ├── clients/    # CRUD clients
│   │   │   ├── ventes/     # Ventes + paiements
│   │   │   ├── credits/    # Crédits + remboursements
│   │   │   └── dashboard/  # Statistiques
│   │   ├── (auth)/
│   │   │   └── login/      # Page de connexion
│   │   └── (dashboard)/    # Pages protégées
│   │       ├── dashboard/
│   │       ├── produits/
│   │       ├── clients/
│   │       ├── ventes/
│   │       ├── credits/
│   │       └── rapports/
│   ├── components/
│   │   ├── layout/         # Sidebar, Header, Providers
│   │   └── dashboard/      # Composants du dashboard
│   ├── lib/
│   │   ├── auth.ts         # Config NextAuth
│   │   ├── prisma.ts       # Client Prisma singleton
│   │   └── utils.ts        # Utilitaires
│   └── types/
│       └── index.ts        # Types TypeScript
└── .env                    # Variables d'environnement
```

---

## Commandes utiles

```bash
# Lancer en développement
npm run dev

# Voir la base de données graphiquement
npm run db:studio

# Réinitialiser la BDD et recharger les données de démo
npm run db:reset

# Builder pour la production
npm run build
npm start
```

---

## Déploiement (après les tests)

### Option 1 — Vercel (recommandé)
1. Pousser le projet sur GitHub
2. Importer sur [vercel.com](https://vercel.com)
3. Ajouter les variables d'environnement
4. Changer `DATABASE_URL` pour PostgreSQL (ex: Neon, Supabase)
5. Changer le provider dans `schema.prisma` : `provider = "postgresql"`

### Option 2 — VPS (Ubuntu)
```bash
# Sur le serveur
git clone <votre-repo>
cd boutique-saas
npm install
npm run build
# Configurer nginx + PM2
pm2 start npm --name boutique -- start
```

---

## Variables d'environnement

```env
DATABASE_URL="file:./dev.db"                    # SQLite local
NEXTAUTH_SECRET="changez-ce-secret-en-prod"     # Secret JWT (min 32 chars)
NEXTAUTH_URL="http://localhost:3000"             # URL de l'app
```

---

## Support et évolutions prévues

- [ ] Impression thermique des tickets (58mm/80mm)
- [ ] Notifications SMS pour alertes crédit
- [ ] Export Excel des rapports
- [ ] Application mobile (React Native)
- [ ] Multi-devises
- [ ] Gestion des fournisseurs
