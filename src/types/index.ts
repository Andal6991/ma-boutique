// src/types/index.ts
export type Role = 'ADMIN' | 'GERANT' | 'VENDEUR'

export type StatutVente = 'EN_ATTENTE' | 'PARTIELLEMENT_PAYEE' | 'PAYEE' | 'ANNULEE'
export type StatutCredit = 'EN_COURS' | 'EN_RETARD' | 'SOLDE' | 'ANNULE'
export type ModePayment = 'ESPECES' | 'MOBILE_MONEY' | 'CHEQUE' | 'VIREMENT' | 'CREDIT'

export interface DashboardStats {
  caJour: number
  caMois: number
  caMoisPrecedent: number
  nbVentesJour: number
  encoursTotalCredits: number
  nbCreditsEnRetard: number
  nbAlerteStock: number
  ventesParJour: { date: string; montant: number }[]
  creditsEnRetard: {
    id: string
    clientNom: string
    soldeRestant: number
    echeance: string
    joursRetard: number
  }[]
  topProduits: { libelle: string; quantite: number; montant: number }[]
}
