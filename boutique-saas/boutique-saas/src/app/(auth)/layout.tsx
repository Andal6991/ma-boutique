// src/app/(auth)/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ma Boutique — Connexion',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
