'use client'
// src/components/layout/Providers.tsx
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('[PWA] Service Worker enregistré:', reg.scope))
        .catch(err => console.log('[PWA] Erreur SW:', err))
    }
  }, [])

  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { fontSize: '14px' },
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />
    </SessionProvider>
  )
}
