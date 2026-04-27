import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function formatMontant(montant: number, devise = 'FCFA'): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(montant)) + ' ' + devise
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy', { locale: fr })
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy HH:mm', { locale: fr })
}

export function roleLabel(role: string): string {
  const labels: Record<string,string> = { ADMIN: 'Administrateur', GERANT: 'Gerant', VENDEUR: 'Vendeur' }
  return labels[role] ?? role
                }
