// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMontant(montant: number, devise = 'FCFA') {
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(montant))} ${devise}`
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(date))
}

export function joursDepuis(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function generateNumeroVente(dernierNumero?: string): string {
  const annee = new Date().getFullYear()
  if (!dernierNumero) return `V-${annee}-0001`
  const parts = dernierNumero.split('-')
  const seq = parseInt(parts[2] || '0') + 1
  return `V-${annee}-${seq.toString().padStart(4, '0')}`
}

export function statutVenteLabel(statut: string) {
  const labels: Record<string, string> = {
    EN_ATTENTE: 'En attente',
    PARTIELLEMENT_PAYEE: 'Partiel',
    PAYEE: 'Payée',
    ANNULEE: 'Annulée',
  }
  return labels[statut] ?? statut
}

export function statutCreditLabel(statut: string) {
  const labels: Record<string, string> = {
    EN_COURS: 'En cours',
    EN_RETARD: 'En retard',
    SOLDE: 'Soldé',
    ANNULE: 'Annulé',
  }
  return labels[statut] ?? statut
}

export function modePaymentLabel(mode: string) {
  const labels: Record<string, string> = {
    ESPECES: 'Espèces',
    MOBILE_MONEY: 'Mobile Money',
    CHEQUE: 'Chèque',
    VIREMENT: 'Virement',
    CREDIT: 'Crédit',
  }
  return labels[mode] ?? mode
}

export function getStatutCreditBadgeClass(statut: string) {
  const classes: Record<string, string> = {
    EN_COURS: 'bg-blue-100 text-blue-800',
    EN_RETARD: 'bg-red-100 text-red-800',
    SOLDE: 'bg-green-100 text-green-800',
    ANNULE: 'bg-gray-100 text-gray-800',
  }
  return classes[statut] ?? 'bg-gray-100 text-gray-800'
}

export function getStatutVenteBadgeClass(statut: string) {
  const classes: Record<string, string> = {
    EN_ATTENTE: 'bg-yellow-100 text-yellow-800',
    PARTIELLEMENT_PAYEE: 'bg-orange-100 text-orange-800',
    PAYEE: 'bg-green-100 text-green-800',
    ANNULEE: 'bg-gray-100 text-gray-800',
  }
  return classes[statut] ?? 'bg-gray-100 text-gray-800'
}

export function peutAcceder(userRole: string, rolesAutorises: string[]) {
  return rolesAutorises.includes(userRole)
}
