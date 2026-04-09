'use client'
import { useState, useEffect } from 'react'
import { formatMontant, formatDate } from '@/lib/utils'
import { Users, TrendingUp, ShoppingCart, ChevronDown, ChevronUp, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import toast from 'react-hot-toast'

const PERIODES = [
  { val: 'mois', label: 'Ce mois' },
  { val: 'mois_prec', label: 'Mois precedent' },
  { val: 'annee', label: 'Cette annee' },
]
const COULEURS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6']
const roleBadge: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  GERANT: 'bg-blue-100 text-blue-700',
  VENDEUR: 'bg-gray-100 text-gray-700',
}

export default function RapportVendeursPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState('mois')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/rapports/vendeurs?periode=' + periode)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [periode])

  async function exporterCSV() {
    const res = await fetch('/api/rapports/export?type=ventes&periode=' + periode)
    if (!res.ok) { toast.error('Erreur export'); return }
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rapport-vendeurs-' + new Date().toISOString().slice(0, 10) + '.csv'
    a.click()
    toast.success('Export telecharge !')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )

  const vendeurs = data?.vendeurs ?? []
  const totaux = data?.totaux ?? {}
  const chartData = vendeurs.map((v: any, i: number) => ({
    nom: (v.vendeur.nom ?? '').split(' ')[0],
    ca: v.stats.totalCA,
    color: COULEURS[i % COULEURS.length],
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Rapport par vendeur</h1>
          <p className="text-sm text-gray-500">Performance de chaque membre de l'equipe</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input-field" style={{width:'160px'}} value={periode} onChange={e => setPeriode(e.target.value)}>
            {PERIODES.map(p => <option key={p.val} value={p.val}>{p.label}</option>)}
          </select>
          <button onClick={exporterCSV} className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-2.5">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl shrink-0"><TrendingUp className="w-5 h-5 text-blue-500" /></div>
          <div>
            <p className="text-xs text-gray-400">CA total</p>
            <p className="text-base font-bold text-blue-600">{formatMontant(totaux.ca ?? 0)}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-xl shrink-0"><ShoppingCart className="w-5 h-5 text-green-500" /></div>
          <div>
            <p className="text-xs text-gray-400">Ventes totales</p>
            <p className="text-base font-bold text-green-600">{totaux.ventes ?? 0}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl shrink-0"><Users className="w-5 h-5 text-indigo-500" /></div>
          <div>
            <p className="text-xs text-gray-400">Equipe</p>
            <p className="text-base font-bold text-indigo-600">{vendeurs.length} membre{vendeurs.length > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">CA par vendeur (FCFA)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="nom" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => (v/1000).toFixed(0) + 'k'} />
              <Tooltip formatter={(v: number) => [formatMontant(v), 'CA']} />
              <Bar dataKey="ca" radius={[4, 4, 0, 0]}>
                {chartData.map((_entry: any, i: number) => (
                  <Cell key={i} fill={COULEURS[i % COULEURS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="space-y-3">
        {vendeurs.length === 0 && (
          <div className="card p-10 text-center">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucune donnee pour cette periode</p>
          </div>
        )}
        {vendeurs.map((v: any, i: number) => {
          const isOpen = expanded === v.vendeur.id
          const pctCA = totaux.ca > 0 ? (v.stats.totalCA / totaux.ca) * 100 : 0
          return (
            <div key={v.vendeur.id} className="card overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: COULEURS[i % COULEURS.length] + '20', color: COULEURS[i % COULEURS.length] }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{v.vendeur.nom}</p>
                      <span className={'badge text-xs ' + (roleBadge[v.vendeur.role] ?? 'bg-gray-100 text-gray-700')}>
                        {v.vendeur.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{v.vendeur.email}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{pctCA.toFixed(0)}% du CA total</span>
                        <span>{v.stats.nbVentes} vente{v.stats.nbVentes > 1 ? 's' : ''}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full"
                          style={{ width: pctCA + '%', background: COULEURS[i % COULEURS.length] }} />
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-gray-900">{formatMontant(v.stats.totalCA)}</p>
                    <p className="text-xs text-gray-400">Panier moy. {formatMontant(v.stats.panierMoyen)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[
                    { label: 'Ventes', val: v.stats.nbVentes },
                    { label: 'Articles', val: v.stats.nbArticles },
                    { label: 'Encaisse', val: formatMontant(v.stats.totalEncaisse) },
                    { label: 'Annulations', val: v.stats.ventesAnnulees },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-400">{s.label}</p>
                      <p className="text-sm font-semibold text-gray-700 truncate">{s.val}</p>
                    </div>
                  ))}
                </div>

                {v.dernieresVentes.length > 0 && (
                  <button onClick={() => setExpanded(isOpen ? null : v.vendeur.id)}
                    className="mt-3 text-xs text-blue-600 flex items-center gap-1 hover:underline touch-manipulation">
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {isOpen ? 'Masquer' : 'Voir les dernieres ventes'}
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[380px]">
                      <thead>
                        <tr className="table-header border-b border-gray-200">
                          <th className="text-left py-2 px-4">Ticket</th>
                          <th className="text-left py-2 px-4">Client</th>
                          <th className="text-right py-2 px-4">Montant</th>
                          <th className="text-center py-2 px-4">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v.dernieresVentes.map((vente: any) => (
                          <tr key={vente.id} className="border-b border-gray-100 last:border-0 hover:bg-white">
                            <td className="py-2.5 px-4 font-mono text-xs text-gray-600">{vente.numero}</td>
                            <td className="py-2.5 px-4 text-sm text-gray-700 max-w-[100px] truncate">{vente.client}</td>
                            <td className="py-2.5 px-4 text-right font-semibold">{formatMontant(vente.montantTTC)}</td>
                            <td className="py-2.5 px-4 text-center text-xs text-gray-400 whitespace-nowrap">{formatDate(vente.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
