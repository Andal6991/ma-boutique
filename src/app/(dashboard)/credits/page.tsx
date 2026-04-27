'use client'
import { useState, useEffect } from 'react'
import { CreditCard, Clock, CheckCircle, AlertTriangle, Plus, ChevronDown } from 'lucide-react'
import { formatMontant, formatDate, statutCreditLabel, getStatutCreditBadgeClass, modePaymentLabel, joursDepuis } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Credit {
  id: string; montantInitial: number; soldeRestant: number; echeance: string; statut: string
  client: { id: string; nom: string; prenom?: string; telephone?: string }
  vente?: { numero: string }
  remboursements: { id: string; montant: number; mode: string; createdAt: string }[]
}

const MODES = ['ESPECES', 'MOBILE_MONEY', 'CHEQUE', 'VIREMENT']

export default function CreditsPage() {
  const [credits, setCredits] = useState<Credit[]>([])
  const [filtreStatut, setFiltreStatut] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showRemb, setShowRemb] = useState<string | null>(null)
  const [remb, setRemb] = useState({ montant: '', mode: 'ESPECES', reference: '', notes: '' })
  const [saving, setSaving] = useState(false)

  async function fetchCredits() {
    setLoading(true)
    const r = await fetch('/api/credits' + (filtreStatut ? '?statut=' + filtreStatut : ''))
    setCredits(await r.json()); setLoading(false)
  }

  useEffect(() => { fetchCredits() }, [filtreStatut])

  async function enregistrerRemb(creditId: string, solde: number) {
    if (!remb.montant || parseFloat(remb.montant) <= 0) return toast.error('Montant invalide')
    setSaving(true)
    const res = await fetch('/api/credits/' + creditId + '/remboursements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ montant: parseFloat(remb.montant), mode: remb.mode, reference: remb.reference, notes: remb.notes })
    })
    setSaving(false)
    if (res.ok) {
      const data = await res.json()
      toast.success(data.solde ? 'Credit solde !' : 'Remboursement enregistre. Reste : ' + formatMontant(data.nouveauSolde))
      setShowRemb(null); setRemb({ montant: '', mode: 'ESPECES', reference: '', notes: '' }); fetchCredits()
    } else { const e = await res.json(); toast.error(e.error ?? 'Erreur') }
  }

  const stats = {
    enRetard: credits.filter(c => c.statut === 'EN_RETARD').length,
    encours: credits.filter(c => ['EN_COURS', 'EN_RETARD'].includes(c.statut)).reduce((s, c) => s + c.soldeRestant, 0),
  }

  const filtres = [
    { val: '', label: 'Tous' }, { val: 'EN_COURS', label: 'En cours' },
    { val: 'EN_RETARD', label: 'Retard' }, { val: 'SOLDE', label: 'Soldes' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Credits clients</h1>
        <p className="text-sm text-gray-500">Encours total : {formatMontant(stats.encours)}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3 flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-xl"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
          <div><p className="text-xs text-gray-400">En retard</p><p className="text-xl font-bold text-red-600">{stats.enRetard}</p></div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl"><CreditCard className="w-5 h-5 text-blue-500" /></div>
          <div><p className="text-xs text-gray-400">Total credits</p><p className="text-xl font-bold text-blue-600">{credits.length}</p></div>
        </div>
      </div>

      {/* Filtres — scrollable horizontal sur mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {filtres.map(f => (
          <button key={f.val} onClick={() => setFiltreStatut(f.val)}
            className={'px-4 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap touch-manipulation ' + (filtreStatut === f.val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200')}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {loading && <p className="text-gray-400 text-sm">Chargement...</p>}
        {credits.map(c => {
          const nom = ((c.client.prenom ?? '') + ' ' + c.client.nom).trim()
          const jours = c.statut === 'EN_RETARD' ? joursDepuis(c.echeance) : 0
          const progres = ((c.montantInitial - c.soldeRestant) / c.montantInitial) * 100
          const isOpen = expanded === c.id
          return (
            <div key={c.id} className={'card overflow-hidden ' + (c.statut === 'EN_RETARD' ? 'border-red-200' : '')}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ' + (c.statut === 'EN_RETARD' ? 'bg-red-100 text-red-700' : c.statut === 'SOLDE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                    {nom.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">{nom}</p>
                      <span className={'badge text-xs ' + getStatutCreditBadgeClass(c.statut)}>{statutCreditLabel(c.statut)}</span>
                      {jours > 0 && <span className="text-xs text-red-600 font-medium">{jours}j retard</span>}
                    </div>
                    {c.client.telephone && <p className="text-xs text-gray-400">{c.client.telephone}</p>}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className={'text-base font-bold ' + (c.statut === 'EN_RETARD' ? 'text-red-600' : 'text-gray-900')}>{formatMontant(c.soldeRestant)}</p>
                    <p className="text-xs text-gray-400">/ {formatMontant(c.montantInitial)}</p>
                  </div>
                </div>

                {c.statut !== 'ANNULE' && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Rembourse : {progres.toFixed(0)}%</span>
                      <span>Echeance : {formatDate(c.echeance)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={'h-1.5 rounded-full ' + (c.statut === 'SOLDE' ? 'bg-green-500' : c.statut === 'EN_RETARD' ? 'bg-red-500' : 'bg-blue-500')}
                        style={{ width: Math.min(100, progres) + '%' }} />
                    </div>
                  </div>
                )}

                {!['SOLDE', 'ANNULE'].includes(c.statut) && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => { setShowRemb(showRemb === c.id ? null : c.id); setRemb({ montant: String(c.soldeRestant), mode: 'ESPECES', reference: '', notes: '' }) }}
                      className="btn-success text-xs px-3 py-2 flex items-center gap-1.5 touch-manipulation">
                      <Plus className="w-3.5 h-3.5" /> Remboursement
                    </button>
                    <button onClick={() => setExpanded(isOpen ? null : c.id)}
                      className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 touch-manipulation">
                      Historique <ChevronDown className={'w-3.5 h-3.5 transition-transform ' + (isOpen ? 'rotate-180' : '')} />
                    </button>
                  </div>
                )}
                {c.statut === 'SOLDE' && (
                  <div className="mt-3 flex items-center gap-1.5 text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4" /> Credit entierement rembourse
                  </div>
                )}
              </div>

              {showRemb === c.id && (
                <div className="border-t border-gray-100 bg-green-50 p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Enregistrer un remboursement</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Montant (FCFA) *</label>
                      <input type="number" min="1" max={c.soldeRestant} step="100" className="input-field text-sm"
                        value={remb.montant} onChange={e => setRemb(r => ({ ...r, montant: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Mode *</label>
                      <select className="input-field text-sm" value={remb.mode} onChange={e => setRemb(r => ({ ...r, mode: e.target.value }))}>
                        {MODES.map(m => <option key={m} value={m}>{modePaymentLabel(m)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Reference</label>
                      <input className="input-field text-sm" value={remb.reference} onChange={e => setRemb(r => ({ ...r, reference: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                      <input className="input-field text-sm" value={remb.notes} onChange={e => setRemb(r => ({ ...r, notes: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setShowRemb(null)} className="btn-secondary text-xs px-3 py-2">Annuler</button>
                    <button onClick={() => enregistrerRemb(c.id, c.soldeRestant)} disabled={saving}
                      className="btn-success text-xs px-4 py-2 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> {saving ? 'Enregistrement...' : 'Confirmer'}
                    </button>
                  </div>
                </div>
              )}

              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">HISTORIQUE</p>
                  {c.remboursements.length === 0 && <p className="text-xs text-gray-400">Aucun remboursement</p>}
                  {c.remboursements.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                      <span className="text-gray-600">{modePaymentLabel(r.mode)}</span>
                      <span className="font-semibold text-green-700">+{formatMontant(r.montant)}</span>
                      <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {!loading && credits.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <CreditCard className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Aucun credit</p>
          </div>
        )}
      </div>
    </div>
  )
}
