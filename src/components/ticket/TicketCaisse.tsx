'use client'
// src/components/ticket/TicketCaisse.tsx
import { useRef } from 'react'
import { Printer } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface TicketProps {
  vente: {
    numero: string
    createdAt: string
    montantHT: number
    montantTTC: number
    remise: number
    montantPaye: number
    statut: string
    client?: { nom: string; prenom?: string; telephone?: string } | null
    user?: { name?: string | null }
    lignes: {
      quantite: number
      prixUnitaire: number
      remiseLigne: number
      produit: { libelle: string; reference: string }
    }[]
    paiements: { montant: number; mode: string }[]
  }
  boutique?: { nom: string; adresse?: string; telephone?: string }
  onClose?: () => void
}

const modeLabel: Record<string, string> = {
  ESPECES: 'Espèces', MOBILE_MONEY: 'Mobile Money',
  CHEQUE: 'Chèque', VIREMENT: 'Virement', CREDIT: 'Crédit',
}

export function TicketCaisse({ vente, boutique, onClose }: TicketProps) {
  const ticketRef = useRef<HTMLDivElement>(null)

  function imprimer() {
    const contenu = ticketRef.current?.innerHTML
    if (!contenu) return
    const fenetre = window.open('', '_blank', 'width=400,height=600')
    if (!fenetre) return
    fenetre.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ticket ${vente.numero}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 11px; width: 72mm; padding: 4mm; }
          .centre { text-align: center; }
          .ligne { display: flex; justify-content: space-between; margin: 2px 0; }
          .separateur { border-top: 1px dashed #000; margin: 6px 0; }
          .gras { font-weight: bold; }
          .grand { font-size: 14px; }
          .petit { font-size: 9px; color: #555; }
        </style>
      </head>
      <body onload="window.print(); window.close()">
        ${contenu}
      </body>
      </html>
    `)
    fenetre.document.close()
  }

  const resteAPayer = vente.montantTTC - vente.montantPaye
  const monnaie = vente.paiements.filter(p => p.mode === 'ESPECES').reduce((s, p) => s + p.montant, 0) - vente.montantTTC

  return (
    <div>
      {/* Ticket imprimable */}
      <div ref={ticketRef} style={{ fontFamily: "'Courier New', monospace", fontSize: '11px', maxWidth: '280px' }}>
        {/* En-tête */}
        <div className="centre" style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div className="gras grand" style={{ fontWeight: 'bold', fontSize: '14px' }}>{boutique?.nom ?? 'Ma Boutique'}</div>
          {boutique?.adresse && <div className="petit" style={{ fontSize: '9px', color: '#555' }}>{boutique.adresse}</div>}
          {boutique?.telephone && <div className="petit" style={{ fontSize: '9px', color: '#555' }}>Tél : {boutique.telephone}</div>}
        </div>

        <div className="separateur" style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        <div className="ligne" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
          <span>Ticket N°</span><span className="gras" style={{ fontWeight: 'bold' }}>{vente.numero}</span>
        </div>
        <div className="ligne" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
          <span>Date</span><span>{formatDate(vente.createdAt)}</span>
        </div>
        {vente.user?.name && (
          <div className="ligne" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span>Vendeur</span><span>{vente.user.name}</span>
          </div>
        )}
        {vente.client && (
          <div className="ligne" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span>Client</span><span>{vente.client.prenom ?? ''} {vente.client.nom}</span>
          </div>
        )}

        <div className="separateur" style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* Articles */}
        <div className="gras" style={{ fontWeight: 'bold', marginBottom: '4px' }}>ARTICLES</div>
        {vente.lignes.map((l, i) => (
          <div key={i} style={{ marginBottom: '3px' }}>
            <div className="gras" style={{ fontWeight: 'bold', fontSize: '10px' }}>{l.produit.libelle}</div>
            <div className="ligne" style={{ display: 'flex', justifyContent: 'space-between', margin: '1px 0', paddingLeft: '8px', fontSize: '10px' }}>
              <span>{l.quantite} x {l.prixUnitaire.toLocaleString('fr-FR')}</span>
              <span>{(l.quantite * l.prixUnitaire).toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>
        ))}

        <div className="separateur" style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* Totaux */}
        {vente.remise > 0 && (
          <div className="ligne" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span>Sous-total</span><span>{vente.montantHT.toLocaleString('fr-FR')} FCFA</span>
          </div>
        )}
        {vente.remise > 0 && (
          <div className="ligne" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span>Remise</span><span>-{vente.remise.toLocaleString('fr-FR')} FCFA</span>
          </div>
        )}
        <div className="ligne gras grand" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', margin: '4px 0' }}>
          <span>TOTAL</span><span>{vente.montantTTC.toLocaleString('fr-FR')} FCFA</span>
        </div>

        <div className="separateur" style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* Paiements */}
        {vente.paiements.map((p, i) => (
          <div key={i} className="ligne" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span>{modeLabel[p.mode] ?? p.mode}</span>
            <span>{p.montant.toLocaleString('fr-FR')} FCFA</span>
          </div>
        ))}
        {monnaie > 0 && (
          <div className="ligne" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span>Monnaie rendue</span><span>{monnaie.toLocaleString('fr-FR')} FCFA</span>
          </div>
        )}
        {resteAPayer > 0 && (
          <div className="ligne gras" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', margin: '2px 0', color: '#cc0000' }}>
            <span>Reste à payer</span><span>{resteAPayer.toLocaleString('fr-FR')} FCFA</span>
          </div>
        )}

        <div className="separateur" style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        <div className="centre petit" style={{ textAlign: 'center', fontSize: '9px', color: '#555' }}>
          <div>Merci pour votre achat !</div>
          <div>Conservez ce ticket</div>
        </div>
      </div>

      {/* Boutons (pas imprimés) */}
      <div className="no-print flex gap-3 mt-5">
        {onClose && (
          <button onClick={onClose} className="btn-secondary flex-1">Fermer</button>
        )}
        <button onClick={imprimer} className="btn-primary flex-1 flex items-center justify-center gap-2">
          <Printer className="w-4 h-4" /> Imprimer le ticket
        </button>
      </div>
    </div>
  )
}
