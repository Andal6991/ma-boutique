'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMontant, formatDate } from '@/lib/utils'
import { TrendingUp, Users, Package, BarChart3, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RapportsPage() {
  const [stats, setStats] = useState<any>(null)
  const [exportLoading, setExportLoading] = useState('')

  useEffect(() => { fetch('/api/dashboard').then(r => r.json()).then(setStats) }, [])

  async function exporter(type: string, periode: string) {
    setExportLoading(type + '-' + periode)
    try {
      const res = await fetch('/api/rapports/export?type=' + type + '&periode=' + periode)
      if (!res.ok) { toast.error('Erreur export'); return }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = type + '_' + new Date().toISOString().slice(0,10) + '.csv'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Export telechargé !')
    } finally {
      setExportLoading('')
    }
  }

  if (!stats) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>

  const fmt = (d: string) => { const dt = new Date(d); return dt.getDate() + '/' + (dt.getMonth() + 1) }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Rapports</h1>
        <p className="text-sm text-gray-500">Donnees du mois en cours</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'CA ce mois', value: formatMontant(stats.caMois), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: "Ventes aujourd'hui", value: stats.nbVentesJour, icon: BarChart3, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Credits en retard', value: stats.nbCreditsEnRetard, icon: Users, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Alertes stock', value: stats.nbAlerteStock, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(s => (
          <div key={s.label} className="card p-3 flex items-center gap-3">
            <div className={'p-2 rounded-xl shrink-0 ' + s.bg}><s.icon className={'w-5 h-5 ' + s.color} /></div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 truncate">{s.label}</p>
              <p className={'text-lg font-bold ' + s.color}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* EXPORTS CSV */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Download className="w-4 h-4 text-gray-400" /> Exporter les donnees
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { type: 'ventes', periode: 'mois', label: 'Ventes — ce mois', icon: '📊' },
            { type: 'ventes', periode: 'mois_prec', label: 'Ventes — mois precedent', icon: '📊' },
            { type: 'credits', periode: 'tous', label: 'Tous les credits', icon: '💳' },
            { type: 'ventes', periode: 'annee', label: 'Ventes — annee en cours', icon: '📈' },
          ].map(e => (
            <button key={e.type + e.periode} onClick={() => exporter(e.type, e.periode)}
              disabled={exportLoading === e.type + '-' + e.periode}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-left disabled:opacity-50 touch-manipulation">
              <span style={{fontSize:'20px'}}>{e.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-800">{e.label}</p>
                <p className="text-xs text-gray-400">Fichier CSV - Excel compatible</p>
              </div>
              <Download className="w-4 h-4 text-gray-400 ml-auto shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Graphique CA */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">CA ce mois (FCFA)</h2>
        {stats.ventesParJour.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.ventesParJour} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v/1000).toFixed(0) + 'k'} />
              <Tooltip formatter={(v: number) => [formatMontant(v), 'CA']} labelFormatter={fmt} />
              <Bar dataKey="montant" fill="#3b82f6" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-36 text-gray-300 text-sm">Pas de donnees</div>
        )}
      </div>

      {/* Top produits */}
      {stats.topProduits.length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Top produits</h2>
          {stats.topProduits.map((p: any, i: number) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <span className="text-xs font-bold text-gray-400 w-4 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{p.libelle}</p>
                <p className="text-xs text-gray-400">{p.quantite} vendu{p.quantite > 1 ? 's' : ''}</p>
              </div>
              <span className="text-sm font-semibold text-gray-700 shrink-0 whitespace-nowrap">{formatMontant(p.montant)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Clients a risque */}
      {stats.creditsEnRetard.length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-red-600 mb-3">Clients a risque</h2>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm min-w-[340px]">
              <thead>
                <tr className="table-header">
                  <th className="text-left py-2 px-2">Client</th>
                  <th className="text-right py-2 px-2">Solde</th>
                  <th className="text-center py-2 px-2">Retard</th>
                </tr>
              </thead>
              <tbody>
                {stats.creditsEnRetard.map((c: any) => (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 px-2 font-medium text-gray-800 max-w-[120px] truncate">{c.clientNom}</td>
                    <td className="py-2 px-2 text-right font-bold text-red-600 whitespace-nowrap">{formatMontant(c.soldeRestant)}</td>
                    <td className="py-2 px-2 text-center">
                      <span className="badge bg-red-100 text-red-700">{c.joursRetard}j</span>
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
