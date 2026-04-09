'use client'
// src/app/superadmin/login/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SuperAdminLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/superadmin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (res.ok) {
      router.push('/superadmin/tenants')
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Identifiants incorrects')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Panel SuperAdmin</h1>
          <p className="text-gray-400 text-sm mt-1">Accès réservé à l'administrateur système</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" required className="input-field"
              placeholder="superadmin@ma-boutique.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password" required className="input-field"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Connexion...' : 'Accéder au panel'}
          </button>
        </form>

        <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700 text-center">
            Accès restreint — Toute tentative non autorisée est enregistrée
          </p>
        </div>
      </div>
    </div>
  )
}
