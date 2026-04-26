import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const invoice = await db.invoice.findUnique({ where: { id }, include: { project: true } })
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const user = await db.user.findFirst()
    const items = JSON.parse(invoice.items || '[]') as Array<{ description?: string; quantity?: number; unitPrice?: number }>

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${invoice.type === 'quote' ? 'Devis' : 'Facture'} ${invoice.number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .logo { font-size: 24px; font-weight: 700; color: #10b981; }
  .invoice-type { font-size: 28px; font-weight: 700; color: #374151; text-align: right; }
  .invoice-number { font-size: 14px; color: #6b7280; margin-top: 4px; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .party { flex: 1; }
  .party-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 8px; }
  .party-name { font-weight: 600; font-size: 16px; }
  .party-detail { font-size: 13px; color: #6b7280; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  thead th { text-align: left; padding: 12px 16px; background: #f9fafb; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
  tbody td { padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
  .text-right { text-align: right; }
  .totals { margin-left: auto; width: 300px; }
  .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #6b7280; }
  .total-row.grand { font-size: 18px; font-weight: 700; color: #1a1a1a; border-top: 2px solid #10b981; padding-top: 12px; margin-top: 8px; }
  .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
  .status-draft { background: #f3f4f6; color: #6b7280; }
  .status-sent { background: #fef3c7; color: #92400e; }
  .status-paid { background: #d1fae5; color: #065f46; }
  .status-overdue { background: #fee2e2; color: #991b1b; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div><div class="logo">${user?.name || 'Maellis'}</div></div>
    <div>
      <div class="invoice-type">${invoice.type === 'quote' ? 'Devis' : 'Facture'}</div>
      <div class="invoice-number">${invoice.number} &middot; ${new Date(invoice.createdAt).toLocaleDateString('fr-FR')}</div>
    </div>
  </div>
  <div class="parties">
    <div class="party">
      <div class="party-label">&Eacute;metteur</div>
      <div class="party-name">${user?.name || 'Freelancer'}</div>
      <div class="party-detail">${user?.email || ''}</div>
    </div>
    <div class="party" style="text-align:right">
      <div class="party-label">Client</div>
      <div class="party-name">${invoice.clientName}</div>
      <div class="party-detail">${invoice.clientEmail || ''}</div>
      <div class="party-detail">${invoice.clientAddress || ''}</div>
    </div>
  </div>
  <table>
    <thead><tr><th>Description</th><th class="text-right">Qt&eacute;</th><th class="text-right">Prix unitaire</th><th class="text-right">Total</th></tr></thead>
    <tbody>
      ${items.map((item: { description?: string; quantity?: number; unitPrice?: number }) => `<tr><td>${item.description || ''}</td><td class="text-right">${item.quantity || 1}</td><td class="text-right">${(item.unitPrice || 0).toFixed(2)} &euro;</td><td class="text-right">${((item.quantity || 1) * (item.unitPrice || 0)).toFixed(2)} &euro;</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="totals">
    <div class="total-row"><span>Sous-total</span><span>${invoice.subtotal.toFixed(2)} &euro;</span></div>
    <div class="total-row"><span>TVA (${invoice.taxRate}%)</span><span>${invoice.taxAmount.toFixed(2)} &euro;</span></div>
    <div class="total-row grand"><span>Total</span><span>${invoice.total.toFixed(2)} &euro;</span></div>
  </div>
  ${invoice.dueDate ? `<div style="margin-top:30px;font-size:14px;color:#6b7280;">&Eacute;ch&eacute;ance : ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</div>` : ''}
  ${invoice.notes ? `<div style="margin-top:20px;font-size:13px;color:#6b7280;">Notes : ${invoice.notes}</div>` : ''}
  <div class="footer">G&eacute;n&eacute;r&eacute; par Maellis &middot; ${new Date().toLocaleDateString('fr-FR')}</div>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${invoice.number}.html"`,
      },
    })
  } catch (error) {
    console.error('PDF error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
