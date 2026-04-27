'use client'
import { useState, useEffect } from 'react'
import { Search, Plus, Trash2, CheckCircle, ShoppingCart, Printer, XCircle, MessageCircle } from 'lucide-react'
import { formatMontant, formatDate, statutVenteLabel, getStatutVenteBadgeClass, modePaymentLabel } from '@/lib/utils'
import { TicketCaisse } from '@/components/ticket/TicketCaisse'
import { CommentairesVente } from '@/components/ventes/CommentairesVente'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

interface Produit { id: string; reference: string; libelle: string; prixHT: number; stock: number }
interface Client { id: string; nom: string; prenom?: string; telephone?: string }
interface Ligne { produit: Produit; quantite: number; prixUnitaire: number }
interface Vente {
  id: string; numero: string; montantHT: number; montantTTC: number; montantPaye: number
  remise: number; statut: string; createdAt: string; raisonAnnulation?: string
  client?: { nom: string; prenom?: string } | null
  user?: { name?: string | null }
  lignes: { quantite: number; prixUnitaire: number; remiseLigne: number; produit: { libelle: string; reference: string } }[]
  paiements: { montant: number; mode: string }[]
}

const MODES = ['ESPECES', 'MOBILE_MONEY', 'CHEQUE', 'VIREMENT', 'CREDIT']

export default function VentesPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const [tab, setTab] = useState<'caisse'|'historique'>('caisse')
  const [produits, setProduits] = useState<Produit[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [ventes, setVentes] = useState<Vente[]>([])
  const [searchP, setSearchP] = useState('')
  const [searchC, setSearchC] = useState('')
  const [panier, setPanier] = useState<Ligne[]>([])
  const [clientId, setClientId] = useState('')
  const [remise, setRemise] = useState(0)
  const [paiements, setPaiements] = useState([{ montant: '', mode: 'ESPECES' }])
  const [echeance, setEcheance] = useState('')
  const [saving, setSaving] = useState(false)
  const [venteSucces, setVenteSucces] = useState<Vente | null>(null)
  const [showTicket, setShowTicket] = useState<Vente | null>(null)
  const [showAnnuler, setShowAnnuler] = useState<Vente | null>(null)
  const [showCommentaires, setShowCommentaires] = useState<Vente | null>(null)
  const [raison, setRaison] = useState('')
  const [loadingVentes, setLoadingVentes] = useState(false)

  useEffect(() => {
    fetch('/api/produits?q=' + encodeURIComponent(searchP)).then(r => r.json()).then(setProduits)
  }, [searchP])

  useEffect(() => {
    if (searchC.length >= 1) fetch('/api/clients?q=' + encodeURIComponent(searchC)).then(r => r.json()).then(setClients)
  }, [searchC])

  async function fetchVentes() {
    setLoadingVentes(true)
    const r = await fetch('/api/ventes')
    const d = await r.json()
    setVentes(d.ventes ?? [])
    setLoadingVentes(false)
  }

  useEffect(() => { if (tab === 'historique') fetchVentes() }, [tab])

  function ajouterProduit(p: Produit) {
    setPanier(prev => {
      const idx = prev.findIndex(l => l.produit.id === p.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], quantite: next[idx].quantite + 1 }; return next }
      return [...prev, { produit: p, quantite: 1, prixUnitaire: p.prixHT }]
    })
  }

  function majQte(id: string, q: number) {
    if (q <= 0) setPanier(p => p.filter(l => l.produit.id !== id))
    else setPanier(p => p.map(l => l.produit.id === id ? { ...l, quantite: q } : l))
  }

  const sousTotal = panier.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)
  const total = Math.max(0, sousTotal - remise)
  const totalPaie = paiements.reduce((s, p) => s + (parseFloat(p.montant) || 0), 0)
  const resteAPayer = total - totalPaie
  const aCredit = paiements.some(p => p.mode === 'CREDIT')

  async function valider() {
    if (panier.length === 0) return toast.error('Panier vide')
    if (aCredit && !clientId) return toast.error('Selectionnez un client pour le credit')
    if (aCredit && !echeance) return toast.error("Date d'echeance requise")
    setSaving(true)
    const res = await fetch('/api/ventes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: clientId || undefined, remise,
        lignes: panier.map(l => ({ produitId: l.produit.id, quantite: l.quantite, prixUnitaire: l.prixUnitaire, remiseLigne: 0 })),
        paiements: paiements.filter(p => parseFloat(p.montant) > 0).map(p => ({ montant: parseFloat(p.montant), mode: p.mode })),
        echeanceCredit: echeance || undefined,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const data = await res.json()
      toast.success('Vente ' + data.numero + ' enregistree !')
      // Fetch vente complete pour le ticket
      const vr = await fetch('/api/ventes/' + data.id)
      const vd = await vr.json()
      setVenteSucces(vd)
      setShowTicket(vd)
      setPanier([]); setClientId(''); setRemise(0)
      setPaiements([{ montant: '', mode: 'ESPECES' }]); setEcheance('')
    } else { const e = await res.json(); toast.error(e.error ?? 'Erreur') }
  }

  async function annulerVente() {
    if (!showAnnuler || !raison.trim()) return toast.error('La raison est obligatoire')
    const res = await fetch('/api/ventes/' + showAnnuler.id + '/annuler', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raison }),
    })
    if (res.ok) {
      toast.success('Vente annulee')
      setShowAnnuler(null); setRaison(''); fetchVentes()
    } else { const e = await res.json(); toast.error(e.error ?? 'Erreur') }
  }

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-full">
        {(['caisse', 'historique'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={'flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ' + (tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
            {t === 'caisse' ? 'Caisse' : 'Historique'}
          </button>
        ))}
      </div>

      {/* CAISSE */}
      {tab === 'caisse' && (
        <div className="space-y-3">
          <div className="card p-3">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input-field pl-10" placeholder="Chercher un produit..." value={searchP} onChange={e => setSearchP(e.target.value)} />
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
              {produits.slice(0, 10).map(p => (
                <button key={p.id} onClick={() => ajouterProduit(p)} disabled={p.stock === 0}
                  className="w-full flex items-center justify-between px-2 py-2.5 hover:bg-blue-50 text-left disabled:opacity-40 transition-colors touch-manipulation">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.libelle}</p>
                    <p className="text-xs text-gray-400">{p.reference} - stock: {p.stock}</p>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <p className="text-sm font-bold text-blue-700 whitespace-nowrap">{formatMontant(p.prixHT)}</p>
                    <Plus className="w-4 h-4 text-blue-400 ml-auto" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {panier.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">Panier — {panier.length} article{panier.length > 1 ? 's' : ''}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[380px]">
                  <tbody>
                    {panier.map(l => (
                      <tr key={l.produit.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-2.5 px-3 max-w-[120px]">
                          <p className="font-medium text-gray-800 truncate">{l.produit.libelle}</p>
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-1">
                            <button onClick={() => majQte(l.produit.id, l.quantite - 1)} className="w-7 h-7 rounded bg-gray-100 text-sm font-bold flex items-center justify-center touch-manipulation">-</button>
                            <span className="w-8 text-center text-sm font-medium">{l.quantite}</span>
                            <button onClick={() => majQte(l.produit.id, l.quantite + 1)} className="w-7 h-7 rounded bg-gray-100 text-sm font-bold flex items-center justify-center touch-manipulation">+</button>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-semibold whitespace-nowrap">{formatMontant(l.quantite * l.prixUnitaire)}</td>
                        <td className="py-2.5 px-2">
                          <button onClick={() => setPanier(p => p.filter(x => x.produit.id !== l.produit.id))} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client (optionnel)</label>
              <input className="input-field mb-1" placeholder="Chercher client..." value={searchC} onChange={e => setSearchC(e.target.value)} />
              {clients.length > 0 && searchC && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {clients.slice(0, 4).map(c => (
                    <button key={c.id} onClick={() => { setClientId(c.id); setSearchC((c.prenom ?? '') + ' ' + c.nom); setClients([]) }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0 touch-manipulation">
                      <span className="font-medium">{c.prenom} {c.nom}</span>
                      {c.telephone && <span className="text-gray-400 ml-2 text-xs">{c.telephone}</span>}
                    </button>
                  ))}
                </div>
              )}
              {clientId && <button onClick={() => { setClientId(''); setSearchC('') }} className="text-xs text-red-500 mt-1">x Retirer le client</button>}
            </div>

            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Sous-total</span><span className="font-medium">{formatMontant(sousTotal)}</span></div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 shrink-0">Remise</label>
                <input type="number" min="0" step="100" value={remise} onChange={e => setRemise(parseFloat(e.target.value) || 0)} className="input-field text-right flex-1" />
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-bold text-gray-900">TOTAL</span>
                <span className="text-lg font-bold text-blue-700">{formatMontant(total)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Reglement</p>
              {paiements.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input type="number" min="0" step="100" placeholder="Montant" value={p.montant}
                    onChange={e => setPaiements(prev => prev.map((x, j) => j === i ? { ...x, montant: e.target.value } : x))}
                    className="input-field flex-1" />
                  <select value={p.mode} onChange={e => setPaiements(prev => prev.map((x, j) => j === i ? { ...x, mode: e.target.value } : x))}
                    className="input-field w-32 shrink-0">
                    {MODES.map(m => <option key={m} value={m}>{modePaymentLabel(m)}</option>)}
                  </select>
                </div>
              ))}
              <button onClick={() => setPaiements(p => [...p, { montant: String(Math.max(0, resteAPayer)), mode: 'ESPECES' }])}
                className="text-xs text-blue-600">+ Ajouter un mode de paiement</button>
            </div>

            {aCredit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date echeance credit *</label>
                <input type="date" className="input-field" value={echeance} onChange={e => setEcheance(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
              </div>
            )}

            <div className="flex items-center justify-between text-sm border-t pt-2">
              <span className={resteAPayer > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                {resteAPayer > 0 ? 'Reste : ' + formatMontant(resteAPayer) : 'Regle v'}
              </span>
            </div>

            <button onClick={valider} disabled={saving || panier.length === 0} className="btn-primary w-full py-3 text-base font-semibold">
              {saving ? 'Enregistrement...' : 'Valider la vente'}
            </button>
          </div>
        </div>
      )}

      {/* HISTORIQUE */}
      {tab === 'historique' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="table-header border-b border-gray-200">
                  <th className="text-left py-3 px-3">Ticket</th>
                  <th className="text-right py-3 px-3">Montant</th>
                  <th className="text-center py-3 px-3">Statut</th>
                  <th className="text-center py-3 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingVentes && <tr><td colSpan={4} className="py-8 text-center text-gray-400">Chargement...</td></tr>}
                {ventes.map(v => (
                  <tr key={v.id} className={'border-b border-gray-100 last:border-0 hover:bg-gray-50 ' + (v.statut === 'ANNULEE' ? 'opacity-60' : '')}>
                    <td className="py-3 px-3">
                      <p className="font-mono text-xs text-gray-600">{v.numero}</p>
                      {v.client && <p className="text-xs text-gray-400">{v.client.prenom} {v.client.nom}</p>}
                      <p className="text-xs text-gray-400">{formatDate(v.createdAt)}</p>
                      {v.raisonAnnulation && <p className="text-xs text-red-500 mt-0.5">Annulee : {v.raisonAnnulation}</p>}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold whitespace-nowrap">{formatMontant(v.montantTTC)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={'badge ' + getStatutVenteBadgeClass(v.statut)}>{statutVenteLabel(v.statut)}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setShowTicket(v)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600" title="Voir le ticket">
                          <Printer className="w-4 h-4" />
                        </button>
                        {v.statut !== 'ANNULEE' && (
                          <button onClick={() => { setShowCommentaires(v) }} className="p-2 hover:bg-green-50 rounded-lg text-green-600" title="Commentaires">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && v.statut !== 'ANNULEE' && (
                          <button onClick={() => { setShowAnnuler(v); setRaison('') }} className="p-2 hover:bg-red-50 rounded-lg text-red-500" title="Annuler la vente">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loadingVentes && ventes.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-gray-400">Aucune vente</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Ticket */}
      {showTicket && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90dvh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">Ticket de caisse</h2>
              <button onClick={() => setShowTicket(null)} className="p-2 text-gray-400 rounded-lg text-lg leading-none">x</button>
            </div>
            <TicketCaisse
              vente={showTicket}
              boutique={{ nom: session?.user?.tenantNom ?? 'Ma Boutique' }}
              onClose={() => setShowTicket(null)}
            />
          </div>
        </div>
      )}

      {/* Modal Commentaires */}
      {showCommentaires && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[85dvh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold">Commentaires — {showCommentaires.numero}</h2>
              <button onClick={() => setShowCommentaires(null)} className="p-2 text-gray-400 rounded-lg text-lg leading-none">x</button>
            </div>
            <CommentairesVente venteId={showCommentaires.id} statut={showCommentaires.statut} onAnnulationDemandee={() => { setShowCommentaires(null); fetchVentes() }} />
          </div>
        </div>
      )}

      {/* Modal Annulation (Admin uniquement) */}
      {showAnnuler && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl p-5">
            <h2 className="text-base font-bold text-gray-900 mb-1">Annuler la vente {showAnnuler.numero}</h2>
            <p className="text-sm text-gray-500 mb-4">
              Le stock sera automatiquement restitue. Cette action est reservee aux administrateurs.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Raison de l'annulation *</label>
              <input className="input-field" value={raison} onChange={e => setRaison(e.target.value)}
                placeholder="Ex: erreur de saisie, retour client..." required />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAnnuler(null)} className="btn-secondary flex-1">Retour</button>
              <button onClick={annulerVente} disabled={!raison.trim()} className="btn-danger flex-1">
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
