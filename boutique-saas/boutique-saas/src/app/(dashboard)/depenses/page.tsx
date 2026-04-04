'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Wallet, TrendingDown, Search } from 'lucide-react'
import { formatMontant, formatDate } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const CATEGORIES = [
  { val: 'LOYER', label: 'Loyer / Bail', color: '#6366f1' },
  { val: 'ELECTRICITE', label: 'Electricité', color: '#f59e0b' },
  { val: 'INTERNET', label: 'Internet / Téléphone', color: '#3b82f6' },
  { val: 'SALAIRE', label: 'Salaires', color: '#10b981' },
  { val: 'TRANSPORT', label: 'Transport', color: '#f97316' },
  { val: 'FOURNITURE', label: 'Fournitures', color: '#8b5cf6' },
  { val: 'AUTRE', label: 'Autre', color: '#6b7280' },
]
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.val, c]))
const moisActuel = new Date().toISOString().slice(0, 7)

const EMPTY = { libelle: '', montant: '', categorie: 'AUTRE', date: new Date().toISOString().slice(0, 10), notes: '' }

export default function DepensesPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const [data, setData] = useState<{ depenses: any[]; parCategorie: Record<string, number>; totalMois: number } | null>(null)
  const [mois, setMois] = useState(moisActuel)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  async function fetchD() {
    setLoading(true)
    const r = await fetch('/api/depenses?mois=' + mois)
    setData(await r.json()); setLoading(false)
  }
  useEffect(() => { fetchD() }, [mois])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const payload = { libelle: form.libelle, montant: parseFloat(form.montant), categorie: form.categorie, date: form.date, notes: form.notes }
    const res = await fetch('/api/depenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    if (res.ok) { toast.success('Dépense enregistrée'); setShowModal(false); setForm(EMPTY); fetchD() }
    else { const err = await res.json(); toast.error(err.error ?? 'Erreur') }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette dépense ?')) return
    const res = await fetch('/api/depenses/' + id, { method: 'DELETE' })
    if (res.ok) { toast.success('Supprimée'); fetchD() } else toast.error('Erreur')
  }

  const sf = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  // Données pour le pie chart
  const pieData = data ? Object.entries(data.parCategorie).map(([cat, montant]) => ({
    name: CAT_MAP[cat]?.label ?? cat, value: montant, color: CAT_MAP[cat]?.color ?? '#6b7280'
  })) : []

  // Comparaison avec le CA du mois (à afficher si dispo)
  const nomMois = new Date(mois + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Dépenses</h1>
          <p className="text-sm text-gray-500 capitalize">{nomMois}</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" className="input-field" value={mois} onChange={e => setMois(e.target.value)}
            style={{width:'160px'}} />
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5 whitespace-nowrap">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Nouvelle dépense</span><span className="sm:hidden">Ajouter</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-xl shrink-0"><TrendingDown className="w-5 h-5 text-red-500" /></div>
          <div>
            <p className="text-xs text-gray-400">Total dépenses</p>
            <p className="text-lg font-bold text-red-600">{formatMontant(data?.totalMois ?? 0)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 bg-gray-50 rounded-xl shrink-0"><Wallet className="w-5 h-5 text-gray-500" /></div>
          <div>
            <p className="text-xs text-gray-400">Nb dépenses</p>
            <p className="text-lg font-bold text-gray-700">{data?.depenses.length ?? 0}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="p-2 bg-indigo-50 rounded-xl shrink-0"><Wallet className="w-5 h-5 text-indigo-500" /></div>
          <div>
            <p className="text-xs text-gray-400">Catégories</p>
            <p className="text-lg font-bold text-indigo-600">{Object.keys(data?.parCategorie ?? {}).length}</p>
          </div>
        </div>
      </div>

      {/* Répartition graphique */}
      {pieData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Pie chart */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Répartition par catégorie</h2>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                  dataKey="value" nameKey="name" paddingAngle={2}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatMontant(v)} />
                <Legend iconSize={10} wrapperStyle={{fontSize:'11px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Barres par catégorie */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Montants par catégorie</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={pieData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => (v/1000).toFixed(0) + 'k'} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip formatter={(v: number) => formatMontant(v)} />
                <Bar dataKey="value" radius={[0,4,4,0]}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Liste des dépenses */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700">Détail des dépenses</p>
        </div>
        {loading && <div className="py-10 text-center text-gray-400 text-sm">Chargement...</div>}
        {!loading && (data?.depenses.length ?? 0) === 0 && (
          <div className="py-12 text-center">
            <Wallet className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucune dépense ce mois</p>
          </div>
        )}
        <div className="divide-y divide-gray-100">
          {data?.depenses.map(d => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
                style={{ background: CAT_MAP[d.categorie]?.color + '20' }}>
                <span style={{ color: CAT_MAP[d.categorie]?.color, fontSize: '14px' }}>
                  {d.categorie === 'ELECTRICITE' ? '⚡' : d.categorie === 'INTERNET' ? '🌐' : d.categorie === 'LOYER' ? '🏠' : d.categorie === 'SALAIRE' ? '👤' : d.categorie === 'TRANSPORT' ? '🚗' : d.categorie === 'FOURNITURE' ? '📦' : '💰'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{d.libelle}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: CAT_MAP[d.categorie]?.color + '20', color: CAT_MAP[d.categorie]?.color }}>
                    {CAT_MAP[d.categorie]?.label ?? d.categorie}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(d.date)}</span>
                  {d.user?.name && <span className="text-xs text-gray-400">par {d.user.name}</span>}
                </div>
                {d.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{d.notes}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-red-600 whitespace-nowrap">{formatMontant(d.montant)}</p>
                {isAdmin && (
                  <button onClick={() => handleDelete(d.id)} className="text-xs text-red-400 hover:text-red-600 mt-0.5">supprimer</button>
                )}
              </div>
            </div>
          ))}
        </div>
        {(data?.depenses.length ?? 0) > 0 && (
          <div className="px-4 py-3 bg-red-50 border-t border-red-100 flex justify-between items-center">
            <span className="text-sm font-semibold text-red-700">Total du mois</span>
            <span className="text-lg font-bold text-red-700">{formatMontant(data?.totalMois ?? 0)}</span>
          </div>
        )}
      </div>

      {/* Modal ajout dépense */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90dvh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold">Nouvelle dépense</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 rounded-lg text-lg leading-none">x</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Libellé *</label>
                <input className="input-field" value={form.libelle} onChange={sf('libelle')} required placeholder="Ex: Facture Sonabel Avril" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA) *</label>
                  <input type="number" min="1" step="100" className="input-field" value={form.montant} onChange={sf('montant')} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" className="input-field" value={form.date} onChange={sf('date')} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                <select className="input-field" value={form.categorie} onChange={sf('categorie')}>
                  {CATEGORIES.map(c => <option key={c.val} value={c.val}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                <input className="input-field" value={form.notes} onChange={sf('notes')} placeholder="Référence facture, détails..." />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
