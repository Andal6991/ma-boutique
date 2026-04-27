'use client'
import { signOut, useSession } from 'next-auth/react'
import { LogOut, User, Bell, ChevronDown, ArrowLeftRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const roleLabel: Record<string, string> = { ADMIN: 'Admin', GERANT: 'Gérant', VENDEUR: 'Vendeur' }
interface Notif { id: string; type: string; titre: string; message: string }

export function Header({ user }: { user: { name?: string | null; email: string; role: string; tenantNom: string; toutesLesBoutiques?: { id: string; nom: string; role: string }[] } }) {
  const { update } = useSession()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [boutiquesOpen, setBoutiquesOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [nbNonLues, setNbNonLues] = useState(0)
  const [switching, setSwitching] = useState(false)

  const autresBoutiques = user.toutesLesBoutiques?.filter(b => b.id !== user.tenantId) ?? []

  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(d => {
      setNotifs(d.notifications ?? [])
      setNbNonLues(d.nbNonLues ?? 0)
    }).catch(() => {})
    const t = setInterval(() => {
      fetch('/api/notifications').then(r => r.json()).then(d => {
        setNotifs(d.notifications ?? []); setNbNonLues(d.nbNonLues ?? 0)
      }).catch(() => {})
    }, 120000)
    return () => clearInterval(t)
  }, [])

  async function switchBoutique(tenantId: string) {
    setSwitching(true)
    setBoutiquesOpen(false)
    await update({ tenantId })
    router.refresh()
    setSwitching(false)
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between pl-16 lg:pl-4 pr-3 shrink-0 gap-2">
      {/* Nom boutique + switch */}
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px] sm:max-w-[200px]">
          {user.tenantNom}
        </span>
        {autresBoutiques.length > 0 && (
          <div className="relative">
            <button onClick={() => { setBoutiquesOpen(o => !o); setMenuOpen(false); setNotifOpen(false) }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 whitespace-nowrap">
              <ArrowLeftRight className="w-3 h-3" />
              <span className="hidden sm:inline">Changer</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {boutiquesOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setBoutiquesOpen(false)} />
                <div className="absolute left-0 top-10 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-40 overflow-hidden">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase border-b border-gray-100">Mes boutiques</div>
                  <div className="py-1">
                    <div className="px-3 py-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-sm font-medium text-gray-900 truncate">{user.tenantNom}</span>
                      <span className="text-xs text-gray-400 ml-auto">actuelle</span>
                    </div>
                    {autresBoutiques.map(b => (
                      <button key={b.id} onClick={() => switchBoutique(b.id)} disabled={switching}
                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                        <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                        <span className="text-sm text-gray-700 truncate">{b.nom}</span>
                        <span className="text-xs text-gray-400 ml-auto shrink-0">{roleLabel[b.role]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Notifications */}
        <div className="relative">
          <button onClick={() => { setNotifOpen(o => !o); setMenuOpen(false); setBoutiquesOpen(false) }}
            className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            {nbNonLues > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                {nbNonLues > 9 ? '9+' : nbNonLues}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-12 w-80 max-w-[90vw] bg-white border border-gray-200 rounded-xl shadow-xl z-40 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">Alertes</p>
                  {nbNonLues > 0 && <span className="badge bg-red-100 text-red-700 text-xs">{nbNonLues} nouvelles</span>}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                  {notifs.length === 0 && <div className="px-4 py-6 text-center text-sm text-gray-400">Aucune alerte</div>}
                  {notifs.map(n => (
                    <div key={n.id} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-start gap-2">
                        <div className={'w-2 h-2 rounded-full mt-1.5 shrink-0 ' + (n.type === 'CREDIT_RETARD' ? 'bg-red-500' : 'bg-amber-500')} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800">{n.titre}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Menu utilisateur */}
        <div className="relative">
          <button onClick={() => { setMenuOpen(o => !o); setNotifOpen(false); setBoutiquesOpen(false) }}
            className="flex items-center gap-1.5 p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-tight max-w-[100px] truncate">{user.name ?? user.email}</p>
              <p className="text-xs text-gray-400">{roleLabel[user.role] ?? user.role}</p>
            </div>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-12 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-40">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  <p className="text-xs font-medium text-gray-700">{roleLabel[user.role]}</p>
                </div>
                <a href="/parametres" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                  <User className="w-4 h-4 text-gray-400" /> Mon profil
                </a>
                <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50">
                  <LogOut className="w-4 h-4" /> Se déconnecter
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
