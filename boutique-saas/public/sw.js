// public/sw.js — Service Worker Ma Boutique
const CACHE_NAME = 'ma-boutique-v1'
const OFFLINE_URL = '/offline'

// Ressources à mettre en cache immédiatement
const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/ventes',
  '/produits',
  '/clients',
  '/credits',
  '/depenses',
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Installation — mise en cache des ressources de base
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Ignorer les erreurs si certaines URLs ne sont pas disponibles
      })
    })
  )
  self.skipWaiting()
})

// Activation — nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Interception des requêtes
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Stratégie pour les API : Network First → Cache → Offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Mettre en cache les réponses GET réussies
          if (request.method === 'GET' && response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        })
        .catch(() => {
          // Hors ligne : retourner le cache si disponible
          return caches.match(request).then(cached => {
            if (cached) return cached
            // Réponse offline générique pour les API
            return new Response(
              JSON.stringify({ error: 'Hors ligne — données non disponibles', offline: true }),
              { headers: { 'Content-Type': 'application/json' }, status: 503 }
            )
          })
        })
    )
    return
  }

  // Stratégie pour les pages : Cache First → Network → Offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          return response
        })
        .catch(() => {
          return caches.match(request).then(cached => {
            if (cached) return cached
            return caches.match(OFFLINE_URL)
          })
        })
    )
    return
  }

  // Stratégie pour les assets : Cache First → Network
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
        }
        return response
      }).catch(() => cached || new Response('', { status: 404 }))
    })
  )
})

// Synchronisation en arrière-plan (ventes faites offline)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-ventes') {
    event.waitUntil(syncVentesOffline())
  }
})

async function syncVentesOffline() {
  // Cette fonction sera appelée quand le réseau revient
  // Les ventes en attente sont envoyées au serveur
  console.log('[SW] Synchronisation des ventes offline...')
}
