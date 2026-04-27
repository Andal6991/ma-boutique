'use client'
import { useState, useEffect } from 'react'
import { Plus, UserCog, Mail, Phone, Edit2, Trash2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

interface Employe { id: string; name: string | null; email: string; role: string; createdAt: string }
const EMPTY = { nom: '', email: '', telephone: '', role: 'VENDEUR', password: '' }
const roleLabel: Record<string, string> = { ADMIN: 'Administrateur', GERANT: 'Gérant', VENDEUR: 'Vendeur' }
const roleBadge: Record<string, string> = { ADMIN: 'bg-purple-100 text-purple-700', GERANT: 'bg-blue-100 text-blue-700', VENDEUR: 'bg-gray-100 text-gray-700' }

export default function EmployesPage() {
  const [employes, setEmployes] = useState<Employe[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  async function fetchE() {
    setLoading(true)
    const r = await fetch('/api/employes')
    setEmployes(await r.json()); setLoading(false)
  }
  useEffect(() => { fetchE() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const res = await fetch('/api/employes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: form.nom, email: form.email, telephone: form.telephone, role: form.role, password: form.password }),
    })
    setSaving(false)
    if (res.ok) { toast.success('Employe cree !'); setShowModal(false); setForm(EMPTY); fetchE() }
    else { const err = await res.json(); toast.error(err.error ?? 'Erreur') }
  }

  const sf = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Employés</h1>
          <p className="text-sm text-gray-500">{employes.length} membre{employes.length > 1 ? 's' : ''} de l'équipe</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5 whitespace-nowrap">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Nouvel employé</span><span className="sm:hidden">Nouveau</span>
        </button>
      </div>

      {/* Info permissions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
        <p><strong>Vendeur</strong> — peut créer des ventes et consulter les clients. Ne peut pas supprimer.</p>
        <p className="mt-1"><strong>Gérant</strong> — comme Vendeur + gère produits, clients et crédits. Peut demander une suppression.</p>
        <p className="mt-1"><strong>Admin</strong> — accès complet. Seul pouvant supprimer des ventes.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {loading && <p className="text-gray-400 text-sm col-span-3">Chargement...</p>}
        {employes.map(e => {
          const init = (e.name ?? e.email).slice(0, 2).toUpperCase()
          return (
            <div key={e.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-bold text-indigo-700 shrink-0">
                  {init}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 truncate">{e.name ?? 'Sans nom'}</p>
                    <span className={'badge text-xs ' + (roleBadge[e.role] ?? 'bg-gray-100 text-gray-700')}>{roleLabel[e.role] ?? e.role}</span>
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3" />{e.email}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        {!loading && employes.length === 0 && (
          <div className="col-span-3 text-center py-10">
            <UserCog className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucun employé. Ajoutez votre équipe !</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90dvh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold">Nouvel employé</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 rounded-lg text-lg leading-none">x</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                <input className="input-field" value={form.nom} onChange={sf('nom')} required placeholder="Prénom Nom" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email de connexion *</label>
                <input type="email" className="input-field" value={form.email} onChange={sf('email')} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
                <select className="input-field" value={form.role} onChange={sf('role')}>
                  <option value="VENDEUR">Vendeur</option>
                  <option value="GERANT">Gérant</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe temporaire *</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} className="input-field pr-10" value={form.password}
                    onChange={sf('password')} required minLength={6} placeholder="Min. 6 caractères" />
                  <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">L'employé pourra le changer depuis ses paramètres</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                Communiquez ces identifiants à votre employé. Il se connecte sur la même URL que vous.
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Création...' : 'Créer le compte'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
