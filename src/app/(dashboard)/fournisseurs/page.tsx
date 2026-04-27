'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Edit2, Trash2, Package, Phone, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

interface Fournisseur {
  id: string; nom: string; telephone?: string; email?: string
  adresse?: string; contact?: string; notes?: string
  _count?: { produits: number }
}
const EMPTY = { nom: '', telephone: '', email: '', adresse: '', contact: '', notes: '' }

export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchF = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/fournisseurs?q=' + encodeURIComponent(search))
    setFournisseurs(await r.json()); setLoading(false)
  }, [search])

  useEffect(() => { fetchF() }, [fetchF])

  function openCreate() { setForm(EMPTY); setEditId(null); setShowModal(true) }
  function openEdit(f: Fournisseur) {
    setForm({ nom: f.nom, telephone: f.telephone ?? '', email: f.email ?? '', adresse: f.adresse ?? '', contact: f.contact ?? '', notes: f.notes ?? '' })
    setEditId(f.id); setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const res = await fetch(editId ? '/api/fournisseurs/' + editId : '/api/fournisseurs', {
      method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    })
    setSaving(false)
    if (res.ok) { toast.success(editId ? 'Fournisseur modifie' : 'Fournisseur cree'); setShowModal(false); fetchF() }
    else { const e = await res.json(); toast.error(e.error ?? 'Erreur') }
  }

  async function handleDelete(id: string, nom: string) {
    if (!confirm('Supprimer "' + nom + '" ?')) return
    const res = await fetch('/api/fournisseurs/' + id, { method: 'DELETE' })
    if (res.ok) { toast.success('Supprime'); fetchF() } else toast.error('Erreur')
  }

  const sf = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Fournisseurs</h1>
          <p className="text-sm text-gray-500">{fournisseurs.length} fournisseur{fournisseurs.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 whitespace-nowrap">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Nouveau fournisseur</span><span className="sm:hidden">Nouveau</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input-field pl-10" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {loading && <p className="text-gray-400 text-sm col-span-3">Chargement...</p>}
        {fournisseurs.map(f => (
          <div key={f.id} className="card p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-bold text-indigo-700 shrink-0">
                {f.nom.slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{f.nom}</p>
                {f.contact && <p className="text-xs text-gray-400">Contact : {f.contact}</p>}
              </div>
              <span className="badge bg-indigo-100 text-indigo-700 text-xs shrink-0">
                {f._count?.produits ?? 0} produit{(f._count?.produits ?? 0) > 1 ? 's' : ''}
              </span>
            </div>

            {(f.telephone || f.email) && (
              <div className="space-y-1 mb-3 text-xs text-gray-500">
                {f.telephone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{f.telephone}</div>}
                {f.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{f.email}</div>}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => openEdit(f)} className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-xs py-2">
                <Edit2 className="w-3.5 h-3.5" /> Modifier
              </button>
              <button onClick={() => handleDelete(f.id, f.nom)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {!loading && fournisseurs.length === 0 && (
          <div className="col-span-3 text-center py-10">
            <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucun fournisseur. Ajoutez-en un !</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90dvh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold">{editId ? 'Modifier' : 'Nouveau fournisseur'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 rounded-lg text-lg leading-none">x</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input className="input-field" value={form.nom} onChange={sf('nom')} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                  <input type="tel" className="input-field" value={form.telephone} onChange={sf('telephone')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" className="input-field" value={form.email} onChange={sf('email')} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Personne de contact</label>
                <input className="input-field" value={form.contact} onChange={sf('contact')} placeholder="Nom du representant" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input className="input-field" value={form.adresse} onChange={sf('adresse')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea className="input-field resize-none" rows={2} value={form.notes} onChange={sf('notes')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Enregistrement...' : editId ? 'Modifier' : 'Creer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
