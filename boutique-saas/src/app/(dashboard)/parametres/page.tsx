'use client'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { User, Building, Lock, Bell, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ParametresPage() {
  const { data: session } = useSession()
  const [mdpForm, setMdpForm] = useState({ ancien: '', nouveau: '', confirmation: '' })
  const [showPwd, setShowPwd] = useState({ ancien: false, nouveau: false, conf: false })
  const [saving, setSaving] = useState(false)

  async function changerMotDePasse(e: React.FormEvent) {
    e.preventDefault()
    if (mdpForm.nouveau !== mdpForm.confirmation) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    setSaving(true)
    const res = await fetch('/api/users/password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ancienPassword: mdpForm.ancien, nouveauPassword: mdpForm.nouveau, confirmation: mdpForm.confirmation }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Mot de passe modifie avec succes !')
      setMdpForm({ ancien: '', nouveau: '', confirmation: '' })
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Erreur')
    }
  }

  const PwdInput = ({ label, field, showField }: { label: string; field: 'ancien' | 'nouveau' | 'confirmation'; showField: 'ancien' | 'nouveau' | 'conf' }) => (
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

      {/* Profil */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-50 rounded-lg"><User className="w-5 h-5 text-blue-600" /></div>
          <h2 className="text-sm font-semibold text-gray-700">Mon profil</h2>
        </div>
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
      </div>

      {/* Changement de mot de passe */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-50 rounded-lg"><Lock className="w-5 h-5 text-amber-600" /></div>
          <h2 className="text-sm font-semibold text-gray-700">Changer mon mot de passe</h2>
        </div>
        <form onSubmit={changerMotDePasse} className="space-y-3">
          <PwdInput label="Mot de passe actuel" field="ancien" showField="ancien" />
          <PwdInput label="Nouveau mot de passe (min. 6 caracteres)" field="nouveau" showField="nouveau" />
          <PwdInput label="Confirmer le nouveau mot de passe" field="confirmation" showField="conf" />
          {mdpForm.nouveau && mdpForm.confirmation && mdpForm.nouveau !== mdpForm.confirmation && (
            <p className="text-xs text-red-600">Les mots de passe ne correspondent pas</p>
          )}
          <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto px-6">
            {saving ? 'Modification...' : 'Modifier mon mot de passe'}
          </button>
        </form>
      </div>

      {/* Boutique */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-50 rounded-lg"><Building className="w-5 h-5 text-green-600" /></div>
          <h2 className="text-sm font-semibold text-gray-700">Ma boutique</h2>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la boutique</label>
          <input className="input-field bg-gray-50" defaultValue={session?.user?.tenantNom ?? ''} readOnly />
        </div>
      </div>

      {/* Notifications */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-50 rounded-lg"><Bell className="w-5 h-5 text-purple-600" /></div>
          <h2 className="text-sm font-semibold text-gray-700">Notifications</h2>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Alertes credits en retard', desc: 'Notification quand un credit depasse sa date echeance' },
            { label: 'Alertes stock bas', desc: 'Notification quand un produit atteint son seuil minimum' },
          ].map(n => (
            <label key={n.label} className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="mt-0.5 rounded text-blue-600" style={{width:'18px',height:'18px',minWidth:'18px',minHeight:'18px'}} />
              <div>
                <p className="text-sm font-medium text-gray-700">{n.label}</p>
                <p className="text-xs text-gray-400">{n.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
