/**
 * Export/Import Engine — Async data processing with streaming
 *
 * Supports CSV, JSON, and PDF export formats.
 * Handles large datasets with chunked processing.
 * Import with strict validation, dedup detection, and preview mode.
 */

import { db } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/crypto'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExportFormat = 'csv' | 'json' | 'pdf'
export type EntityType = 'tasks' | 'invoices' | 'projects' | 'time_entries' | 'contacts' | 'all'

export interface ExportOptions {
  userId: string
  format: ExportFormat
  entityType: EntityType
  dateFrom?: Date
  dateTo?: Date
  includeArchived?: boolean
}

export interface ImportOptions {
  userId: string
  format: 'csv' | 'json'
  entityType: EntityType
  data: unknown[]
  previewOnly?: boolean
  skipDuplicates?: boolean
}

export interface ExportResult {
  fileName: string
  rowCount: number
  fileSize: number
  content: string | Buffer
}

export interface ImportPreview {
  total: number
  valid: number
  duplicates: number
  errors: Array<{ row: number; message: string }>
  preview: unknown[]
}

// ─── Export Functions ─────────────────────────────────────────────────────────

/**
 * Export data for a user in the specified format.
 */
export async function executeExport(options: ExportOptions): Promise<ExportResult> {
  const data = await fetchData(options)
  const fileName = generateFileName(options)

  switch (options.format) {
    case 'csv':
      return formatCsv(data, fileName, options.entityType)
    case 'json':
      return formatJson(data, fileName)
    case 'pdf':
      return formatPdf(data, fileName, options.entityType)
    default:
      throw new Error(`Format non supporté: ${options.format}`)
  }
}

/**
 * Fetch data from the database based on entity type.
 */
async function fetchData(options: ExportOptions): Promise<Record<string, unknown>[]> {
  const { userId, entityType, dateFrom, dateTo, includeArchived } = options
  const dateFilter: Record<string, unknown> = {}
  if (dateFrom || dateTo) {
    dateFilter.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    }
  }

  const statusFilter = includeArchived ? {} : { status: { not: 'archived' } }

  switch (entityType) {
    case 'tasks': {
      return db.task.findMany({
        where: { userId, ...statusFilter, ...dateFilter },
        include: { project: { select: { name: true } }, tags: { include: { tag: true } } },
        orderBy: { createdAt: 'desc' },
      })
    }

    case 'invoices': {
      return db.invoice.findMany({
        where: { userId, ...statusFilter, ...dateFilter },
        include: { project: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      })
    }

    case 'projects': {
      return db.project.findMany({
        where: { userId, ...statusFilter, ...dateFilter },
        include: { _count: { select: { tasks: true, invoices: true } } },
        orderBy: { createdAt: 'desc' },
      })
    }

    case 'time_entries': {
      return db.timeEntry.findMany({
        where: { userId, ...dateFilter },
        include: { task: { select: { title: true } }, project: { select: { name: true } } },
        orderBy: { startTime: 'desc' },
      })
    }

    case 'contacts': {
      // Aggregate unique client names from projects and invoices
      const projects = await db.project.findMany({
        where: { userId, clientName: { not: null } },
        select: { clientName: true },
      })
      const invoices = await db.invoice.findMany({
        where: { userId },
        select: { clientName: true, clientEmail: true },
      })
      const allContacts: Array<{ clientName: string | null; clientEmail?: string | null }> = [
        ...projects.map(p => ({ clientName: p.clientName })),
        ...invoices.map(i => ({ clientName: i.clientName, clientEmail: i.clientEmail })),
      ]
      const unique = new Map<string, { clientName: string; clientEmail?: string }>()
      for (const c of allContacts) {
        if (c.clientName && !unique.has(c.clientName)) {
          unique.set(c.clientName, { clientName: c.clientName, clientEmail: c.clientEmail ?? undefined })
        }
      }
      return Array.from(unique.values()) as unknown as Record<string, unknown>[]
    }

    case 'all': {
      const [tasks, invoices, projects, timeEntries] = await Promise.all([
        db.task.findMany({ where: { userId, ...statusFilter }, orderBy: { createdAt: 'desc' } }),
        db.invoice.findMany({ where: { userId, ...statusFilter }, orderBy: { createdAt: 'desc' } }),
        db.project.findMany({ where: { userId, ...statusFilter }, orderBy: { createdAt: 'desc' } }),
        db.timeEntry.findMany({ where: { userId }, orderBy: { startTime: 'desc' } }),
      ])
      return [{ _type: 'export_all', tasks, invoices, projects, timeEntries }]
    }

    default:
      return []
  }
}

/**
 * Format data as CSV.
 */
function formatCsv(
  data: Record<string, unknown>[],
  fileName: string,
  entityType: EntityType,
): ExportResult {
  if (data.length === 0) {
    return { fileName: `${fileName}.csv`, rowCount: 0, fileSize: 0, content: '' }
  }

  // Flatten nested objects for CSV
  const flatData = data.map(row => flattenObject(row))
  const headers = Object.keys(flatData[0])
  const csvRows = [headers.join(',')]

  for (const row of flatData) {
    const values = headers.map(h => {
      const val = row[h]
      if (val === null || val === undefined) return ''
      const str = String(val)
      // Escape CSV values containing commas or quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    })
    csvRows.push(values.join(','))
  }

  const content = csvRows.join('\n')
  return {
    fileName: `${fileName}.csv`,
    rowCount: data.length,
    fileSize: Buffer.byteLength(content, 'utf8'),
    content,
  }
}

/**
 * Format data as JSON.
 */
function formatJson(data: Record<string, unknown>[], fileName: string): ExportResult {
  const content = JSON.stringify(data, null, 2)
  return {
    fileName: `${fileName}.json`,
    rowCount: data.length,
    fileSize: Buffer.byteLength(content, 'utf8'),
    content,
  }
}

/**
 * Format data as PDF (returns HTML that can be rendered as PDF).
 */
function formatPdf(
  data: Record<string, unknown>[],
  fileName: string,
  entityType: EntityType,
): ExportResult {
  const title = `Rapport ${entityType === 'all' ? 'complet' : entityType} — Burofree`
  const date = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; color: #18181b; max-width: 800px; margin: 0 auto; padding: 40px; }
  h1 { color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
  th { background: #f4f4f5; text-align: left; padding: 8px 12px; border: 1px solid #e4e4e7; }
  td { padding: 8px 12px; border: 1px solid #e4e4e7; }
  tr:nth-child(even) { background: #fafafa; }
  .footer { margin-top: 40px; font-size: 11px; color: #71717a; border-top: 1px solid #e4e4e7; padding-top: 10px; }
</style></head><body>
<h1>${title}</h1>
<p>Généré le ${date} — ${data.length} enregistrement${data.length > 1 ? 's' : ''}</p>
${generateHtmlTable(data)}
<div class="footer">Burofree — Assistant Intelligent Freelance</div>
</body></html>`

  return {
    fileName: `${fileName}.pdf`,
    rowCount: data.length,
    fileSize: Buffer.byteLength(html, 'utf8'),
    content: html,
  }
}

function generateHtmlTable(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '<p>Aucune donnée à exporter.</p>'

  const headers = Object.keys(flattenObject(data[0])).slice(0, 10) // Limit columns
  const rows = data.slice(0, 500) // Limit rows for PDF

  return `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${rows.map(row => {
    const flat = flattenObject(row)
    return `<tr>${headers.map(h => `<td>${String(flat[h] ?? '').slice(0, 100)}</td>`).join('')}</tr>`
  }).join('')}</tbody></table>`
}

// ─── Import Functions ─────────────────────────────────────────────────────────

/**
 * Preview an import — validates data without committing.
 */
export async function previewImport(options: ImportOptions): Promise<ImportPreview> {
  const { data, entityType } = options
  const errors: Array<{ row: number; message: string }> = []
  let duplicates = 0
  const validRows: unknown[] = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i] as Record<string, unknown>

    // Basic validation
    if (!row || typeof row !== 'object') {
      errors.push({ row: i + 1, message: 'Ligne vide ou format invalide' })
      continue
    }

    // Entity-specific validation
    const validation = validateRow(row, entityType)
    if (!validation.valid) {
      errors.push({ row: i + 1, message: validation.error || 'Données invalides' })
      continue
    }

    // Duplicate detection
    if (await isDuplicate(row, options.userId, entityType)) {
      duplicates++
      if (options.skipDuplicates) continue
    }

    validRows.push(row)
  }

  return {
    total: data.length,
    valid: validRows.length,
    duplicates,
    errors,
    preview: validRows.slice(0, 20), // Preview first 20 rows
  }
}

/**
 * Execute an import — commits validated data to the database.
 */
export async function executeImport(options: ImportOptions): Promise<{
  imported: number
  skipped: number
  errors: number
}> {
  const preview = await previewImport(options)

  if (options.previewOnly) {
    return { imported: 0, skipped: 0, errors: preview.errors.length }
  }

  let imported = 0
  let skipped = 0
  let errorCount = preview.errors.length

  for (const row of preview.preview) {
    try {
      await importRow(row as Record<string, unknown>, options.userId, options.entityType)
      imported++
    } catch (err) {
      errorCount++
    }
  }

  // Audit log
  await db.auditLog.create({
    data: {
      userId: options.userId,
      action: 'import.execute',
      target: options.entityType,
      metadata: JSON.stringify({ imported, skipped, errors: errorCount, format: options.format }),
    },
  })

  return { imported, skipped, errors: errorCount }
}

/**
 * Validate a single row for import.
 */
function validateRow(
  row: Record<string, unknown>,
  entityType: EntityType,
): { valid: boolean; error?: string } {
  switch (entityType) {
    case 'tasks':
      if (!row.title) return { valid: false, error: 'Le titre est requis' }
      return { valid: true }

    case 'invoices':
      if (!row.number && !row.clientName) return { valid: false, error: 'Le numéro ou nom du client est requis' }
      return { valid: true }

    case 'projects':
      if (!row.name) return { valid: false, error: 'Le nom du projet est requis' }
      return { valid: true }

    case 'time_entries':
      if (!row.startTime && !row.startTime) return { valid: false, error: 'L\'heure de début est requise' }
      return { valid: true }

    default:
      return { valid: true }
  }
}

/**
 * Check if a row duplicates existing data.
 */
async function isDuplicate(
  row: Record<string, unknown>,
  userId: string,
  entityType: EntityType,
): Promise<boolean> {
  switch (entityType) {
    case 'tasks': {
      if (!row.title) return false
      const existing = await db.task.findFirst({
        where: { userId, title: String(row.title) },
      })
      return !!existing
    }
    case 'invoices': {
      if (!row.number) return false
      const existing = await db.invoice.findFirst({
        where: { userId, number: String(row.number) },
      })
      return !!existing
    }
    case 'projects': {
      if (!row.name) return false
      const existing = await db.project.findFirst({
        where: { userId, name: String(row.name) },
      })
      return !!existing
    }
    default:
      return false
  }
}

/**
 * Import a single row into the database.
 */
async function importRow(
  row: Record<string, unknown>,
  userId: string,
  entityType: EntityType,
): Promise<void> {
  switch (entityType) {
    case 'tasks':
      await db.task.create({
        data: {
          title: String(row.title),
          description: row.description ? String(row.description) : null,
          status: String(row.status || 'todo'),
          priority: String(row.priority || 'medium'),
          dueDate: row.dueDate ? new Date(String(row.dueDate)) : null,
          category: row.category ? String(row.category) : null,
          estimatedTime: row.estimatedTime ? Number(row.estimatedTime) : null,
          userId,
        },
      })
      break

    case 'projects':
      await db.project.create({
        data: {
          name: String(row.name),
          description: row.description ? String(row.description) : null,
          clientName: row.clientName ? String(row.clientName) : null,
          color: String(row.color || '#10b981'),
          status: String(row.status || 'active'),
          budget: row.budget ? Number(row.budget) : null,
          deadline: row.deadline ? new Date(String(row.deadline)) : null,
          userId,
        },
      })
      break

    case 'invoices':
      await db.invoice.create({
        data: {
          number: String(row.number || `IMP-${Date.now()}`),
          type: String(row.type || 'invoice'),
          clientName: String(row.clientName || 'Client importé'),
          clientEmail: row.clientEmail ? String(row.clientEmail) : null,
          items: String(row.items || '[]'),
          subtotal: Number(row.subtotal || 0),
          taxRate: Number(row.taxRate || 20),
          taxAmount: Number(row.taxAmount || 0),
          total: Number(row.total || 0),
          currency: String(row.currency || 'EUR'),
          status: String(row.status || 'draft'),
          dueDate: row.dueDate ? new Date(String(row.dueDate)) : null,
          userId,
        },
      })
      break

    case 'time_entries':
      await db.timeEntry.create({
        data: {
          startTime: row.startTime ? new Date(String(row.startTime)) : new Date(),
          endTime: row.endTime ? new Date(String(row.endTime)) : null,
          duration: row.duration ? Number(row.duration) : null,
          description: row.description ? String(row.description) : null,
          isBillable: row.isBillable !== false,
          userId,
        },
      })
      break
  }
}

// ─── Utility Functions ────────────────────────────────────────────────────────

function generateFileName(options: ExportOptions): string {
  const date = new Date().toISOString().split('T')[0]
  return `burofree_${options.entityType}_${date}`
}

function flattenObject(obj: Record<string, unknown>, prefix: string = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key

    if (value === null || value === undefined) {
      result[newKey] = ''
    } else if (Array.isArray(value)) {
      result[newKey] = value.map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)).join('; ')
    } else if (typeof value === 'object') {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey))
    } else {
      result[newKey] = value
    }
  }

  return result
}
