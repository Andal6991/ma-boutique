'use client'
// src/app/superadmin/tenants/page.tsx
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, Plus, Search, RefreshCw, PauseCircle, PlayCircle,
  AlertTriangle, CheckCircle, Clock, LogOut, TrendingUp,
  Users, Building2, DollarSign, Edit2, Trash2, Eye, BarChart3, Download
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Tenant {
  id: string; nom: string; sousDomaine: string; plan: string
  actif: boolean; dateFinAbonnement: string; prixMensuel: number
  emailContact?: string; telephone?: string; notesAdmin?: string
  joursRestants: number; statutAbo: string
  _count: { users: number; clients: number; ventes: number }
}
interface Stats {
  totalTenants: number; tenantsActifs: number; tenantsExpires: number
  tenantsExpirentBientot: number; revenuMensuelTotal: number
  expirantBientot: { id: string; nom: string; dateFinAbonnement: string; emailContact?: string }[]
}

const PLAN_COLORS: Record<string, string> = {
  STARTER: 'bg-gray-100 text-gray-700',
  PRO: 'bg-blue-100 text-blue-700',
  ENTERPRISE: 'bg-purple-100 text-purple-700',
}

function statutBadge(statut: string, jours: number) {
  if (statut === 'ACTIF') return <span className="badge bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Actif · {jours}j</span>
  if (statut === 'EXPIRE_BIENTOT') return <span className="badge bg-amber-100 text-amber-700 flex items-center gap-1"><Clock className="w-3 h-3" /> Expire dans {jours}j</span>
  if (statut === 'EXPIRE') return <span className="badge bg-red-100 text-red-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Expiré ({Math.abs(jours)}j)</span>
  return <span className="badge bg-gray-100 text-gray-600">Suspendu</span>
}

export default function SuperAdminTenantsPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [search, setSearch] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showRenouveler, setShowRenouveler] = useState<Tenant | null>(null)
  const [showEdit, setShowEdit] = useState<Tenant | null>(null)
  const [showActivite, setShowActivite] = useState<Tenant | null>(null)
  const [showConfirmDelete, setShowConfirmDelete] = useState<Tenant | null>(null)
  const [actionLoading, setActionLoading] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [tr, sr] = await Promise.all([
      fetch(`/api/superadmin/tenants?q=${encodeURIComponent(search)}&statut=${filtreStatut}`),
      fetch('/api/superadmin/stats'),
    ])
    if (tr.status === 401 || sr.status === 401) { router.push('/superadmin/login'); return }
    setTenants(await tr.json())
    setStats(await sr.json())
    setLoading(false)
  }, [search, filtreStatut, router])

  useEffect(() => { fetchData() }, [fetchData])

  async function telechargerBackup(t: Tenant) {
    toast.loading('Préparation du backup...')
    try {
      const res = await fetch('/api/superadmin/tenants/' + t.id + '/backup')
      if (!res.ok) { toast.dismiss(); toast.error('Erreur backup'); return }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'backup-' + t.nom.replace(/\s+/g, '-').toLowerCase() + '-' + new Date().toISOString().slice(0, 10) + '.json'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.dismiss()
      toast.success('Backup téléchargé !')
    } catch {
      toast.dismiss()
      toast.error('Erreur backup')
    }
  }

  async function supprimerBoutique(t: Tenant) {
    setActionLoading(t.id)
    const res = await fetch('/api/superadmin/tenants/' + t.id, { method: 'DELETE' })
    setActionLoading('')
    setShowConfirmDelete(null)
    if (res.ok) { toast.success('Boutique supprimée'); fetchData() }
    else { const err = await res.json(); toast.error(err.error ?? 'Erreur') }
  }

  async function toggleActif(t: Tenant) {
    setActionLoading(t.id)
    const res = await fetch(`/api/superadmin/tenants/${t.id}/abonnement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: t.actif ? 'SUSPENDRE' : 'REACTIVER' }),
    })
    setActionLoading('')
    if (res.ok) { toast.success(t.actif ? 'Boutique suspendue' : 'Boutique réactivée'); fetchData() }
    else toast.error('Erreur')
  }

  async function deconnecter() {
    await fetch('/api/superadmin/login', { method: 'DELETE' })
    router.push('/superadmin/login')
  }

  const filtres = [
    { val: '', label: 'Tous' },
    { val: 'ACTIF', label: 'Actifs' },
    { val: 'EXPIRE_BIENTOT', label: 'Expirent bientôt' },
    { val: 'EXPIRE', label: 'Expirés' },
    { val: 'SUSPENDU', label: 'Suspendus' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-slate-300" />
          <div>
            <span className="font-bold text-lg">Ma Boutique</span>
            <span className="text-slate-400 text-sm ml-2">— Panel SuperAdmin</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nouveau client
          </button>
          <button onClick={deconnecter} className="text-slate-400 hover:text-white p-2 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* KPIs */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total clients', value: stats?.totalTenants ?? 0, icon: Building2, color: 'text-slate-700', bg: 'bg-slate-100' },
              { label: 'Actifs', value: stats?.tenantsActifs ?? 0, icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-100' },
              { label: 'Expirés', value: stats?.tenantsExpires ?? 0, icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-100' },
              { label: 'Expirent ≤7j', value: stats?.tenantsExpirentBientot ?? 0, icon: Clock, color: 'text-amber-700', bg: 'bg-amber-100' },
              { label: 'Revenu/mois', value: `${new Intl.NumberFormat('fr-FR').format(stats?.revenuMensuelTotal ?? 0)} FCFA`, icon: DollarSign, color: 'text-blue-700', bg: 'bg-blue-100' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                <div><p className="text-xs text-gray-400">{s.label}</p><p className={`text-xl font-bold ${s.color}`}>{s.value}</p></div>
              </div>
            ))}
          </div>
        )}

        {/* Alertes expiration */}
        {stats && stats.expirantBientot && stats.expirantBientot.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" /> {stats.expirantBientot?.length ?? 0} abonnement(s) expirant dans les 7 prochains jours
            </p>
            <div className="flex flex-wrap gap-2">
              {(stats.expirantBientot ?? []).map(t => (
                <span key={t.id} className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                  {t.nom} — {t.dateFinAbonnement ? formatDate(t.dateFinAbonnement) : "-"}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filtres + recherche */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-field pl-10" placeholder="Chercher une boutique..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1.5">
            {filtres.map(f => (
              <button key={f.val} onClick={() => setFiltreStatut(f.val)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${filtreStatut === f.val ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table tenants */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 uppercase text-xs font-medium">
                <th className="text-left py-3 px-4">Boutique</th>
                <th className="text-left py-3 px-4">Plan</th>
                <th className="text-center py-3 px-4">Utilisateurs</th>
                <th className="text-center py-3 px-4">Ventes</th>
                <th className="text-right py-3 px-4">Abonnement</th>
                <th className="text-center py-3 px-4">Statut</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">Chargement...</td></tr>
              )}
              {!loading && tenants.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">Aucune boutique trouvée</td></tr>
              )}
              {tenants.map(t => (
                <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-gray-900">{t.nom}</p>
                    <p className="text-xs text-gray-400">{t.sousDomaine}.ma-boutique.com</p>
                    {t.telephone && <p className="text-xs text-gray-400">{t.telephone}</p>}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge text-xs ${PLAN_COLORS[t.plan] ?? 'bg-gray-100 text-gray-700'}`}>{t.plan}</span>
                    <p className="text-xs text-gray-400 mt-1">{new Intl.NumberFormat('fr-FR').format(t.prixMensuel)} FCFA/mois</p>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-medium text-gray-700">{t._count?.users ?? 0}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-medium text-gray-700">{t._count?.ventes ?? 0}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <p className="text-xs text-gray-500">Expire le</p>
                    <p className="text-sm font-medium text-gray-800">{t.dateFinAbonnement ? formatDate(t.dateFinAbonnement) : "-"}</p>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {statutBadge(t.statutAbo, t.joursRestants)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setShowEdit(t)}
                    className="p-2 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
                    title="Modifier la boutique">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowActivite(t)}
                    className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                    title="Voir l'activité">
                    <BarChart3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => telechargerBackup(t)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                    title="Télécharger le backup">
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowConfirmDelete(t)}
                    className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                    title="Supprimer la boutique">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowRenouveler(t)}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                        title="Renouveler l'abonnement"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActif(t)}
                        disabled={actionLoading === t.id}
                        className={`p-1.5 rounded-lg transition-colors ${t.actif ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-600'}`}
                        title={t.actif ? 'Suspendre' : 'Réactiver'}
                      >
                        {t.actif ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Activité Boutique */}
      {showActivite && (
        <ModalActiviteBoutique
          tenant={showActivite}
          onClose={() => setShowActivite(null)}
        />
      )}

      {/* Modal Confirmation Suppression */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Supprimer la boutique</h2>
                <p className="text-sm text-gray-500">{showConfirmDelete.nom}</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <p className="text-sm text-red-700 font-medium">⚠️ Action irréversible !</p>
              <p className="text-xs text-red-600 mt-1">Toutes les données (ventes, clients, produits) seront définitivement supprimées.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmDelete(null)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={() => supprimerBoutique(showConfirmDelete)}
                disabled={actionLoading === showConfirmDelete.id}
                className="btn-danger flex-1">
                {actionLoading === showConfirmDelete.id ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifier */}
      {showEdit && (
        <ModalEditerTenant
          tenant={showEdit}
          onClose={() => setShowEdit(null)}
          onSuccess={() => { setShowEdit(null); fetchData() }}
        />
      )}

      {/* Modal Renouveler */}
      {showRenouveler && (
        <ModalRenouveler
          tenant={showRenouveler}
          onClose={() => setShowRenouveler(null)}
          onSuccess={() => { setShowRenouveler(null); fetchData() }}
        />
      )}

      {/* Modal Créer */}
      {showCreate && (
        <ModalCreerTenant
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); fetchData() }}
        />
      )}
    </div>
  )
}

// ─── Modal Renouveler abonnement ─────────────────────────────────────────────
function ModalRenouveler({ tenant, onClose, onSuccess }: { tenant: Tenant; onClose: () => void; onSuccess: () => void }) {
  const [action, setAction] = useState('RENOUVELER')
  const [dureeJours, setDureeJours] = useState(30)
  const [dateManuelle, setDateManuelle] = useState('')
  const [plan, setPlan] = useState(tenant.plan)
  const [prixMensuel, setPrixMensuel] = useState(String(tenant.prixMensuel))
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch(`/api/superadmin/tenants/${tenant.id}/abonnement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        dureeJours: action === 'RENOUVELER' ? dureeJours : undefined,
        dateFinManuelle: action === 'MODIFIER_DATE' ? dateManuelle : undefined,
        plan,
        prixMensuel: parseFloat(prixMensuel) || 0,
      }),
    })
    setSaving(false)
    if (res.ok) { toast.success('Abonnement mis à jour'); onSuccess() }
    else { const e = await res.json(); toast.error(e.error ?? 'Erreur') }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold">Gérer l'abonnement — {tenant.nom}</h2>
          <p className="text-sm text-gray-500 mt-1">Expire le {formatDate(tenant.dateFinAbonnement)} · {Math.abs(tenant.joursRestants)}j {tenant.joursRestants >= 0 ? 'restants' : 'de retard'}</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'RENOUVELER', label: 'Renouveler' },
                { val: 'MODIFIER_DATE', label: 'Date précise' },
              ].map(a => (
                <button key={a.val} type="button" onClick={() => setAction(a.val)}
                  className={`py-2 px-3 rounded-lg text-sm border transition-colors ${action === a.val ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:border-gray-300'}`}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {action === 'RENOUVELER' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durée</label>
              <div className="grid grid-cols-4 gap-2">
                {[7, 30, 90, 365].map(d => (
                  <button key={d} type="button" onClick={() => setDureeJours(d)}
                    className={`py-2 rounded-lg text-sm border transition-colors ${dureeJours === d ? 'bg-slate-900 text-white border-slate-900' : 'border-gray-200 hover:border-gray-300'}`}>
                    {d === 7 ? '1 sem' : d === 30 ? '1 mois' : d === 90 ? '3 mois' : '1 an'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {action === 'MODIFIER_DATE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nouvelle date de fin</label>
              <input type="date" className="input-field" value={dateManuelle} onChange={e => setDateManuelle(e.target.value)} required />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select className="input-field" value={plan} onChange={e => setPlan(e.target.value)}>
                <option value="STARTER">Starter</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix/mois (FCFA)</label>
              <input type="number" min="0" step="500" className="input-field" value={prixMensuel} onChange={e => setPrixMensuel(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 bg-slate-900 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium transition-colors">
              {saving ? 'Enregistrement...' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal Créer un nouveau tenant ───────────────────────────────────────────
function ModalCreerTenant({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    nomBoutique: '', sousDomaine: '', telephone: '', emailContact: '',
    adresse: '', plan: 'STARTER', prixMensuel: '10000', dureeJours: '30',
    adminNom: '', adminEmail: '', adminPassword: '', notesAdmin: '',
  })
  const [saving, setSaving] = useState(false)

  const sf = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  // Auto-générer le sous-domaine depuis le nom
  function handleNom(e: React.ChangeEvent<HTMLInputElement>) {
    const nom = e.target.value
    const slug = nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setForm(f => ({ ...f, nomBoutique: nom, sousDomaine: slug }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/superadmin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        prixMensuel: parseFloat(form.prixMensuel) || 0,
        dureeJours: parseInt(form.dureeJours) || 30,
      }),
    })
    setSaving(false)
    if (res.ok) { toast.success('Boutique créée avec succès !'); onSuccess() }
    else { const err = await res.json(); toast.error(err.error ?? 'Erreur') }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">Nouveau client — Créer une boutique</h2>
          <p className="text-sm text-gray-500 mt-0.5">Un compte admin sera créé automatiquement</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5">

          {/* Infos boutique */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Informations de la boutique</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la boutique *</label>
                <input className="input-field" value={form.nomBoutique} onChange={handleNom} required placeholder="Boutique Awa" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sous-domaine *</label>
                <div className="flex items-center gap-2">
                  <input className="input-field flex-1" value={form.sousDomaine} onChange={sf('sousDomaine')} required placeholder="boutique-awa" pattern="[a-z0-9\-]+" />
                  <span className="text-sm text-gray-400 whitespace-nowrap">.ma-boutique.com</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Lettres minuscules, chiffres et tirets uniquement</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input className="input-field" value={form.telephone} onChange={sf('telephone')} placeholder="+226 70 00 00 00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email contact</label>
                  <input type="email" className="input-field" value={form.emailContact} onChange={sf('emailContact')} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input className="input-field" value={form.adresse} onChange={sf('adresse')} placeholder="Quartier, Ville, Pays" />
              </div>
            </div>
          </div>

          {/* Abonnement */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Abonnement</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select className="input-field" value={form.plan} onChange={sf('plan')}>
                  <option value="STARTER">Starter</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix/mois (FCFA)</label>
                <input type="number" min="0" step="500" className="input-field" value={form.prixMensuel} onChange={sf('prixMensuel')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durée initiale</label>
                <select className="input-field" value={form.dureeJours} onChange={sf('dureeJours')}>
                  <option value="7">7 jours</option>
                  <option value="14">14 jours</option>
                  <option value="30">1 mois</option>
                  <option value="90">3 mois</option>
                  <option value="180">6 mois</option>
                  <option value="365">1 an</option>
                </select>
              </div>
            </div>
          </div>

          {/* Compte Admin */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Compte administrateur de la boutique</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                <input className="input-field" value={form.adminNom} onChange={sf('adminNom')} required placeholder="Nom Prénom du gérant" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email de connexion *</label>
                  <input type="email" className="input-field" value={form.adminEmail} onChange={sf('adminEmail')} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe temporaire *</label>
                  <input className="input-field" value={form.adminPassword} onChange={sf('adminPassword')} required minLength={6} placeholder="Min. 6 caractères" />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes internes (optionnel)</label>
            <textarea className="input-field resize-none" rows={2} value={form.notesAdmin} onChange={sf('notesAdmin')} placeholder="Notes visibles uniquement par vous..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 bg-slate-900 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
              {saving ? 'Création en cours...' : 'Créer la boutique'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


// Modal Modifier un tenant
function ModalEditerTenant({ tenant, onClose, onSuccess }: { tenant: Tenant; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    nom: tenant.nom,
    telephone: tenant.telephone ?? '',
    emailContact: tenant.emailContact ?? '',
    adresse: '',
    plan: tenant.plan,
    prixMensuel: String(tenant.prixMensuel),
    notesAdmin: tenant.notesAdmin ?? '',
  })
  const [saving, setSaving] = useState(false)
  const sf = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/superadmin/tenants/' + tenant.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, prixMensuel: parseFloat(form.prixMensuel) || 0 }),
    })
    setSaving(false)
    if (res.ok) { toast.success('Boutique modifiee !'); onSuccess() }
    else { const err = await res.json(); toast.error(err.error ?? 'Erreur') }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">Modifier — {tenant.nom}</h2>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la boutique *</label>
            <input className="input-field" value={form.nom} onChange={sf('nom')} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
              <input className="input-field" value={form.telephone} onChange={sf('telephone')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email contact</label>
              <input type="email" className="input-field" value={form.emailContact} onChange={sf('emailContact')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select className="input-field" value={form.plan} onChange={sf('plan')}>
                <option value="STARTER">Starter</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix mensuel (FCFA)</label>
              <input type="number" min="0" className="input-field" value={form.prixMensuel} onChange={sf('prixMensuel')} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes admin</label>
            <textarea className="input-field resize-none" rows={2} value={form.notesAdmin} onChange={sf('notesAdmin')} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


// Modal Activité d'une boutique
function ModalActiviteBoutique({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/superadmin/tenants/' + tenant.id + '/stats')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [tenant.id])

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Activité — {tenant.nom}</h2>
            <p className="text-sm text-gray-500">{tenant.sousDomaine}.ma-boutique.com</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">✕</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'CA ce mois', value: fmt(data.stats.caMois), color: 'text-blue-700', bg: 'bg-blue-50' },
                { label: 'CA total', value: fmt(data.stats.caTotal), color: 'text-green-700', bg: 'bg-green-50' },
                { label: 'Ventes ce mois', value: data.stats.nbVentesMois, color: 'text-indigo-700', bg: 'bg-indigo-50' },
                { label: 'Total ventes', value: data.stats.nbVentesTotal, color: 'text-gray-700', bg: 'bg-gray-50' },
                { label: 'Produits', value: data.stats.nbProduits, color: 'text-amber-700', bg: 'bg-amber-50' },
                { label: 'Clients', value: data.stats.nbClients, color: 'text-purple-700', bg: 'bg-purple-50' },
              ].map(s => (
                <div key={s.label} className={'rounded-xl p-3 ' + s.bg}>
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className={'text-lg font-bold ' + s.color}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Équipe */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Équipe ({data.stats.nbVendeurs} membres)</p>
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                {data.stats.nbVendeurs === 1 ? '1 administrateur' : data.stats.nbVendeurs + ' membres dont l'administrateur'}
              </div>
            </div>

            {/* Dernières ventes */}
            {data.dernieresVentes.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">5 dernières ventes</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <th className="text-left py-2 px-3">Ticket</th>
                        <th className="text-left py-2 px-3">Vendeur</th>
                        <th className="text-left py-2 px-3">Client</th>
                        <th className="text-right py-2 px-3">Montant</th>
                        <th className="text-center py-2 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dernieresVentes.map((v: any) => (
                        <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 font-mono text-xs text-gray-500">{v.numero}</td>
                          <td className="py-2 px-3 text-gray-700">{v.user?.name ?? '-'}</td>
                          <td className="py-2 px-3 text-gray-700">{v.client ? (v.client.prenom ?? '') + ' ' + v.client.nom : 'Comptant'}</td>
                          <td className="py-2 px-3 text-right font-semibold">{fmt(v.montantTTC)}</td>
                          <td className="py-2 px-3 text-center text-xs text-gray-400">{new Date(v.createdAt).toLocaleDateString('fr-FR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {data.dernieresVentes.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Aucune vente encore</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
