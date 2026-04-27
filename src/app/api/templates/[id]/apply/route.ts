import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { templateApplySchema } from '@/lib/validations/productivity'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req)
    const rateCheck = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429, headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, 0, rateCheck.retryAfterMs) }
      )
    }

    // Auth
    const { user, response: authResponse } = await requireAuth()
    if (!user) return authResponse!

    const { id } = await params

    // Validate body
    const body = await req.json()
    const parse = templateApplySchema.safeParse(body)
    if (!parse.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parse.error.flatten() },
        { status: 400 }
      )
    }
    const providedVariables = parse.data.variables

    const template = await db.template.findFirst({
      where: { id, userId: user.id },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
    }

    // Extract all {variable_name} patterns from content
    const variablePattern = /\{(\w+)\}/g
    const contentVariables: string[] = []
    let match: RegExpExecArray | null
    while ((match = variablePattern.exec(template.content)) !== null) {
      if (!contentVariables.includes(match[1])) {
        contentVariables.push(match[1])
      }
    }

    // Replace all variable placeholders with provided values
    let processedContent = template.content
    for (const varName of contentVariables) {
      const value = providedVariables[varName] ?? `{${varName}}`
      // Replace all occurrences of {varName} with the value
      const escapedVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`\\{${escapedVarName}\\}`, 'g')
      processedContent = processedContent.replace(regex, value)
    }

    // Increment usage count
    await db.template.update({
      where: { id: template.id },
      data: { usageCount: template.usageCount + 1 },
    })

    // Identify missing variables (those not provided)
    const missingVariables = contentVariables.filter(
      (varName) => !providedVariables[varName]
    )

    return NextResponse.json({
      content: processedContent,
      templateId: template.id,
      templateName: template.name,
      templateType: template.type,
      variablesUsed: contentVariables,
      missingVariables,
      usageCount: template.usageCount + 1,
    })
  } catch (error) {
    console.error('Template apply error:', error)
    return NextResponse.json({ error: 'Échec de l\'application du template' }, { status: 500 })
  }
}
