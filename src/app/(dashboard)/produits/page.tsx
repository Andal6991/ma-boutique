'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Edit2, Trash2, AlertTriangle, Package } from 'lucide-react'
import { formatMontant } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Produit {
  id: string; reference: string; libelle: string; prixHT: number
  stock: number; stockMin: number; unite: string; actif: boolean; imageUrl?: string
  categorie?: { id: string; nom: string }
}
type F = { reference: string; libelle: string; description: string; prixHT: string; tauxTVA: string; stock: string; stockMin: string; unite: string; imageUrl: string }
const EMPTY: F = { reference: '', libelle: '', description: '', prixHT: '', tauxTVA: '0', stock: '0', stockMin: '5', unite: 'piece', imageUrl: '' }

export default function ProduitsPage() {
  const [produits, setProduits] = useState<Produit[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<F>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const fetchP = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/produits?q=' + encodeURIComponent(search))
    setProduits(await r.json()); setLoading(false)
  }, [search])

  useEffect(() => { fetchP() }, [fetchP])

  function openCreate() { setForm(EMPTY); setEditId(null); setShowModal(true) }
  function openEdit(p: Produit) {
    setForm({ reference: p.reference, libelle: p.libelle, description: '', prixHT: String(p.prixHT), tauxTVA: '0', stock: String(p.stock), stockMin: String(p.stockMin), unite: p.unite, imageUrl: p.imageUrl ?? '' })
    setEditId(p.id); setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const payload = { reference: form.reference, libelle: form.libelle, prixHT: parseFloat(form.prixHT), tauxTVA: parseFloat(form.tauxTVA), stock: parseInt(form.stock), stockMin: parseInt(form.stockMin), unite: form.unite, imageUrl: form.imageUrl || null }
    const res = await fetch(editId ? '/api/produits/' + editId : '/api/produits', { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    if (res.ok) { toast.success(editId ? 'Modifie' : 'Cree'); setShowModal(false); fetchP() }
    else { const err = await res.json(); toast.error(err.error ?? 'Erreur') }
  }

  async function handleDelete(id: string, libelle: string) {
    if (!confirm('Supprimer "' + libelle + '" ?')) return
    const res = await fetch('/api/produits/' + id, { method: 'DELETE' })
    if (res.ok) { toast.success('Supprime'); fetchP() } else toast.error('Erreur')
  }


  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        setForm(f => ({ ...f, imageUrl: data.url }))
      } else {
        toast.error('Erreur upload image')
      }
    } catch {
      toast.error('Erreur upload')
    }
    setUploading(false)
  }

  const sf = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Produits</h1>
          <p className="text-sm text-gray-500">{produits.length} article{produits.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 whitespace-nowrap">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Nouveau produit</span><span className="sm:hidden">Nouveau</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input-field pl-10" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[440px]">
            <thead>
              <tr className="table-header border-b border-gray-200">
                <th className="text-left py-3 px-3">Ref.</th>
                <th className="text-left py-3 px-3">Libelle</th>
                <th className="text-right py-3 px-3">Prix</th>
                <th className="text-center py-3 px-3">Stock</th>
                <th className="text-center py-3 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="py-10 text-center text-gray-400">Chargement...</td></tr>}
              {!loading && produits.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center">
                  <Package className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Aucun produit</p>
                </td></tr>
              )}
              {produits.map(p => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-3 font-mono text-xs text-gray-500">{p.reference}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.libelle} className="w-8 h-8 rounded object-cover shrink-0 border border-gray-200" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                      <p className="font-medium text-gray-800 truncate max-w-[120px]">{p.libelle}</p>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold whitespace-nowrap">{formatMontant(p.prixHT)}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`badge ${p.stock <= 0 ? 'bg-red-100 text-red-700' : p.stock <= p.stockMin ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(p)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(p.id, p.libelle)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90dvh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold">{editId ? 'Modifier' : 'Nouveau produit'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 rounded-lg text-lg leading-none">x</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference *</label>
                  <input className="input-field" value={form.reference} onChange={sf('reference')} required disabled={!!editId} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unite</label>
                  <input className="input-field" value={form.unite} onChange={sf('unite')} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Libelle *</label>
                <input className="input-field" value={form.libelle} onChange={sf('libelle')} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix HT (FCFA) *</label>
                  <input type="number" min="0" className="input-field" value={form.prixHT} onChange={sf('prixHT')} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TVA (%)</label>
                  <input type="number" min="0" max="100" className="input-field" value={form.tauxTVA} onChange={sf('tauxTVA')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input type="number" min="0" className="input-field" value={form.stock} onChange={sf('stock')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seuil alerte</label>
                  <input type="number" min="0" className="input-field" value={form.stockMin} onChange={sf('stockMin')} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo du produit (optionnel)</label>
                <div className="flex items-center gap-3">
                  {form.imageUrl && (
                    <img src={form.imageUrl} alt="Apercu" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                  )}
                  <div className="flex-1">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="img-upload" />
                    <label htmlFor="img-upload" className="btn-secondary cursor-pointer text-sm px-3 py-2 flex items-center gap-2 w-full justify-center">
                      {uploading ? 'Upload...' : form.imageUrl ? 'Changer la photo' : 'Ajouter une photo'}
                    </label>
                    <p className="text-xs text-gray-400 mt-1 text-center">JPG, PNG max 2MB</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" disabled={saving || uploading} className="btn-primary flex-1">{saving ? 'Enregistrement...' : editId ? 'Modifier' : 'Creer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
