import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { endpoint, keys, userId } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Missing required fields: endpoint, keys.p256dh, keys.auth' },
        { status: 400 }
      )
    }

    // Find user if not provided
    let uid = userId
    if (!uid) {
      const user = await db.user.findFirst()
      if (!user) return NextResponse.json({ error: 'No user found' }, { status: 404 })
      uid = user.id
    }

    // Upsert subscription by endpoint
    const subscription = await db.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: uid,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: uid,
      },
    })

    return NextResponse.json(subscription, { status: 201 })
  } catch (error) {
    console.error('PushSubscription POST error:', error)
    return NextResponse.json({ error: 'Failed to save push subscription' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const endpoint = searchParams.get('endpoint')

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint parameter' },
        { status: 400 }
      )
    }

    await db.pushSubscription.deleteMany({
      where: { endpoint },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PushSubscription DELETE error:', error)
    return NextResponse.json({ error: 'Failed to remove push subscription' }, { status: 500 })
  }
}
