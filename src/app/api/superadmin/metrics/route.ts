/**
 * GET /api/superadmin/metrics — Platform KPIs for the superadmin dashboard.
 *
 * Returns aggregated metrics: user counts, MRR/ARR, subscription stats,
 * monthly revenue chart, module usage, recent errors, and system health.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, logAdminAction } from '@/features/superadmin/utils/admin-guard'
import { getPlatformKPIs, getSystemHealth, clearMetricsCache } from '@/features/superadmin/utils/metrics'

export async function GET(req: NextRequest) {
  const { admin, response } = await requireSuperAdmin(req)
  if (!admin) return response!

  try {
    // Check for cache-bust param
    const url = new URL(req.url)
    const noCache = url.searchParams.get('nocache') === '1'

    if (noCache) {
      clearMetricsCache()
    }

    const [kpis, health] = await Promise.all([
      getPlatformKPIs(),
      getSystemHealth(),
    ])

    // Merge system health from the dedicated check
    kpis.systemHealth = {
      db: health.db,
      redis: kpis.systemHealth.redis,
      storage: kpis.systemHealth.storage,
    }

    await logAdminAction(admin.id, 'admin.metrics_view', 'platform', null, { noCache }, req)

    return NextResponse.json(kpis)
  } catch (error) {
    console.error('[SuperAdmin Metrics] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des métriques de la plateforme.' },
      { status: 500 }
    )
  }
}
