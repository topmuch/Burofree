import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Get the first user (single-user app)
    const user = await db.user.findFirst()
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 404 })
    }

    // Update user profile
    const updateData: Record<string, unknown> = {
      onboardingDone: true,
    }

    if (body.name) updateData.name = body.name
    if (body.profession) updateData.profession = body.profession
    if (body.assistantName) updateData.assistantName = body.assistantName
    if (body.assistantTone) {
      // Map French tone values to DB values
      const toneMap: Record<string, string> = {
        'professionnel': 'professional',
        'amical': 'friendly',
        'minimaliste': 'minimal',
      }
      updateData.assistantTone = toneMap[body.assistantTone] || body.assistantTone
    }

    await db.user.update({
      where: { id: user.id },
      data: updateData,
    })

    // Create projects if any
    if (body.projects && Array.isArray(body.projects)) {
      for (const project of body.projects) {
        if (project.name && project.name.trim()) {
          await db.project.create({
            data: {
              name: project.name.trim(),
              clientName: project.client?.trim() || null,
              budget: project.budget ? parseFloat(project.budget) : null,
              color: '#10b981',
              status: 'active',
              userId: user.id,
            },
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json({ error: 'Failed to save onboarding data' }, { status: 500 })
  }
}
