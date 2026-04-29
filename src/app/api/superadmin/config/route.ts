/**
 * GET /api/superadmin/config — Get all platform configurations, grouped by category.
 * PUT /api/superadmin/config — Update/bulk update platform configurations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, logAdminAction } from '@/features/superadmin/utils/admin-guard'
import { configBulkUpdateSchema } from '@/lib/validations/superadmin'
import { db } from '@/lib/db'
import { clearMetricsCache } from '@/features/superadmin/utils/metrics'

export async function GET(req: NextRequest) {
  const { admin, response } = await requireSuperAdmin(req)
  if (!admin) return response!

  try {
    const url = new URL(req.url)
    const category = url.searchParams.get('category')

    const where = category ? { category } : {}

    const configs = await db.platformConfig.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })

    // Group by category
    const grouped = configs.reduce<Record<string, typeof configs>>((acc, config) => {
      const cat = config.category || 'general'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(config)
      return acc
    }, {})

    await logAdminAction(admin.id, 'admin.config_list', 'config', null, { category }, req)

    return NextResponse.json({
      configs,
      grouped,
      categories: Object.keys(grouped),
    })
  } catch (error) {
    console.error('[SuperAdmin Config GET] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement de la configuration de la plateforme.' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  const { admin, response } = await requireSuperAdmin(req)
  if (!admin) return response!

  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête invalide.' },
        { status: 400 }
      )
    }

    const parsed = configBulkUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { configs } = parsed.data
    const results: Array<{ key: string; success: boolean; error?: string }> = []

    for (const config of configs) {
      try {
        // Validate type coercion
        let validatedValue = config.value
        switch (config.type) {
          case 'number': {
            const num = Number(config.value)
            if (isNaN(num)) {
              results.push({ key: config.key, success: false, error: 'La valeur doit être un nombre valide.' })
              continue
            }
            validatedValue = String(num)
            break
          }
          case 'boolean': {
            if (!['true', 'false', '1', '0'].includes(config.value.toLowerCase())) {
              results.push({ key: config.key, success: false, error: 'La valeur doit être un booléen (true/false).' })
              continue
            }
            validatedValue = config.value.toLowerCase() === 'true' || config.value === '1' ? 'true' : 'false'
            break
          }
          case 'json': {
            try {
              JSON.parse(config.value)
            } catch {
              results.push({ key: config.key, success: false, error: 'La valeur doit être un JSON valide.' })
              continue
            }
            break
          }
        }

        // Upsert config
        await db.platformConfig.upsert({
          where: { key: config.key },
          update: {
            value: validatedValue,
            type: config.type,
            category: config.category,
            description: config.description,
            updatedBy: admin.id,
          },
          create: {
            key: config.key,
            value: validatedValue,
            type: config.type,
            category: config.category,
            description: config.description,
            updatedBy: admin.id,
          },
        })

        results.push({ key: config.key, success: true })
      } catch (err) {
        results.push({ key: config.key, success: false, error: err instanceof Error ? err.message : 'Erreur inconnue.' })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    await logAdminAction(admin.id, 'admin.config_bulk_update', 'config', null, {
      configs: configs.map(c => ({ key: c.key, category: c.category })),
      successCount,
      failureCount,
    }, req)

    // Clear metrics cache since config may affect KPIs
    clearMetricsCache()

    return NextResponse.json({
      message: `${successCount} configuration(s) mise(s) à jour.`,
      successCount,
      failureCount,
      results,
    })
  } catch (error) {
    console.error('[SuperAdmin Config PUT] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la configuration.' },
      { status: 500 }
    )
  }
}
