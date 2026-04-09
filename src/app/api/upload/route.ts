// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GERANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

    // Vérifier le type et la taille (max 2MB)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Seules les images sont acceptees' }, { status: 400 })
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image trop grande (max 2MB)' }, { status: 400 })
    }

    // Upload vers ImgBB (API gratuite)
    const imgbbKey = process.env.IMGBB_API_KEY ?? ''
    if (!imgbbKey) {
      return NextResponse.json({ error: 'Service upload non configure' }, { status: 500 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const formDataImgBB = new FormData()
    formDataImgBB.append('image', base64)
    formDataImgBB.append('expiration', '0') // Pas d expiration

    const res = await fetch('https://api.imgbb.com/1/upload?key=' + imgbbKey, {
      method: 'POST',
      body: formDataImgBB,
    })

    const data = await res.json()
    if (!data.success) {
      return NextResponse.json({ error: 'Erreur upload image' }, { status: 500 })
    }

    return NextResponse.json({
      url: data.data.url,
      thumbUrl: data.data.thumb?.url ?? data.data.url,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Erreur serveur' }, { status: 500 })
  }
}
