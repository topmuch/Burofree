import { db } from '@/lib/db'
import type { ContactQueryInput, ContactCreateInput, ContactUpdateInput } from '@/lib/validations/crm'

// ─── Types ──────────────────────────────────────────────────────────────────

interface PaginatedResult<T> {
  data: T[]
  nextCursor: string | null
  total: number
}

// ─── Get Contacts (cursor-based pagination) ────────────────────────────────

export async function getContacts(
  userId: string,
  filters: ContactQueryInput,
): Promise<PaginatedResult<any>> {
  const {
    search, status, lifecycle, source, company, tag,
    scoreMin, scoreMax, teamId, cursor, limit, sort, order,
  } = filters

  const where: any = { userId }

  if (teamId) where.teamId = teamId
  if (status) where.status = status
  if (lifecycle) where.lifecycle = lifecycle
  if (source) where.source = source
  if (company) where.company = { contains: company }
  if (scoreMin !== undefined || scoreMax !== undefined) {
    where.score = {}
    if (scoreMin !== undefined) where.score.gte = scoreMin
    if (scoreMax !== undefined) where.score.lte = scoreMax
  }
  if (tag) {
    // Search in JSON tags array — SQLite LIKE
    where.tags = { contains: tag }
  }
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
      { company: { contains: search } },
      { phone: { contains: search } },
    ]
  }
  if (cursor) {
    where.id = { lt: cursor }
  }

  const orderBy: any = {}
  orderBy[sort] = order

  const [data, total] = await Promise.all([
    db.crmContact.findMany({
      where,
      orderBy,
      take: limit + 1,
      include: {
        deals: {
          where: { status: 'open' },
          select: { id: true, title: true, value: true },
          take: 3,
        },
        _count: { select: { activities: true, notes: true, deals: true } },
      },
    }),
    db.crmContact.count({ where: cursor ? { userId } : where }),
  ])

  const hasMore = data.length > limit
  const items = hasMore ? data.slice(0, -1) : data
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null

  return { data: items, nextCursor, total }
}

// ─── Get Single Contact ─────────────────────────────────────────────────────

export async function getContact(id: string, userId: string) {
  const contact = await db.crmContact.findFirst({
    where: { id, userId },
    include: {
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      notes: {
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 50,
      },
      deals: {
        include: {
          pipeline: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { activities: true, notes: true, deals: true } },
    },
  })

  return contact
}

// ─── Create Contact (with dedup) ────────────────────────────────────────────

export async function createContact(userId: string, data: ContactCreateInput) {
  // Dedup check by email or phone
  if (data.email) {
    const existing = await db.crmContact.findFirst({
      where: { userId, email: data.email },
    })
    if (existing) {
      throw new Error('Un contact avec cet email existe déjà')
    }
  }
  if (data.phone) {
    const existing = await db.crmContact.findFirst({
      where: { userId, phone: data.phone },
    })
    if (existing) {
      throw new Error('Un contact avec ce téléphone existe déjà')
    }
  }

  const contact = await db.crmContact.create({
    data: {
      ...data,
      userId,
      email: data.email || null,
      phone: data.phone || null,
    },
  })

  // Log activity
  await logActivity(contact.id, 'note_added', 'Contact créé', null, userId)

  return contact
}

// ─── Update Contact ─────────────────────────────────────────────────────────

export async function updateContact(id: string, userId: string, data: ContactUpdateInput) {
  const existing = await db.crmContact.findFirst({ where: { id, userId } })
  if (!existing) throw new Error('Contact non trouvé')

  // Dedup check for email
  if (data.email && data.email !== existing.email) {
    const dup = await db.crmContact.findFirst({
      where: { userId, email: data.email, id: { not: id } },
    })
    if (dup) throw new Error('Un autre contact utilise déjà cet email')
  }

  const contact = await db.crmContact.update({
    where: { id },
    data,
  })

  // Log lifecycle changes
  if (data.lifecycle && data.lifecycle !== existing.lifecycle) {
    await logActivity(
      id,
      'tag_added',
      `Cycle de vie: ${existing.lifecycle} → ${data.lifecycle}`,
      JSON.stringify({ old: existing.lifecycle, new: data.lifecycle }),
      userId,
    )
  }

  return contact
}

// ─── Delete Contact ─────────────────────────────────────────────────────────

export async function deleteContact(id: string, userId: string) {
  const existing = await db.crmContact.findFirst({ where: { id, userId } })
  if (!existing) throw new Error('Contact non trouvé')

  await db.crmContact.delete({ where: { id } })
  return { success: true }
}

// ─── Import Contacts CSV ────────────────────────────────────────────────────

export async function importContactsCSV(
  userId: string,
  csvData: string,
  teamId?: string,
  mapping?: Record<string, string>,
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const lines = csvData.split('\n').filter(l => l.trim())
  if (lines.length < 2) throw new Error('Le CSV doit contenir au moins un en-tête et une ligne de données')

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const defaultMapping: Record<string, string> = {
    firstName: 'firstName', first_name: 'firstName', prenom: 'firstName', prénom: 'firstName',
    lastName: 'lastName', last_name: 'lastName', nom: 'lastName',
    email: 'email', courriel: 'email',
    phone: 'phone', telephone: 'phone', téléphone: 'phone', tel: 'phone',
    company: 'company', entreprise: 'company', societe: 'company', société: 'company',
    jobTitle: 'jobTitle', job_title: 'jobTitle', poste: 'jobTitle', titre: 'jobTitle',
  }

  const fieldMap = mapping || defaultMapping
  const colToField: Record<number, string> = {}
  headers.forEach((h, i) => {
    const field = fieldMap[h]
    if (field) colToField[i] = field
  })

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const record: Record<string, string> = {}
    Object.entries(colToField).forEach(([colIdx, field]) => {
      record[field] = values[parseInt(colIdx)]?.trim().replace(/^"|"$/g, '') || ''
    })

    if (!record.lastName) {
      skipped++
      errors.push(`Ligne ${i + 1}: nom manquant`)
      continue
    }

    // Dedup check
    if (record.email) {
      const dup = await db.crmContact.findFirst({ where: { userId, email: record.email } })
      if (dup) {
        skipped++
        continue
      }
    }

    try {
      await db.crmContact.create({
        data: {
          firstName: record.firstName || '',
          lastName: record.lastName,
          email: record.email || null,
          phone: record.phone || null,
          company: record.company || null,
          jobTitle: record.jobTitle || null,
          source: 'import',
          userId,
          teamId: teamId || null,
        },
      })
      imported++
    } catch (err) {
      skipped++
      errors.push(`Ligne ${i + 1}: ${(err as Error).message}`)
    }
  }

  return { imported, skipped, errors }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

// ─── Export Contacts CSV ────────────────────────────────────────────────────

export async function exportContactsCSV(
  userId: string,
  filters: ContactQueryInput,
): Promise<string> {
  const { data } = await getContacts(userId, { ...filters, limit: 1000, cursor: undefined })

  const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Entreprise', 'Poste', 'Source', 'Statut', 'Cycle de vie', 'Score', 'Tags']
  const rows = data.map((c: any) => [
    c.firstName || '',
    c.lastName,
    c.email || '',
    c.phone || '',
    c.company || '',
    c.jobTitle || '',
    c.source,
    c.status,
    c.lifecycle,
    String(c.score),
    c.tags || '[]',
  ])

  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')),
  ]

  return '\ufeff' + csvLines.join('\n') // BOM for French chars
}

// ─── Add Note ───────────────────────────────────────────────────────────────

export async function addNote(
  contactId: string,
  userId: string,
  content: string,
  isPinned = false,
) {
  const contact = await db.crmContact.findFirst({ where: { id: contactId, userId } })
  if (!contact) throw new Error('Contact non trouvé')

  const note = await db.contactNote.create({
    data: { contactId, content, isPinned, userId },
  })

  await logActivity(contactId, 'note_added', 'Note ajoutée', null, userId)

  return note
}

// ─── Log Activity ───────────────────────────────────────────────────────────

export async function logActivity(
  contactId: string,
  type: string,
  title: string,
  metadata?: string | null,
  userId?: string | null,
) {
  const [activity] = await Promise.all([
    db.activityTimeline.create({
      data: {
        contactId,
        type,
        title,
        metadata: metadata || '{}',
        userId: userId || null,
      },
    }),
    db.crmContact.update({
      where: { id: contactId },
      data: { lastActivityAt: new Date() },
    }).catch(() => {}),
  ])

  return activity
}

// ─── Get Contact Notes ──────────────────────────────────────────────────────

export async function getContactNotes(contactId: string, userId: string) {
  const contact = await db.crmContact.findFirst({ where: { id: contactId, userId } })
  if (!contact) throw new Error('Contact non trouvé')

  return db.contactNote.findMany({
    where: { contactId },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  })
}

// ─── Get Contact Activities ─────────────────────────────────────────────────

export async function getContactActivities(
  contactId: string,
  userId: string,
  filters?: { type?: string; limit?: number; cursor?: string },
) {
  const contact = await db.crmContact.findFirst({ where: { id: contactId, userId } })
  if (!contact) throw new Error('Contact non trouvé')

  const where: any = { contactId }
  if (filters?.type) where.type = filters.type
  if (filters?.cursor) where.id = { lt: filters.cursor }

  return db.activityTimeline.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 25,
  })
}
