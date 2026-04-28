import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { analyticsExportSchema } from '@/lib/validations/productivity'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/export
 *
 * Export analytics data as CSV or PDF.
 * Query params:
 *   - format: csv | pdf  (default: csv)
 *   - range:  week | month | year  (default: month)
 */
export async function GET(req: NextRequest) {
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

    // Validate query params
    const { searchParams } = new URL(req.url)
    const queryParse = analyticsExportSchema.safeParse({
      format: searchParams.get('format') || undefined,
      range: searchParams.get('range') || undefined,
    })
    if (!queryParse.success) {
      return NextResponse.json(
        { error: 'Paramètres invalides', details: queryParse.error.flatten() },
        { status: 400 }
      )
    }
    const { format, range } = queryParse.data

    // ─── Compute date range ────────────────────────────────────────────────────
    const now = new Date()
    let rangeStart: Date
    let rangeEnd: Date

    switch (range) {
      case 'week': {
        rangeStart = new Date(now)
        rangeStart.setDate(rangeStart.getDate() - rangeStart.getDay() + 1)
        rangeStart.setHours(0, 0, 0, 0)
        rangeEnd = new Date(rangeStart)
        rangeEnd.setDate(rangeEnd.getDate() + 7)
        break
      }
      case 'year': {
        rangeStart = new Date(now.getFullYear(), 0, 1)
        rangeEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
        break
      }
      default: { // month
        rangeStart = new Date(now.getFullYear(), now.getMonth(), 1)
        rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        break
      }
    }

    // ─── Fetch data ────────────────────────────────────────────────────────────
    const [timeEntries, invoices, projects] = await Promise.all([
      db.timeEntry.findMany({
        where: {
          userId: user.id,
          startTime: { gte: rangeStart, lte: rangeEnd },
        },
        include: { project: true, task: true },
        orderBy: { startTime: 'asc' },
      }),

      db.invoice.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: rangeStart, lte: rangeEnd },
        },
        include: { project: true },
        orderBy: { createdAt: 'desc' },
      }),

      db.project.findMany({
        where: {
          userId: user.id,
          status: 'active',
        },
        include: {
          timeEntries: {
            where: {
              startTime: { gte: rangeStart, lte: rangeEnd },
              duration: { not: null },
            },
            select: { duration: true, isBillable: true },
          },
          invoices: {
            where: {
              status: 'paid',
              paidAt: { gte: rangeStart, lte: rangeEnd },
            },
            select: { total: true },
          },
        },
      }),
    ])

    // ─── Build summaries ───────────────────────────────────────────────────────
    const totalHours = Math.round(
      (timeEntries.reduce((s, e) => s + (e.duration || 0), 0) / 3600) * 100
    ) / 100

    const billableHours = Math.round(
      (timeEntries.filter(e => e.isBillable).reduce((s, e) => s + (e.duration || 0), 0) / 3600) * 100
    ) / 100

    const totalRevenue = Math.round(
      invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0) * 100
    ) / 100

    const rangeLabel = range === 'week' ? 'Semaine' : range === 'year' ? 'Année' : 'Mois'

    // ─── CSV export ────────────────────────────────────────────────────────────
    if (format === 'csv') {
      const lines: string[] = []

      // Header section
      lines.push(`Rapport Maellis - ${rangeLabel}`)
      lines.push(`Période,${rangeStart.toLocaleDateString('fr-FR')} - ${rangeEnd.toLocaleDateString('fr-FR')}`)
      lines.push(`Généré le,${now.toLocaleDateString('fr-FR')}`)
      lines.push('')

      // Summary
      lines.push('RÉSUMÉ')
      lines.push(`Heures totales,${totalHours}`)
      lines.push(`Heures facturables,${billableHours}`)
      lines.push(`Revenu total,${totalRevenue}`)
      lines.push('')

      // Time entries section
      lines.push('ENTRÉES DE TEMPS')
      lines.push('Date,Début,Fin,Durée (min),Facturable,Projet,Tâche,Description')
      for (const entry of timeEntries) {
        const date = entry.startTime.toLocaleDateString('fr-FR')
        const start = entry.startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        const end = entry.endTime
          ? entry.endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : ''
        const dur = entry.duration || 0
        const bill = entry.isBillable ? 'Oui' : 'Non'
        const proj = (entry.project?.name || 'Sans projet').replace(/,/g, ';')
        const taskTitle = (entry.task?.title || '').replace(/,/g, ';')
        const desc = (entry.description || '').replace(/,/g, ';').replace(/\n/g, ' ')
        lines.push(`${date},${start},${end},${dur},${bill},${proj},${taskTitle},${desc}`)
      }
      lines.push('')

      // Invoices section
      lines.push('FACTURES')
      lines.push('Numéro,Client,Statut,Total TTC,Devise,Date création,Échéance,Projet')
      for (const inv of invoices) {
        const num = inv.number
        const client = inv.clientName.replace(/,/g, ';')
        const status = inv.status
        const total = inv.total.toFixed(2)
        const currency = inv.currency
        const created = inv.createdAt.toLocaleDateString('fr-FR')
        const due = inv.dueDate ? inv.dueDate.toLocaleDateString('fr-FR') : ''
        const proj = (inv.project?.name || '').replace(/,/g, ';')
        lines.push(`${num},${client},${status},${total},${currency},${created},${due},${proj}`)
      }
      lines.push('')

      // Project summaries section
      lines.push('RÉSUMÉ PAR PROJET')
      lines.push('Projet,Client,Heures totales,Heures facturables,Revenu')
      for (const project of projects) {
        const pTotalHours = Math.round(
          (project.timeEntries.reduce((s, e) => s + (e.duration || 0), 0) / 3600) * 100
        ) / 100
        const pBillableHours = Math.round(
          (project.timeEntries.filter(e => e.isBillable).reduce((s, e) => s + (e.duration || 0), 0) / 3600) * 100
        ) / 100
        const pRevenue = Math.round(
          project.invoices.reduce((s, i) => s + (i.total || 0), 0) * 100
        ) / 100
        const name = project.name.replace(/,/g, ';')
        const client = (project.clientName || '').replace(/,/g, ';')
        lines.push(`${name},${client},${pTotalHours},${pBillableHours},${pRevenue}`)
      }

      // Prepend BOM for proper French character encoding in Excel
      const csvContent = '\uFEFF' + lines.join('\n')
      const filename = `rapport-analytics-${range}-${now.toISOString().split('T')[0]}.csv`

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    // ─── PDF export (real Puppeteer PDF generation) ────────────────────────────
    if (format === 'pdf') {
      const html = generateAnalyticsHTML({
        user: { name: user.name || 'Maellis', email: user.email, profession: '' },
        range: rangeLabel,
        rangeStart,
        rangeEnd,
        generatedAt: now,
        summary: { totalHours, billableHours, totalRevenue },
        timeEntries,
        invoices,
        projects,
      })

      const filename = `rapport-analytics-${range}-${now.toISOString().split('T')[0]}.pdf`

      // Try real PDF generation with Puppeteer
      const pdfResult = await generatePDF(html)
      if (pdfResult) {
        return new NextResponse(new Uint8Array(pdfResult), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      }

      // Fallback: return HTML if Puppeteer/Chromium unavailable
      const htmlFilename = `rapport-analytics-${range}-${now.toISOString().split('T')[0]}.html`
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="${htmlFilename}"`,
        },
      })
    }

    return NextResponse.json({ error: 'Format invalide' }, { status: 400 })
  } catch (error) {
    console.error('Analytics export GET error:', error)
    return NextResponse.json(
      { error: 'Échec de l\'export des données analytiques' },
      { status: 500 }
    )
  }
}

// ─── Real PDF generation with Puppeteer ─────────────────────────────────────────

let puppeteerAvailable: boolean | null = null

async function generatePDF(html: string): Promise<Buffer | null> {
  if (puppeteerAvailable === false) return null

  try {
    const puppeteer = await import('puppeteer-core')
    const executablePath = findChromium()

    if (!executablePath) {
      console.warn('[Analytics PDF] Chromium not found, falling back to HTML')
      puppeteerAvailable = false
      return null
    }

    puppeteerAvailable = true

    const browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    })

    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 })

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
        landscape: true,
      })

      return Buffer.from(pdfBuffer)
    } finally {
      await browser.close().catch(() => {})
    }
  } catch (error) {
    console.error('[Analytics PDF] PDF generation failed, falling back to HTML:', error)
    puppeteerAvailable = false
    return null
  }
}

function findChromium(): string | null {
  // Common Chromium paths on Linux
  const paths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/snap/bin/chromium',
    process.env.CHROMIUM_PATH || '',
  ]

  // Also check Playwright's installed Chromium
  const homeDir = process.env.HOME || '/root'
  const playwrightPaths = [
    `${homeDir}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`,
    `${homeDir}/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome`,
  ]

  const allPaths = [...paths, ...playwrightPaths]

  for (const p of allPaths) {
    if (p) {
      try {
        if (existsSync(p)) return p
      } catch {
        // continue
      }
    }
  }

  // Dynamic fallback: find any Playwright chromium
  try {
    const playwrightDir = join(homeDir, '.cache', 'ms-playwright')
    if (existsSync(playwrightDir)) {
      const dirs = readdirSync(playwrightDir).filter((d) => d.startsWith('chromium-'))
      for (const dir of dirs) {
        const chromePath = join(playwrightDir, dir, 'chrome-linux64', 'chrome')
        if (existsSync(chromePath)) return chromePath
      }
    }
  } catch {
    // Ignore
  }

  return null
}

// ─── Analytics HTML Report Generator ───────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface AnalyticsReportData {
  user: { name: string; email: string; profession: string }
  range: string
  rangeStart: Date
  rangeEnd: Date
  generatedAt: Date
  summary: { totalHours: number; billableHours: number; totalRevenue: number }
  timeEntries: Array<{
    startTime: Date
    endTime: Date | null
    duration: number | null
    isBillable: boolean
    description: string | null
    project: { name: string; color: string } | null
    task: { title: string } | null
  }>
  invoices: Array<{
    number: string
    clientName: string
    status: string
    total: number
    currency: string
    createdAt: Date
    dueDate: Date | null
    project: { name: string; color: string } | null
  }>
  projects: Array<{
    name: string
    clientName: string | null
    color: string
    timeEntries: Array<{ duration: number | null; isBillable: boolean }>
    invoices: Array<{ total: number }>
  }>
}

function generateAnalyticsHTML(data: AnalyticsReportData): string {
  const formatCurrency = (amount: number) =>
    amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

  // Time entries rows
  const timeRows = data.timeEntries.slice(0, 50).map(e => `
    <tr>
      <td>${e.startTime.toLocaleDateString('fr-FR')}</td>
      <td>${e.startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
      <td>${e.endTime ? e.endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
      <td class="text-right">${Math.round((e.duration || 0) / 60)}</td>
      <td>${e.isBillable ? '<span class="badge badge-green">Oui</span>' : '<span class="badge badge-gray">Non</span>'}</td>
      <td>${escapeHtml(e.project?.name || 'Sans projet')}</td>
      <td>${escapeHtml(e.task?.title || '')}</td>
    </tr>
  `).join('')

  // Invoice rows
  const invoiceRows = data.invoices.slice(0, 50).map(inv => `
    <tr>
      <td>${escapeHtml(inv.number)}</td>
      <td>${escapeHtml(inv.clientName)}</td>
      <td><span class="badge badge-${inv.status === 'paid' ? 'green' : inv.status === 'overdue' ? 'red' : inv.status === 'sent' ? 'yellow' : 'gray'}">${getStatusLabel(inv.status)}</span></td>
      <td class="text-right">${formatCurrency(inv.total)}</td>
      <td>${inv.createdAt.toLocaleDateString('fr-FR')}</td>
      <td>${inv.dueDate ? inv.dueDate.toLocaleDateString('fr-FR') : '—'}</td>
      <td>${escapeHtml(inv.project?.name || '')}</td>
    </tr>
  `).join('')

  // Project summary rows
  const projectRows = data.projects.map(p => {
    const pTotalHours = Math.round(
      (p.timeEntries.reduce((s, e) => s + (e.duration || 0), 0) / 3600) * 100
    ) / 100
    const pBillableHours = Math.round(
      (p.timeEntries.filter(e => e.isBillable).reduce((s, e) => s + (e.duration || 0), 0) / 3600) * 100
    ) / 100
    const pRevenue = Math.round(
      p.invoices.reduce((s, i) => s + (i.total || 0), 0) * 100
    ) / 100
    return `
      <tr>
        <td>
          <span class="color-dot" style="background:${p.color}"></span>
          ${escapeHtml(p.name)}
        </td>
        <td>${escapeHtml(p.clientName || '—')}</td>
        <td class="text-right">${pTotalHours}</td>
        <td class="text-right">${pBillableHours}</td>
        <td class="text-right">${formatCurrency(pRevenue)}</td>
      </tr>
    `
  }).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Rapport Analytics - ${data.range}</title>
<style>
  @page {
    size: A4 landscape;
    margin: 15mm 12mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
    color: #1a1a1a;
    padding: 30px;
    font-size: 12px;
    line-height: 1.5;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 30px;
    padding-bottom: 15px;
    border-bottom: 3px solid #10b981;
  }
  .logo-area {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .logo-icon {
    width: 40px; height: 40px;
    background: linear-gradient(135deg, #10b981, #059669);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 800; font-size: 18px;
  }
  .logo-text { font-size: 20px; font-weight: 700; color: #10b981; }
  .logo-sub { font-size: 10px; color: #9ca3af; }

  .report-info { text-align: right; }
  .report-title { font-size: 22px; font-weight: 700; color: #374151; }
  .report-period { font-size: 12px; color: #6b7280; margin-top: 4px; }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 30px;
  }
  .summary-card {
    background: #f9fafb;
    border-radius: 8px;
    padding: 16px 20px;
    border-left: 3px solid #10b981;
  }
  .summary-label {
    font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
    color: #9ca3af; margin-bottom: 6px; font-weight: 600;
  }
  .summary-value { font-size: 24px; font-weight: 700; color: #1a1a1a; }
  .summary-value.revenue { color: #10b981; }

  .section { margin-bottom: 30px; }
  .section-title {
    font-size: 14px; font-weight: 600; color: #374151;
    margin-bottom: 10px; padding-bottom: 6px;
    border-bottom: 1px solid #e5e7eb;
  }

  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  thead th {
    text-align: left; padding: 8px 12px;
    background: #f9fafb; font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.5px; color: #6b7280;
    border-bottom: 2px solid #e5e7eb; font-weight: 600;
  }
  tbody td {
    padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 12px;
  }
  .text-right { text-align: right; }

  .badge {
    display: inline-block; padding: 2px 8px;
    border-radius: 9999px; font-size: 10px; font-weight: 600;
  }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-yellow { background: #fef3c7; color: #92400e; }
  .badge-gray { background: #f3f4f6; color: #6b7280; }

  .color-dot {
    display: inline-block; width: 8px; height: 8px;
    border-radius: 50%; margin-right: 6px; vertical-align: middle;
  }

  .footer {
    margin-top: 40px; padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    display: flex; justify-content: space-between;
    font-size: 10px; color: #9ca3af;
  }

  @media print {
    body { padding: 0; }
    .summary-grid { break-inside: avoid; }
    .section { break-inside: avoid; }
  }
</style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="logo-area">
      <div class="logo-icon">B</div>
      <div>
        <div class="logo-text">${escapeHtml(data.user.name)}</div>
        <div class="logo-sub">${escapeHtml(data.user.profession)}</div>
      </div>
    </div>
    <div class="report-info">
      <div class="report-title">Rapport Analytics</div>
      <div class="report-period">
        ${data.range} &middot; ${data.rangeStart.toLocaleDateString('fr-FR')} — ${data.rangeEnd.toLocaleDateString('fr-FR')}
      </div>
    </div>
  </div>

  <!-- Summary Cards -->
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-label">Heures totales</div>
      <div class="summary-value">${data.summary.totalHours}h</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Heures facturables</div>
      <div class="summary-value">${data.summary.billableHours}h</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Revenu total</div>
      <div class="summary-value revenue">${formatCurrency(data.summary.totalRevenue)}</div>
    </div>
  </div>

  <!-- Time Entries -->
  ${data.timeEntries.length > 0 ? `
  <div class="section">
    <div class="section-title">Entrées de temps (${data.timeEntries.length}${data.timeEntries.length > 50 ? ' — 50 premières affichées' : ''})</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Début</th>
          <th>Fin</th>
          <th class="text-right">Durée (min)</th>
          <th>Facturable</th>
          <th>Projet</th>
          <th>Tâche</th>
        </tr>
      </thead>
      <tbody>${timeRows}</tbody>
    </table>
  </div>
  ` : ''}

  <!-- Invoices -->
  ${data.invoices.length > 0 ? `
  <div class="section">
    <div class="section-title">Factures (${data.invoices.length}${data.invoices.length > 50 ? ' — 50 premières affichées' : ''})</div>
    <table>
      <thead>
        <tr>
          <th>N°</th>
          <th>Client</th>
          <th>Statut</th>
          <th class="text-right">Total TTC</th>
          <th>Date</th>
          <th>Échéance</th>
          <th>Projet</th>
        </tr>
      </thead>
      <tbody>${invoiceRows}</tbody>
    </table>
  </div>
  ` : ''}

  <!-- Project Summaries -->
  ${data.projects.length > 0 ? `
  <div class="section">
    <div class="section-title">Résumé par projet</div>
    <table>
      <thead>
        <tr>
          <th>Projet</th>
          <th>Client</th>
          <th class="text-right">Heures totales</th>
          <th class="text-right">Heures facturables</th>
          <th class="text-right">Revenu</th>
        </tr>
      </thead>
      <tbody>${projectRows}</tbody>
    </table>
  </div>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    <div>Généré par Maellis &middot; ${data.generatedAt.toLocaleDateString('fr-FR')} ${data.generatedAt.toLocaleTimeString('fr-FR')}</div>
    <div>Rapport ${data.range}</div>
  </div>
</body>
</html>`
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Brouillon',
    sent: 'Envoyée',
    paid: 'Payée',
    overdue: 'En retard',
    cancelled: 'Annulée',
  }
  return labels[status] || status
}
