/**
 * PDF Generation Utility for Maellis
 *
 * Converts HTML invoice templates to PDF using puppeteer-core.
 * Falls back to returning HTML if puppeteer/Chromium is not available.
 * Supports multi-currency, DRAFT watermarks, professional styling.
 */

import type { Invoice } from './store'
import { existsSync } from 'fs'

// ─── Currency Helpers ────────────────────────────────────────────────────────────

const currencySymbols: Record<string, string> = {
  EUR: '\u20AC',
  USD: '$',
  GBP: '\u00A3',
  CHF: 'CHF',
}

function getCurrencySymbol(currency: string): string {
  return currencySymbols[currency] || currency
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return amount.toLocaleString('fr-FR', { style: 'currency', currency })
  } catch {
    return `${amount.toFixed(2)} ${getCurrencySymbol(currency)}`
  }
}

// ─── Invoice Data Interface ──────────────────────────────────────────────────────

export interface InvoicePDFData {
  invoice: Invoice & {
    projectName?: string | null
    projectColor?: string | null
  }
  emitter: {
    name: string
    email: string
    address?: string
    profession?: string
    siret?: string
    tvaNumber?: string
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
  }>
}

// ─── HTML Generation ─────────────────────────────────────────────────────────────

export function generateInvoiceHTML(data: InvoicePDFData): string {
  const { invoice, emitter, items } = data
  const isDraft = invoice.status === 'draft'
  const isQuote = invoice.type === 'quote'
  const docLabel = isQuote ? 'Devis' : 'Facture'
  const currencySymbol = getCurrencySymbol(invoice.currency)

  const itemsRows = items.map((item, i) => `
    <tr class="${i % 2 === 0 ? '' : 'alt-row'}">
      <td>${escapeHtml(item.description)}</td>
      <td class="text-right">${item.quantity}</td>
      <td class="text-right">${item.unitPrice.toFixed(2)} ${currencySymbol}</td>
      <td class="text-right">${(item.quantity * item.unitPrice).toFixed(2)} ${currencySymbol}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${docLabel} ${invoice.number}</title>
<style>
  @page {
    size: A4;
    margin: 20mm 18mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
    color: #1a1a1a;
    padding: 40px;
    max-width: 800px;
    margin: 0 auto;
    font-size: 13px;
    line-height: 1.5;
    position: relative;
  }

  /* Watermark for DRAFT */
  ${isDraft ? `
  body::before {
    content: 'BOUILLON';
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-45deg);
    font-size: 120px;
    font-weight: 800;
    color: rgba(16, 185, 129, 0.08);
    pointer-events: none;
    z-index: 0;
    letter-spacing: 20px;
  }
  body > * { position: relative; z-index: 1; }
  ` : ''}

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 45px;
    padding-bottom: 20px;
    border-bottom: 3px solid #10b981;
  }
  .logo-area {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo-icon {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, #10b981, #059669);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 800;
    font-size: 20px;
  }
  .logo-text {
    font-size: 22px;
    font-weight: 700;
    color: #10b981;
    letter-spacing: -0.5px;
  }
  .logo-sub {
    font-size: 11px;
    color: #9ca3af;
    margin-top: 2px;
  }
  .doc-header {
    text-align: right;
  }
  .doc-type {
    font-size: 32px;
    font-weight: 700;
    color: #374151;
    letter-spacing: -0.5px;
  }
  .doc-number {
    font-size: 14px;
    color: #6b7280;
    margin-top: 4px;
  }

  /* Parties */
  .parties {
    display: flex;
    justify-content: space-between;
    margin-bottom: 40px;
    gap: 40px;
  }
  .party { flex: 1; }
  .party-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #9ca3af;
    margin-bottom: 10px;
    font-weight: 600;
  }
  .party-name {
    font-weight: 600;
    font-size: 16px;
    color: #1a1a1a;
    margin-bottom: 4px;
  }
  .party-detail {
    font-size: 12px;
    color: #6b7280;
    margin-top: 3px;
    line-height: 1.6;
  }

  /* Table */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 30px;
  }
  thead th {
    text-align: left;
    padding: 12px 16px;
    background: #f9fafb;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #6b7280;
    border-bottom: 2px solid #e5e7eb;
    font-weight: 600;
  }
  tbody td {
    padding: 12px 16px;
    border-bottom: 1px solid #f3f4f6;
    font-size: 13px;
  }
  .alt-row {
    background: #fafbfc;
  }
  .text-right { text-align: right; }

  /* Totals */
  .totals-area {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 35px;
  }
  .totals {
    width: 300px;
  }
  .total-row {
    display: flex;
    justify-content: space-between;
    padding: 7px 0;
    font-size: 13px;
    color: #6b7280;
  }
  .total-row.grand {
    font-size: 18px;
    font-weight: 700;
    color: #1a1a1a;
    border-top: 2px solid #10b981;
    padding-top: 12px;
    margin-top: 8px;
  }
  .grand-amount {
    color: #10b981;
  }

  /* Payment Terms & Due Date */
  .terms-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 25px;
    gap: 20px;
  }
  .terms-block {
    flex: 1;
    background: #f9fafb;
    border-radius: 8px;
    padding: 14px 18px;
  }
  .terms-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #9ca3af;
    margin-bottom: 6px;
    font-weight: 600;
  }
  .terms-value {
    font-size: 13px;
    color: #374151;
    font-weight: 500;
  }

  /* Notes */
  .notes-section {
    background: #f9fafb;
    border-left: 3px solid #10b981;
    padding: 14px 18px;
    margin-bottom: 35px;
    border-radius: 0 6px 6px 0;
  }
  .notes-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #9ca3af;
    margin-bottom: 6px;
    font-weight: 600;
  }
  .notes-text {
    font-size: 12px;
    color: #6b7280;
    line-height: 1.6;
  }

  /* Status Badge */
  .status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    margin-left: 8px;
  }
  .status-draft { background: #f3f4f6; color: #6b7280; }
  .status-sent { background: #fef3c7; color: #92400e; }
  .status-paid { background: #d1fae5; color: #065f46; }
  .status-overdue { background: #fee2e2; color: #991b1b; }

  /* Footer */
  .footer {
    margin-top: 60px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #9ca3af;
  }
  .footer-left { }
  .footer-right { text-align: right; }

  @media print {
    body { padding: 0; }
    .header { margin-bottom: 30px; }
  }
</style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="logo-area">
      <div class="logo-icon">M</div>
      <div>
        <div class="logo-text">${escapeHtml(emitter.name) || 'Maellis'}</div>
        <div class="logo-sub">${escapeHtml(emitter.profession || '')}</div>
      </div>
    </div>
    <div class="doc-header">
      <div class="doc-type">${docLabel}</div>
      <div class="doc-number">
        ${invoice.number} &middot; ${new Date(invoice.createdAt).toLocaleDateString('fr-FR')}
        <span class="status-badge status-${invoice.status}">${getStatusLabel(invoice.status)}</span>
      </div>
    </div>
  </div>

  <!-- Parties -->
  <div class="parties">
    <div class="party">
      <div class="party-label">&Eacute;metteur</div>
      <div class="party-name">${escapeHtml(emitter.name)}</div>
      <div class="party-detail">
        ${escapeHtml(emitter.email)}
        ${emitter.address ? `<br>${escapeHtml(emitter.address)}` : ''}
        ${emitter.siret ? `<br>SIRET : ${escapeHtml(emitter.siret)}` : ''}
        ${emitter.tvaNumber ? `<br>N&deg; TVA : ${escapeHtml(emitter.tvaNumber)}` : ''}
      </div>
    </div>
    <div class="party" style="text-align:right">
      <div class="party-label">Client</div>
      <div class="party-name">${escapeHtml(invoice.clientName)}</div>
      <div class="party-detail">
        ${invoice.clientEmail ? escapeHtml(invoice.clientEmail) : ''}
        ${invoice.clientAddress ? `<br>${escapeHtml(invoice.clientAddress)}` : ''}
      </div>
    </div>
  </div>

  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="text-right">Qt&eacute;</th>
        <th class="text-right">Prix unitaire</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals-area">
    <div class="totals">
      <div class="total-row">
        <span>Sous-total HT</span>
        <span>${formatCurrency(invoice.subtotal, invoice.currency)}</span>
      </div>
      <div class="total-row">
        <span>TVA (${invoice.taxRate}%)</span>
        <span>${formatCurrency(invoice.taxAmount, invoice.currency)}</span>
      </div>
      <div class="total-row grand">
        <span>Total TTC</span>
        <span class="grand-amount">${formatCurrency(invoice.total, invoice.currency)}</span>
      </div>
    </div>
  </div>

  <!-- Payment Terms & Due Date -->
  <div class="terms-row">
    ${invoice.dueDate ? `
    <div class="terms-block">
      <div class="terms-label">&Eacute;ch&eacute;ance</div>
      <div class="terms-value">${new Date(invoice.dueDate).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric'
      })}</div>
    </div>
    ` : ''}
    <div class="terms-block">
      <div class="terms-label">Conditions de paiement</div>
      <div class="terms-value">${isQuote ? 'Devis valable 30 jours' : 'Paiement &agrave; r&eacute;ception de facture'}</div>
    </div>
    <div class="terms-block">
      <div class="terms-label">Devise</div>
      <div class="terms-value">${invoice.currency} (${currencySymbol})</div>
    </div>
  </div>

  ${invoice.notes ? `
  <!-- Notes -->
  <div class="notes-section">
    <div class="notes-label">Notes</div>
    <div class="notes-text">${escapeHtml(invoice.notes)}</div>
  </div>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">
      G&eacute;n&eacute;r&eacute; par Maellis &middot; ${new Date().toLocaleDateString('fr-FR')}
    </div>
    <div class="footer-right">
      ${invoice.projectName ? `Projet : ${escapeHtml(invoice.projectName)}` : ''}
    </div>
  </div>
</body>
</html>`
}

// ─── PDF Generation ──────────────────────────────────────────────────────────────

let puppeteerAvailable: boolean | null = null

async function tryPuppeteer(): Promise<typeof import('puppeteer-core') | null> {
  if (puppeteerAvailable === false) return null

  try {
    const puppeteer = await import('puppeteer-core')

    // Try to find Chromium
    const executablePath = findChromium()
    if (!executablePath) {
      console.warn('[PDF Generator] Chromium not found, falling back to HTML')
      puppeteerAvailable = false
      return null
    }

    puppeteerAvailable = true
    return puppeteer
  } catch {
    console.warn('[PDF Generator] puppeteer-core not available, falling back to HTML')
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

  for (const p of paths) {
    if (p) {
      try {
        if (existsSync(p)) return p
      } catch {
        // continue
      }
    }
  }
  return null
}

export interface PDFOptions {
  format?: 'pdf' | 'html'
  landscape?: boolean
}

/**
 * Generate a PDF from invoice data.
 * Returns a Buffer containing the PDF content, or the HTML string as fallback.
 */
export async function generateInvoicePDF(
  data: InvoicePDFData,
  options: PDFOptions = {}
): Promise<{ content: Buffer | string; contentType: string; isPDF: boolean }> {
  const html = generateInvoiceHTML(data)

  // If HTML format requested, return HTML directly
  if (options.format === 'html') {
    return { content: html, contentType: 'text/html; charset=utf-8', isPDF: false }
  }

  // Try PDF generation with puppeteer
  const puppeteer = await tryPuppeteer()
  if (!puppeteer) {
    console.warn('[PDF Generator] Puppeteer unavailable, returning HTML fallback')
    return { content: html, contentType: 'text/html; charset=utf-8', isPDF: false }
  }

  let browser = null
  try {
    const executablePath = findChromium()!
    browser = await puppeteer.launch({
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

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '18mm', bottom: '20mm', left: '18mm' },
      landscape: options.landscape || false,
    })

    return {
      content: Buffer.from(pdfBuffer),
      contentType: 'application/pdf',
      isPDF: true,
    }
  } catch (error) {
    console.error('[PDF Generator] PDF generation failed, falling back to HTML:', error)
    return { content: html, contentType: 'text/html; charset=utf-8', isPDF: false }
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Brouillon',
    sent: 'Envoy\u00e9e',
    paid: 'Pay\u00e9e',
    overdue: 'En retard',
    cancelled: 'Annul\u00e9e',
  }
  return labels[status] || status
}
