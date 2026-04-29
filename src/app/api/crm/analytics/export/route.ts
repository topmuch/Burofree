import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'
import { analyticsExportQuerySchema } from '@/lib/validations/crm'
import { getDashboardOverview, getContactStats, getPipelineStats, getCampaignStats } from '@/features/crm/services/analytics-service'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.user) return auth.response!

  const rl = checkRateLimit(getRateLimitIdentifier(req), DEFAULT_API_OPTIONS)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } })
  }

  const parsed = analyticsExportQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Paramètres invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { format, period, type } = parsed.data

  let csvContent = ''
  const BOM = '\uFEFF'

  if (type === 'contacts') {
    const data = await getContactStats(auth.user.id, period)
    csvContent = 'Catégorie,Valeur\n'
    csvContent += `Total Contacts,${data.total}\n`
    csvContent += `Nouveaux (${period}),${data.newThisPeriod}\n`
    csvContent += `Score Moyen,${data.averageScore}\n\n`
    csvContent += 'Source,Nombre\n'
    for (const s of data.bySource) csvContent += `${s.source},${s.count}\n`
    csvContent += '\nCycle de Vie,Nombre\n'
    for (const l of data.byLifecycle) csvContent += `${l.lifecycle},${l.count}\n`
  } else if (type === 'pipeline') {
    const data = await getPipelineStats(auth.user.id, period)
    csvContent = 'Métrique,Valeur\n'
    csvContent += `Valeur Totale,${data.totalValue}\n`
    csvContent += `Nombre de Deals,${data.dealsCount}\n`
    csvContent += `Taux de Conversion,${data.winRate}%\n`
    csvContent += `Temps Moyen de Fermeture,${data.avgCloseDays} jours\n`
    csvContent += `Valeur Gagnée,${data.wonValue}\n`
    csvContent += `Valeur Perdue,${data.lostValue}\n\n`
    csvContent += 'Étape,Nombre,Valeur\n'
    for (const s of data.byStage) csvContent += `${s.stageName},${s.count},${s.value}\n`
  } else if (type === 'campaigns') {
    const data = await getCampaignStats(auth.user.id, period)
    csvContent = 'Métrique,Valeur\n'
    csvContent += `Campagnes Totales,${data.totalCampaigns}\n`
    csvContent += `Campagnes Actives,${data.activeCampaigns}\n`
    csvContent += `Emails Envoyés,${data.totalSent}\n`
    csvContent += `Taux d\'Ouverture,${data.openRate}%\n`
    csvContent += `Taux de Clic,${data.clickRate}%\n`
    csvContent += `Taux de Bounce,${data.bounceRate}%\n\n`
    csvContent += 'Statut,Nombre\n'
    for (const s of data.byStatus) csvContent += `${s.status},${s.count}\n`
  } else {
    const data = await getDashboardOverview(auth.user.id)
    csvContent = 'Indicateur,Valeur\n'
    csvContent += `Total Contacts,${data.totalContacts}\n`
    csvContent += `Deals Actifs,${data.activeDeals}\n`
    csvContent += `Valeur Pipeline,${data.pipelineValue}\n`
    csvContent += `Taux de Conversion,${data.winRate}%\n`
    csvContent += `Temps Réponse Moyen (min),${data.avgResponseTime}\n`
    csvContent += `Croissance Contacts,${data.contactGrowth}%\n`
  }

  return new NextResponse(BOM + csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="crm-analytics-${type}-${period}.csv"`,
    },
  })
}
