import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    const template = await db.template.findFirst({
      where: { id, userId: user.id },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
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

    // Accept variables object from request body
    const providedVariables: Record<string, string> = body.variables || {}

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
    return NextResponse.json({ error: 'Failed to apply template' }, { status: 500 })
  }
}
