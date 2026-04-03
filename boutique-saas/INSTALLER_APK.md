# Installer Ma Boutique sur votre téléphone Android

## Méthode 1 — Installation directe via Chrome (la plus simple)

1. Ouvrez Chrome sur votre téléphone Android
2. Allez sur l'URL de votre application (ex: http://192.168.X.X:3000)
3. Attendez quelques secondes que la page charge complètement
4. Chrome affiche automatiquement une bannière "Ajouter à l'écran d'accueil"
   - OU appuyez sur les 3 points ⋮ → "Ajouter à l'écran d'accueil"
5. Confirmez → l'icône "Ma Boutique" apparaît sur votre bureau
6. Ouvrez-la : elle fonctionne comme une vraie app (sans barre d'adresse)

## Méthode 2 — Générer un vrai APK via PWABuilder (Play Store)

### Étape 1 — Déployer l'app sur internet
(Nécessaire car PWABuilder doit accéder à votre app en ligne)
- Déployer sur Vercel : vercel.com → importer le projet GitHub
- OU utiliser Ngrok temporairement pour le test

### Étape 2 — Générer l'APK
1. Allez sur : https://www.pwabuilder.com
2. Entrez l'URL de votre app déployée
3. Cliquez "Package for stores"
4. Choisissez "Android" → "Build My PWA"
5. Téléchargez le fichier .apk généré

### Étape 3 — Installer l'APK sur Android
1. Transférez le fichier .apk sur votre téléphone (USB ou WhatsApp)
2. Ouvrez le fichier → "Installer" (autoriser les sources inconnues si demandé)
3. L'app "Ma Boutique" est installée !

### Étape 4 — Publier sur le Play Store (optionnel)
1. Créez un compte Google Play Console (25$ une fois)
2. Uploadez l'APK généré par PWABuilder
3. Remplissez les informations (description, captures d'écran)
4. Soumettez pour validation (2-3 jours)

## Notes importantes
- L'app fonctionne hors ligne une fois installée
- La licence est vérifiée à la reconnexion
- Les données restent sur l'appareil si pas de connexion
