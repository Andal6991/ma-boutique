'use client'
// src/components/dashboard/DashboardClient.tsx
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, ShoppingCart, CreditCard, AlertTriangle, Package, ArrowUp, ArrowDown, Clock } from 'lucide-react'
import { formatMontant, formatDate } from '@/lib/utils'
import Link from 'next/link'

interface Stats {
  caJour: number; caMois: number; caMoisPrecedent: number
  nbVentesJour: number; encoursTotalCredits: number; depensesMois: number; beneficeNet: number
  nbCreditsEnRetard: number; nbAlerteStock: number
  ventesParJour: { date: string; montant: number }[]
  creditsEnRetard: { id: string; clientNom: string; soldeRestant: number; echeance: string; joursRetard: number }[]
  topProduits: { libelle: string; quantite: number; montant: number }[]
}

function StatCard({ label, value, sub, icon: Icon, color, trend }: any) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className={`text-xl font-bold truncate ${color ?? 'text-gray-900'}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2 rounded-xl shrink-0 ${color === 'text-red-600' ? 'bg-red-50' : color === 'text-amber-600' ? 'bg-amber-50' : 'bg-blue-50'}`}>
          <Icon className={`w-5 h-5 ${color === 'text-red-600' ? 'text-red-500' : color === 'text-amber-600' ? 'text-amber-500' : 'text-blue-500'}`} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {Math.abs(trend).toFixed(1)}% vs mois préc.
        </div>
      )}
    </div>
  )
}

const fmtDate = (d: string) => { const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth() + 1}` }

export function DashboardClient({ role }: { role: string }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => { setStats(d); setLoading(false) })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
  if (!stats) return null

  const trend = stats.caMoisPrecedent > 0 ? ((stats.caMois - stats.caMoisPrecedent) / stats.caMoisPrecedent) * 100 : 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500">Vue d'ensemble de votre activité</p>
      </div>

      {/* KPIs — 2 colonnes sur mobile, 4 sur desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="CA aujourd'hui" value={formatMontant(stats.caJour)}
          sub={`${stats.nbVentesJour} vente${stats.nbVentesJour > 1 ? 's' : ''}`} icon={ShoppingCart} />
        <StatCard label="CA du mois" value={formatMontant(stats.caMois)} sub="ce mois"
          icon={TrendingUp} trend={trend} />
        <StatCard label="Encours crédits" value={formatMontant(stats.encoursTotalCredits)}
          icon={CreditCard} color={stats.encoursTotalCredits > 0 ? 'text-amber-600' : 'text-gray-900'} />
        <StatCard label="Dépenses mois"
          value={formatMontant(stats.depensesMois ?? 0)}
          icon={TrendingUp}
          color={(stats.depensesMois ?? 0) > 0 ? 'text-red-600' : 'text-gray-900'} />
        <StatCard label="Bénéfice net"
          value={formatMontant(stats.beneficeNet ?? 0)}
          sub="CA - Dépenses"
          icon={TrendingUp}
          color={(stats.beneficeNet ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
        <StatCard label="Alertes"
          value={stats.nbCreditsEnRetard + stats.nbAlerteStock}
          sub={`${stats.nbCreditsEnRetard} crédits · ${stats.nbAlerteStock} stocks`}
          icon={AlertTriangle} color={stats.nbCreditsEnRetard > 0 ? 'text-red-600' : 'text-gray-900'} />
      </div>

      {/* Graphique — pleine largeur mobile */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Ventes ce mois (FCFA)</h2>
        {stats.ventesParJour.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.ventesParJour} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [formatMontant(v), 'Ventes']} labelFormatter={fmtDate} />
              <Bar dataKey="montant" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-36 text-gray-400 text-sm">Aucune vente ce mois</div>
        )}
      </div>

      {/* Top produits */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-400" /> Top produits
        </h2>
        <div className="space-y-2.5">
          {stats.topProduits.length === 0 && <p className="text-sm text-gray-400">Aucune donnée</p>}
          {stats.topProduits.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 w-4 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{p.libelle}</p>
                <p className="text-xs text-gray-400">{p.quantite} vendu{p.quantite > 1 ? 's' : ''}</p>
              </div>
              <span className="text-xs font-medium text-gray-600 shrink-0 ml-1">{formatMontant(p.montant)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Crédits en retard */}
      {stats.creditsEnRetard.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Retards ({stats.creditsEnRetard.length})
            </h2>
            <Link href="/credits?statut=EN_RETARD" className="text-xs text-blue-600 hover:underline">Voir tous →</Link>
          </div>
          {/* Scroll horizontal sur mobile */}
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="table-header">
                  <th className="text-left py-2 px-2 rounded-l-lg">Client</th>
                  <th className="text-right py-2 px-2">Solde dû</th>
                  <th className="text-center py-2 px-2">Échéance</th>
                  <th className="text-center py-2 px-2 rounded-r-lg">Retard</th>
                </tr>
              </thead>
              <tbody>
                {stats.creditsEnRetard.slice(0, 5).map(c => (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 px-2 font-medium text-gray-800 max-w-[120px] truncate">{c.clientNom}</td>
                    <td className="py-2 px-2 text-right font-semibold text-red-600 whitespace-nowrap">{formatMontant(c.soldeRestant)}</td>
                    <td className="py-2 px-2 text-center text-gray-500 whitespace-nowrap">{formatDate(c.echeance)}</td>
                    <td className="py-2 px-2 text-center">
                      <span className="badge bg-red-100 text-red-700 gap-1">
                        <Clock className="w-3 h-3" />{c.joursRetard}j
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
