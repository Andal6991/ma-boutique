'use client'
// src/components/ventes/CommentairesVente.tsx
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { MessageCircle, AlertTriangle, Send } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Commentaire {
  id: string; contenu: string; type: string; createdAt: string
  user: { name: string | null; role: string }
}

const typeStyle: Record<string, string> = {
  NOTE: 'bg-gray-50 border-gray-200',
  DEMANDE_SUPPRESSION: 'bg-red-50 border-red-200',
  VALIDATION_SUPPRESSION: 'bg-green-50 border-green-200',
}

const typeLabel: Record<string, string> = {
  NOTE: 'Note',
  DEMANDE_SUPPRESSION: 'Demande de suppression',
  VALIDATION_SUPPRESSION: 'Validation',
}

const roleLabel: Record<string, string> = { ADMIN: 'Admin', GERANT: 'Gérant', VENDEUR: 'Vendeur' }

interface Props {
  venteId: string
  statut: string
  onAnnulationDemandee?: () => void
}

export function CommentairesVente({ venteId, statut, onAnnulationDemandee }: Props) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const [commentaires, setCommentaires] = useState<Commentaire[]>([])
  const [contenu, setContenu] = useState('')
  const [type, setType] = useState<'NOTE' | 'DEMANDE_SUPPRESSION'>('NOTE')
  const [sending, setSending] = useState(false)

  const hasDemandeSuppression = commentaires.some(c => c.type === 'DEMANDE_SUPPRESSION')

  useEffect(() => {
    fetch('/api/ventes/' + venteId + '/commentaires')
      .then(r => r.json()).then(setCommentaires)
  }, [venteId])

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    if (!contenu.trim()) return
    setSending(true)
    const res = await fetch('/api/ventes/' + venteId + '/commentaires', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contenu, type }),
    })
    setSending(false)
    if (res.ok) {
      const c = await res.json()
      setCommentaires(prev => [...prev, c])
      setContenu('')
      setType('NOTE')
      if (type === 'DEMANDE_SUPPRESSION') {
        toast.success("Demande de suppression envoyée à l'administrateur")
      }
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Erreur')
    }
  }

  return (
    <div className="p-5 space-y-4">
      {/* Alerte si demande en attente */}
      {hasDemandeSuppression && !isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">Une demande de suppression est en attente de validation par l'administrateur.</p>
        </div>
      )}
      {hasDemandeSuppression && isAdmin && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-red-700 font-semibold mb-1">Demande de suppression en attente</p>
            <p className="text-xs text-red-600">Vous pouvez annuler la vente directement depuis l'historique (bouton rouge).</p>
          </div>
        </div>
      )}

      {/* Liste commentaires */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {commentaires.length === 0 && (
          <div className="text-center py-6">
            <MessageCircle className="w-7 h-7 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Aucun commentaire</p>
          </div>
        )}
        {commentaires.map(c => (
          <div key={c.id} className={'border rounded-xl p-3 ' + (typeStyle[c.type] ?? 'bg-gray-50 border-gray-200')}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-700">{c.user.name ?? 'Utilisateur'}</span>
              <span className="text-xs text-gray-400">{roleLabel[c.user.role]}</span>
              {c.type !== 'NOTE' && (
                <span className={'text-xs font-medium px-2 py-0.5 rounded-full ml-auto ' + (c.type === 'DEMANDE_SUPPRESSION' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                  {typeLabel[c.type]}
                </span>
              )}
              <span className="text-xs text-gray-400 ml-auto">{formatDate(c.createdAt)}</span>
            </div>
            <p className="text-sm text-gray-700">{c.contenu}</p>
          </div>
        ))}
      </div>

      {/* Formulaire */}
      {statut !== 'ANNULEE' && (
        <form onSubmit={envoyer} className="space-y-2 border-t border-gray-100 pt-4">
          {/* Type de commentaire (vendeur/gérant seulement) */}
          {!isAdmin && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setType('NOTE')}
                className={'flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ' + (type === 'NOTE' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600')}>
                Note
              </button>
              <button type="button" onClick={() => setType('DEMANDE_SUPPRESSION')}
                className={'flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ' + (type === 'DEMANDE_SUPPRESSION' ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600')}>
                Demander suppression
              </button>
            </div>
          )}

          {type === 'DEMANDE_SUPPRESSION' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-700">Expliquez la raison de la demande. L'admin recevra une alerte et décidera de l'annulation.</p>
            </div>
          )}

          <div className="flex gap-2">
            <input className="input-field flex-1 text-sm" placeholder={type === 'DEMANDE_SUPPRESSION' ? 'Raison de la demande...' : 'Ajouter une note...'}
              value={contenu} onChange={e => setContenu(e.target.value)} />
            <button type="submit" disabled={sending || !contenu.trim()}
              className={'p-2.5 rounded-lg transition-colors ' + (type === 'DEMANDE_SUPPRESSION' ? 'bg-red-600 hover:bg-red-700 text-white' : 'btn-primary')}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
