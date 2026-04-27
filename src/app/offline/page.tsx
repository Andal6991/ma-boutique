'use client'
// src/app/offline/page.tsx
import { useEffect, useState } from 'react'

export default function OfflinePage() {
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    // Vérifier si c'est un problème d'abonnement ou juste hors ligne
    const lastCheck = localStorage.getItem('abonnement_statut')
    if (lastCheck === 'EXPIRE') setIsExpired(true)
  }, [])

  return (
    <div style={{minHeight:'100vh', background:'#f9fafb', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px'}}>
      <div style={{background:'white', borderRadius:'16px', maxWidth:'400px', width:'100%', padding:'32px', textAlign:'center', boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
        
        {isExpired ? (
          // Message abonnement expiré
          <>
            <div style={{width:'72px', height:'72px', background:'#fee2e2', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px'}}>
              <svg width="36" height="36" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h1 style={{fontSize:'20px', fontWeight:'700', color:'#111827', marginBottom:'8px'}}>Abonnement expiré</h1>
            <p style={{color:'#6b7280', fontSize:'14px', marginBottom:'24px', lineHeight:'1.6'}}>
              Votre abonnement Ma Boutique a expiré. Pour continuer à utiliser l'application, veuillez contacter votre fournisseur.
            </p>
            <div style={{background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'12px', padding:'16px', marginBottom:'20px'}}>
              <p style={{color:'#1e40af', fontSize:'13px', fontWeight:'500', margin:'0 0 4px'}}>Contacter Ma Boutique</p>
              <a href="tel:+22666810504" style={{color:'#2563eb', fontSize:'22px', fontWeight:'700', textDecoration:'none', display:'block'}}>
                +226 66 81 05 04
              </a>
              <p style={{color:'#6b7280', fontSize:'11px', margin:'4px 0 0'}}>Du lundi au samedi, 8h - 18h</p>
            </div>
            <a href="https://wa.me/22666810504" style={{display:'block', background:'#16a34a', color:'white', padding:'12px', borderRadius:'12px', fontSize:'15px', fontWeight:'500', textDecoration:'none', marginBottom:'12px'}}>
              WhatsApp — +226 66 81 05 04
            </a>
            <button onClick={() => window.location.reload()} style={{width:'100%', background:'#f3f4f6', color:'#374151', padding:'12px', borderRadius:'12px', fontSize:'14px', border:'none', cursor:'pointer'}}>
              Réessayer la connexion
            </button>
          </>
        ) : (
          // Message hors ligne normal
          <>
            <div style={{width:'72px', height:'72px', background:'#dbeafe', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px'}}>
              <svg width="36" height="36" fill="none" stroke="#2563eb" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
            <h1 style={{fontSize:'20px', fontWeight:'700', color:'#111827', marginBottom:'8px'}}>Vous êtes hors ligne</h1>
            <p style={{color:'#6b7280', fontSize:'14px', marginBottom:'24px', lineHeight:'1.6'}}>
              Ma Boutique nécessite une connexion internet. Vérifiez votre connexion et réessayez.
            </p>
            <button onClick={() => window.location.reload()} style={{width:'100%', background:'#2563eb', color:'white', padding:'12px', borderRadius:'12px', fontSize:'15px', fontWeight:'500', border:'none', cursor:'pointer', marginBottom:'12px'}}>
              Réessayer la connexion
            </button>
            <div style={{background:'#f9fafb', borderRadius:'10px', padding:'12px', marginTop:'8px'}}>
              <p style={{color:'#6b7280', fontSize:'12px', margin:0}}>
                Besoin d'aide ? Contactez-nous au{' '}
                <a href="tel:+22666810504" style={{color:'#2563eb', fontWeight:'600'}}>+226 66 81 05 04</a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
