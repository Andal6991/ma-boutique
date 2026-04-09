'use client'
// src/components/layout/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Package, Users, ShoppingCart,
  CreditCard, BarChart3, ShoppingBag, Settings, X, Menu,
  UserCog, Wallet, PlusCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'GERANT', 'VENDEUR'] },
  { href: '/ventes', label: 'Caisse / Ventes', icon: ShoppingCart, roles: ['ADMIN', 'GERANT', 'VENDEUR'] },
  { href: '/produits', label: 'Produits', icon: Package, roles: ['ADMIN', 'GERANT'] },
  { href: '/clients', label: 'Clients', icon: Users, roles: ['ADMIN', 'GERANT', 'VENDEUR'] },
  { href: '/credits', label: 'Crédits clients', icon: CreditCard, roles: ['ADMIN', 'GERANT'] },
  { href: '/fournisseurs', label: 'Fournisseurs', icon: Package, roles: ['ADMIN', 'GERANT'] },
  { href: '/depenses', label: 'Dépenses', icon: Wallet, roles: ['ADMIN', 'GERANT'] },
  { href: '/employes', label: 'Employés', icon: UserCog, roles: ['ADMIN'] },
  { href: '/demande-boutique', label: '+ 2e boutique', icon: PlusCircle, roles: ['ADMIN'] },
  { href: '/rapports', label: 'Rapports', icon: BarChart3, roles: ['ADMIN', 'GERANT'] },
  { href: '/rapports/vendeurs', label: 'Perf. vendeurs', icon: Users, roles: ['ADMIN', 'GERANT'] },
]

function NavContent({ role, pathname, onClose }: { role: string; pathname: string; onClose?: () => void }) {
  return (
    <>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <p className="font-semibold text-gray-900 text-sm">Ma Boutique</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.filter(i => i.roles.includes(role)).map(item => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} onClick={onClose}
              className={cn('flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors',
                active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100')}>
              <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-blue-600' : 'text-gray-400')} />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-gray-200">
        <Link href="/parametres" onClick={onClose}
          className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
          <Settings className="w-5 h-5 text-gray-400" /> Paramètres
        </Link>
      </div>
    </>
  )
}

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Bouton hamburger mobile */}
      <button onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm text-gray-600 touch-manipulation">
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-gray-200 flex-col shrink-0">
        <NavContent role={role} pathname={pathname} />
      </aside>

      {/* Overlay mobile */}
      {open && <div className="lg:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setOpen(false)} />}

      {/* Drawer mobile */}
      <aside className={cn(
        'lg:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] bg-white z-50 flex flex-col shadow-xl transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <NavContent role={role} pathname={pathname} onClose={() => setOpen(false)} />
      </aside>
    </>
  )
}
