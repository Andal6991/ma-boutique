'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, User, Phone, Eye, Edit2 } from 'lucide-react'
import { formatMontant, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Client {
  id: string; nom: string; prenom?: string; telephone?: string; email?: string
  adresse?: string; encours: number; creditMax: number; actif: boolean
  credits?: { id: string; soldeRestant: number; echeance: string; statut: string; remboursements?: any[] }[]
  ventes?: any[]
}
const EMPTY = { nom: '', prenom: '', telephone: '', email: '', adresse: '', creditMax: '0' }

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showFiche, setShowFiche] = useState<Client | null>(null)
  const [ficheDetail, setFicheDetail] = useState<any>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchC = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/clients?q=' + encodeURIComponent(search))
    setClients(await r.json()); setLoading(false)
  }, [search])

  useEffect(() => { fetchC() }, [fetchC])

  async function openFiche(c: Client) {
    setShowFiche(c)
    const r = await fetch('/api/clients/' + c.id)
    setFicheDetail(await r.json())
  }

  function openCreate() { setForm(EMPTY); setEditId(null); setShowModal(true) }
  function openEdit(c: Client) {
    setForm({ nom: c.nom, prenom: c.prenom ?? '', telephone: c.telephone ?? '', email: c.email ?? '', adresse: c.adresse ?? '', creditMax: String(c.creditMax) })
    setEditId(c.id); setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const payload = { ...form, creditMax: parseFloat(form.creditMax) || 0 }
    const res = await fetch(editId ? '/api/clients/' + editId : '/api/clients', {
      method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    })
    setSaving(false)
    if (res.ok) { toast.success(editId ? 'Client modifie' : 'Client cree'); setShowModal(false); fetchC() }
    else { const err = await res.json(); toast.error(err.error ?? 'Erreur') }
  }

  const sf = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500">{clients.length} client{clients.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 whitespace-nowrap">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Nouveau client</span><span className="sm:hidden">Nouveau</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input-field pl-10" placeholder="Nom, telephone..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Cards — 1 col mobile, 2 col sm, 3 col xl */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {loading && <p className="text-gray-400 text-sm col-span-3">Chargement...</p>}
        {clients.map(c => {
          const enRetard = c.credits?.some(cr => cr.statut === 'EN_RETARD')
          const nom = ((c.prenom ?? '') + ' ' + c.nom).trim()
          const init = nom.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
          return (
            <div key={c.id} className={'card p-4 ' + (enRetard ? 'border-red-200' : '')}>
              <div className="flex items-start gap-3 mb-3">
                <div className={'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ' + (enRetard ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}>
                  {init}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{nom}</p>
                  {c.telephone && <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{c.telephone}</p>}
                </div>
                {enRetard && <span className="badge bg-red-100 text-red-700 text-xs shrink-0">Retard</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Encours</p>
                  <p className={'text-sm font-bold ' + (c.encours > 0 ? 'text-amber-700' : 'text-green-700')}>{formatMontant(c.encours)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Plafond</p>
                  <p className="text-sm font-bold text-gray-700">{formatMontant(c.creditMax)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openFiche(c)} className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-xs py-2">
                  <Eye className="w-3.5 h-3.5" /> Fiche
                </button>
                <button onClick={() => openEdit(c)} className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-xs py-2">
                  <Edit2 className="w-3.5 h-3.5" /> Modifier
                </button>
              </div>
            </div>
          )
        })}
        {!loading && clients.length === 0 && (
          <div className="col-span-3 text-center py-10">
            <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucun client</p>
          </div>
        )}
      </div>

      {/* Modal formulaire — bottom sheet mobile */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90dvh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold">{editId ? 'Modifier' : 'Nouveau client'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 rounded-lg text-lg leading-none">x</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prenom</label>
                  <input className="input-field" value={form.prenom} onChange={sf('prenom')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input className="input-field" value={form.nom} onChange={sf('nom')} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                <input type="tel" className="input-field" value={form.telephone} onChange={sf('telephone')} placeholder="+226 70 00 00 00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input-field" value={form.email} onChange={sf('email')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input className="input-field" value={form.adresse} onChange={sf('adresse')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plafond credit (FCFA)</label>
                <input type="number" min="0" step="1000" className="input-field" value={form.creditMax} onChange={sf('creditMax')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Enregistrement...' : editId ? 'Modifier' : 'Creer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fiche client — bottom sheet mobile */}
      {showFiche && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90dvh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold">{showFiche.prenom} {showFiche.nom}</h2>
              <button onClick={() => { setShowFiche(null); setFicheDetail(null) }} className="p-2 text-gray-400 rounded-lg text-lg leading-none">x</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Encours</p>
                  <p className={'text-base font-bold ' + (showFiche.encours > 0 ? 'text-amber-700' : 'text-green-700')}>{formatMontant(showFiche.encours)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Plafond</p>
                  <p className="text-base font-bold text-gray-700">{formatMontant(showFiche.creditMax)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Dispo</p>
                  <p className="text-base font-bold text-blue-700">{formatMontant(Math.max(0, showFiche.creditMax - showFiche.encours))}</p>
                </div>
              </div>
              {ficheDetail?.credits?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Credits actifs</p>
                  {ficheDetail.credits.map((cr: any) => (
                    <div key={cr.id} className={'rounded-lg p-3 border mb-2 ' + (cr.statut === 'EN_RETARD' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50')}>
                      <div className="flex justify-between">
                        <span className={'badge text-xs ' + (cr.statut === 'EN_RETARD' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}>{cr.statut}</span>
                        <span className="font-bold text-sm">{formatMontant(cr.soldeRestant)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Echeance : {formatDate(cr.echeance)}</p>
                    </div>
                  ))}
                </div>
              )}
              {ficheDetail?.ventes?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Dernieres ventes</p>
                  {ficheDetail.ventes.slice(0, 5).map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm font-mono text-gray-500">{v.numero}</span>
                      <span className="text-sm font-semibold">{formatMontant(v.montantTTC)}</span>
                      <span className="text-xs text-gray-400">{formatDate(v.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
