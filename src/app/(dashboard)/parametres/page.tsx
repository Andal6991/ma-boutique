'use client'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { User, Building, Lock, Bell, Star, CreditCard, Eye, EyeOff, Save, AlertTriangle } from 'lucide-react'
import { formatMontant } from '@/lib/utils'
import toast from 'react-hot-toast'

const PLANS: Record<string, { label: string; color: string; bg: string }> = {
  STARTER: { label: 'Starter', color: 'text-gray-700', bg: 'bg-gray-100' },
  PRO: { label: 'Pro', color: 'text-blue-700', bg: 'bg-blue-100' },
  ENTERPRISE: { label: 'Enterprise', color: 'text-purple-700', bg: 'bg-purple-100' },
}

function Section({ icon: Icon, title, color, children }: any) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={'p-2 rounded-lg ' + color}><Icon className="w-5 h-5" /></div>
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function BarreLimite({ label, actuel, max, pct }: any) {
  const couleur = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-blue-500'
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-800">{actuel} / {max === 999999 ? 'Illimite' : max}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={'h-2 rounded-full ' + couleur} style={{ width: pct + '%' }} />
      </div>
      {pct >= 90 && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Limite presque atteinte
        </p>
      )}
    </div>
  )
}

export default function ParametresPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const isAdminOrGerant = ['ADMIN', 'GERANT'].includes(session?.user?.role ?? '')

  const [boutique, setBoutique] = useState<any>(null)
  const [limites, setLimites] = useState<any>(null)
  const [savingBoutique, setSavingBoutique] = useState(false)
  const [savingMdp, setSavingMdp] = useState(false)
  const [mdpForm, setMdpForm] = useState({ ancien: '', nouveau: '', confirmation: '' })
  const [showPwd, setShowPwd] = useState({ ancien: false, nouveau: false, conf: false })

  useEffect(() => {
    fetch('/api/boutique/parametres').then(r => r.json()).then(setBoutique)
    fetch('/api/boutique/limites').then(r => r.json()).then(setLimites)
  }, [])


  const [uploadingLogo, setUploadingLogo] = useState(false)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        setBoutique((b: any) => ({ ...b, logo: data.url }))
        toast.success('Logo uploade !')
      } else {
        toast.error('Erreur upload logo')
      }
    } catch {
      toast.error('Erreur upload')
    }
    setUploadingLogo(false)
  }

  async function sauvegarderBoutique(e: React.FormEvent) {
    e.preventDefault(); setSavingBoutique(true)
    const res = await fetch('/api/boutique/parametres', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(boutique),
    })
    setSavingBoutique(false)
    if (res.ok) toast.success('Boutique mise a jour !')
    else { const err = await res.json(); toast.error(err.error ?? 'Erreur') }
  }

  async function changerMotDePasse(e: React.FormEvent) {
    e.preventDefault()
    if (mdpForm.nouveau !== mdpForm.confirmation) { toast.error('Les mots de passe ne correspondent pas'); return }
    setSavingMdp(true)
    const res = await fetch('/api/users/password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ancienPassword: mdpForm.ancien, nouveauPassword: mdpForm.nouveau, confirmation: mdpForm.confirmation }),
    })
    setSavingMdp(false)
    if (res.ok) { toast.success('Mot de passe modifie !'); setMdpForm({ ancien: '', nouveau: '', confirmation: '' }) }
    else { const err = await res.json(); toast.error(err.error ?? 'Erreur') }
  }

  const PwdInput = ({ label, field, showField }: { label: string; field: keyof typeof mdpForm; showField: keyof typeof showPwd }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input type={showPwd[showField] ? 'text' : 'password'} required className="input-field pr-10"
          value={mdpForm[field]} onChange={e => setMdpForm(f => ({ ...f, [field]: e.target.value }))} />
        <button type="button" onClick={() => setShowPwd(s => ({ ...s, [showField]: !s[showField] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {showPwd[showField] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-lg font-bold text-gray-900">Parametres</h1>

      {/* Mon profil */}
      <Section icon={User} title="Mon profil" color="bg-blue-50 text-blue-600">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
            <input className="input-field bg-gray-50" defaultValue={session?.user?.name ?? ''} readOnly />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input className="input-field bg-gray-50" defaultValue={session?.user?.email ?? ''} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input className="input-field bg-gray-50" defaultValue={session?.user?.role ?? ''} readOnly />
            </div>
          </div>
        </div>
      </Section>

      {/* Paramètres boutique */}
      {isAdminOrGerant && boutique && (
        <Section icon={Building} title="Ma boutique" color="bg-green-50 text-green-600">
          <form onSubmit={sauvegarderBoutique} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la boutique *</label>
              <input className="input-field" value={boutique.nom ?? ''} required
                onChange={e => setBoutique((b: any) => ({ ...b, nom: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">Ce nom apparait sur les tickets de caisse et dans le header</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo de la boutique</label>
              <div className="flex items-center gap-4">
                {boutique.logo ? (
                  <img src={boutique.logo} alt="Logo" className="w-16 h-16 rounded-xl object-contain border border-gray-200 bg-gray-50" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-blue-50 border-2 border-dashed border-blue-200 flex items-center justify-center">
                    <Building className="w-6 h-6 text-blue-300" />
                  </div>
                )}
                <div className="flex-1">
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                  <label htmlFor="logo-upload" className="btn-secondary cursor-pointer text-sm px-4 py-2.5 flex items-center gap-2 w-full justify-center">
                    {uploadingLogo ? 'Upload en cours...' : boutique.logo ? 'Changer le logo' : 'Ajouter un logo'}
                  </label>
                  <p className="text-xs text-gray-400 mt-1 text-center">PNG ou JPG recommande, fond transparent ideal</p>
                </div>
                {boutique.logo && (
                  <button type="button" onClick={() => setBoutique((b: any) => ({ ...b, logo: null }))} className="text-xs text-red-500 hover:text-red-700">
                    Supprimer
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                <input type="tel" className="input-field" value={boutique.telephone ?? ''}
                  onChange={e => setBoutique((b: any) => ({ ...b, telephone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email boutique</label>
                <input type="email" className="input-field" value={boutique.email ?? ''}
                  onChange={e => setBoutique((b: any) => ({ ...b, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input className="input-field" value={boutique.adresse ?? ''}
                onChange={e => setBoutique((b: any) => ({ ...b, adresse: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
                <select className="input-field" value={boutique.devise ?? 'FCFA'}
                  onChange={e => setBoutique((b: any) => ({ ...b, devise: e.target.value }))}>
                  <option value="FCFA">FCFA (Franc CFA)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="USD">USD (Dollar)</option>
                  <option value="GNF">GNF (Franc Guineen)</option>
                  <option value="XOF">XOF (Franc Ouest-Africain)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Couleur principale</label>
                <div className="flex items-center gap-2">
                  <input type="color" className="h-11 w-16 rounded-lg border border-gray-300 cursor-pointer"
                    value={boutique.couleurPrimaire ?? '#1e40af'}
                    onChange={e => setBoutique((b: any) => ({ ...b, couleurPrimaire: e.target.value }))} />
                  <span className="text-sm text-gray-500">{boutique.couleurPrimaire ?? '#1e40af'}</span>
                </div>
              </div>
            </div>
            <button type="submit" disabled={savingBoutique} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              {savingBoutique ? 'Enregistrement...' : 'Sauvegarder la boutique'}
            </button>
          </form>
        </Section>
      )}

      {/* Programme fidélité */}
      {isAdminOrGerant && boutique && (
        <Section icon={Star} title="Programme de fidelite" color="bg-amber-50 text-amber-600">
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              Regle actuelle : {boutique.pointsParMille ?? 1} point(s) par tranche de 1 000 {boutique.devise ?? 'FCFA'}. 
              {' '}{boutique.seuilFidelite ?? 100} points = 1 000 {boutique.devise ?? 'FCFA'} de remise.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Points par 1 000 {boutique.devise}</label>
                <input type="number" min="0" max="100" className="input-field"
                  value={boutique.pointsParMille ?? 1}
                  onChange={e => setBoutique((b: any) => ({ ...b, pointsParMille: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Points pour 1 000 {boutique.devise} de remise</label>
                <input type="number" min="10" className="input-field"
                  value={boutique.seuilFidelite ?? 100}
                  onChange={e => setBoutique((b: any) => ({ ...b, seuilFidelite: parseInt(e.target.value) || 100 }))} />
              </div>
            </div>
            <button onClick={sauvegarderBoutique} disabled={savingBoutique} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" /> Sauvegarder
            </button>
          </div>
        </Section>
      )}

      {/* Abonnement et limites */}
      {limites && (
        <Section icon={CreditCard} title="Mon abonnement" color="bg-purple-50 text-purple-600">
          <div className="flex items-center gap-3 mb-4">
            <span className={'badge text-sm px-3 py-1 ' + (PLANS[limites.plan]?.bg ?? 'bg-gray-100') + ' ' + (PLANS[limites.plan]?.color ?? 'text-gray-700')}>
              Plan {PLANS[limites.plan]?.label ?? limites.plan}
            </span>
            {limites.joursRestants !== null && (
              <span className={'text-sm font-medium ' + (limites.joursRestants <= 7 ? 'text-red-600' : 'text-gray-500')}>
                {limites.joursRestants > 0 ? limites.joursRestants + ' jours restants' : 'Expire'}
              </span>
            )}
          </div>
          <BarreLimite label="Vendeurs" actuel={limites.limites.vendeurs.actuel} max={limites.limites.vendeurs.max} pct={limites.limites.vendeurs.pct} />
          <BarreLimite label="Produits" actuel={limites.limites.produits.actuel} max={limites.limites.produits.max} pct={limites.limites.produits.pct} />
          <BarreLimite label="Clients" actuel={limites.limites.clients.actuel} max={limites.limites.clients.max} pct={limites.limites.clients.pct} />
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Pour augmenter vos limites, contactez votre administrateur Ma Boutique.</p>
          </div>
        </Section>
      )}

      {/* Sécurité */}
      <Section icon={Lock} title="Securite — Changer mon mot de passe" color="bg-red-50 text-red-600">
        <form onSubmit={changerMotDePasse} className="space-y-3">
          <PwdInput label="Mot de passe actuel" field="ancien" showField="ancien" />
          <PwdInput label="Nouveau mot de passe (min. 6 caracteres)" field="nouveau" showField="nouveau" />
          <PwdInput label="Confirmer le nouveau mot de passe" field="confirmation" showField="conf" />
          {mdpForm.nouveau && mdpForm.confirmation && mdpForm.nouveau !== mdpForm.confirmation && (
            <p className="text-xs text-red-600">Les mots de passe ne correspondent pas</p>
          )}
          <button type="submit" disabled={savingMdp} className="btn-primary flex items-center gap-2">
            <Lock className="w-4 h-4" />
            {savingMdp ? 'Modification...' : 'Modifier mon mot de passe'}
          </button>
        </form>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Notifications" color="bg-indigo-50 text-indigo-600">
        <div className="space-y-3">
          {[
            { label: 'Credits en retard', desc: 'Alerte quand un credit depasse sa date d\'echeance' },
            { label: 'Stock bas', desc: 'Alerte quand un produit atteint son seuil minimum' },
            { label: 'Abonnement', desc: 'Rappel 7 jours avant expiration de l\'abonnement' },
          ].map(n => (
            <label key={n.label} className="flex items-start gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded-xl transition-colors">
              <input type="checkbox" defaultChecked className="mt-0.5 rounded"
                style={{ width: '18px', height: '18px', minWidth: '18px' }} />
              <div>
                <p className="text-sm font-medium text-gray-700">{n.label}</p>
                <p className="text-xs text-gray-400">{n.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </Section>
    </div>
  )
}
