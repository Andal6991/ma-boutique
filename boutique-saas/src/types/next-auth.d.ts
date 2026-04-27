import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: string
      tenantId: string
      tenantNom: string
      toutesLesBoutiques: { id: string; nom: string; role: string }[]
    }
  }
  interface User {
    role: string
    tenantId: string
    tenantNom: string
    toutesLesBoutiques: { id: string; nom: string; role: string }[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    tenantId: string
    tenantNom: string
    toutesLesBoutiques: { id: string; nom: string; role: string }[]
  }
}
