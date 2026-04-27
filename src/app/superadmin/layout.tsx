// src/app/superadmin/layout.tsx
import { getSuperAdminSession } from '@/lib/superadmin-auth'
import { redirect } from 'next/navigation'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
