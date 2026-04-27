'use client'
// src/app/(dashboard)/demande-boutique/page.tsx
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Building, Send, CheckCircle, Phone } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DemandeBoutiquePage() {
  const { data: session } = useSession()
  const [form, setForm] = useState({ nomBoutique: '', adresse: '', telephone: '', notes: '' })
  const [envoye, setEnvoye] = useState(false)
  const [sending, setSending] = useState(false)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    // Envoyer la demande par email ou créer une notification SuperAdmin
    const res = await fetch('/api/demande-boutique', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, userEmail: session?.user?.email, userName: session?.user?.name }),
    })
    setSending(false)
    if (res.ok) {
      setEnvoye(true)
    } else {
      toast.error('Erreur lors de l envoi')
    }
  }

  if (envoye) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Demande envoyee !</h1>
        <p className="text-gray-500 text-sm mb-6">
          Nous allons créer votre 2e boutique et vous envoyer les identifiants sous 24h.
        </p>
        <div className="card p-4 text-left">
          <p className="text-sm font-medium text-gray-700 mb-2">Vous pouvez aussi nous contacter directement :</p>
          <a href="tel:+22666810504" className="flex items-center gap-2 text-blue-600 font-semibold text-lg">
            <Phone className="w-5 h-5" /> +226 66 81 05 04
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Ajouter une 2e boutique</h1>
        <p className="text-sm text-gray-500">
          Vous gérez plusieurs points de vente ? Nous créons votre 2e espace en moins de 24h.
          Vous pourrez basculer entre vos boutiques depuis le header.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800 font-medium mb-1">Comment ça marche ?</p>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
          <li>Remplissez ce formulaire avec les infos de votre 2e boutique</li>
          <li>Notre équipe crée votre espace en moins de 24h</li>
          <li>Vous recevez un email avec les accès</li>
          <li>Vous switchez entre vos boutiques depuis le bouton en haut à gauche</li>
        </ol>
      </div>

      <div className="card p-5">
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la 2e boutique *</label>
            <input className="input-field" required placeholder="Ex: Boutique Annexe Gounghin"
              value={form.nomBoutique} onChange={e => setForm(f => ({ ...f, nomBoutique: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse / Localisation</label>
            <input className="input-field" placeholder="Ex: Secteur 30, Ouagadougou"
              value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone de contact</label>
            <input type="tel" className="input-field" placeholder="+226 70 00 00 00"
              value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes supplémentaires</label>
            <textarea className="input-field resize-none" rows={2} placeholder="Plan souhaité, informations particulières..."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button type="submit" disabled={sending} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            <Send className="w-4 h-4" />
            {sending ? 'Envoi en cours...' : 'Envoyer la demande'}
          </button>
        </form>
      </div>

      <div className="card p-4 flex items-center gap-4">
        <Phone className="w-6 h-6 text-blue-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-700">Vous préférez appeler ?</p>
          <a href="tel:+22666810504" className="text-blue-600 font-bold text-lg">+226 66 81 05 04</a>
        </div>
      </div>
    </div>
  )
}
