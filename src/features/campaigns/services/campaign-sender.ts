/**
 * Campaign Sender Service
 * Handles campaign creation, sending, tracking, and CAN-SPAM compliance.
 */
import { db } from '@/lib/db'
import { sign, verify } from '@/lib/jwt-simple'
import { createHmac } from 'crypto'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CampaignCreateData {
  name: string
  subject: string
  fromName?: string
  fromEmail?: string
  replyTo?: string
  previewText?: string
  contentHtml?: string
  contentMjml?: string
  scheduleAt?: Date
  throttlePerHour?: number
  segmentIds?: string[]
  templateId?: string
  senderAddress?: string
  listUnsubscribe?: boolean
  doubleOptIn?: boolean
  teamId?: string
}

interface CampaignUpdateData {
  name?: string
  subject?: string
  fromName?: string
  fromEmail?: string
  replyTo?: string
  previewText?: string
  contentHtml?: string
  contentMjml?: string
  scheduleAt?: Date | null
  throttlePerHour?: number
  segmentIds?: string[]
  templateId?: string | null
  senderAddress?: string
  listUnsubscribe?: boolean
  doubleOptIn?: boolean
  status?: string
}

interface CampaignFilters {
  status?: string
  search?: string
  teamId?: string
}

interface Pagination {
  page: number
  limit: number
}

// ─── Campaign CRUD ─────────────────────────────────────────────────────────────

export async function createCampaign(userId: string, data: CampaignCreateData) {
  // CAN-SPAM: require senderAddress when listUnsubscribe is true
  if (data.listUnsubscribe !== false && !data.senderAddress) {
    console.warn('[Campaign] Campaign created without sender physical address — CAN-SPAM requires it before sending')
  }

  return db.campaign.create({
    data: {
      name: data.name,
      subject: data.subject,
      fromName: data.fromName,
      fromEmail: data.fromEmail,
      replyTo: data.replyTo,
      previewText: data.previewText,
      contentHtml: data.contentHtml,
      contentMjml: data.contentMjml,
      scheduleAt: data.scheduleAt,
      throttlePerHour: data.throttlePerHour ?? 0,
      segmentIds: JSON.stringify(data.segmentIds ?? []),
      templateId: data.templateId,
      senderAddress: data.senderAddress,
      listUnsubscribe: data.listUnsubscribe ?? true,
      doubleOptIn: data.doubleOptIn ?? false,
      userId,
      teamId: data.teamId,
    },
  })
}

export async function updateCampaign(id: string, userId: string, data: CampaignUpdateData) {
  const campaign = await db.campaign.findFirst({ where: { id, userId } })
  if (!campaign) throw new Error('Campaign not found')

  // Cannot update a sent/sending campaign
  if (['sent', 'sending'].includes(campaign.status) && data.status === undefined) {
    throw new Error('Cannot modify a sent or sending campaign')
  }

  const updateData: Record<string, unknown> = { ...data }
  if (data.segmentIds) {
    updateData.segmentIds = JSON.stringify(data.segmentIds)
  }
  if (data.scheduleAt === null) {
    updateData.scheduleAt = null
  }

  return db.campaign.update({
    where: { id },
    data: updateData,
  })
}

export async function getCampaigns(userId: string, filters: CampaignFilters, pagination: Pagination) {
  const where: Record<string, unknown> = { userId }

  if (filters.status) where.status = filters.status
  if (filters.teamId) where.teamId = filters.teamId
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { subject: { contains: filters.search } },
    ]
  }

  const [campaigns, total] = await Promise.all([
    db.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      include: {
        _count: { select: { recipients: true, links: true } },
      },
    }),
    db.campaign.count({ where }),
  ])

  return { campaigns, total, page: pagination.page, limit: pagination.limit }
}

export async function getCampaign(id: string, userId: string) {
  const campaign = await db.campaign.findFirst({
    where: { id, userId },
    include: {
      recipients: {
        orderBy: { createdAt: 'desc' },
        take: 100,
      },
      links: true,
    },
  })

  if (!campaign) throw new Error('Campaign not found')
  return campaign
}

// ─── Campaign Sending ──────────────────────────────────────────────────────────

export async function scheduleCampaign(id: string, userId: string, scheduleAt: Date) {
  const campaign = await db.campaign.findFirst({ where: { id, userId } })
  if (!campaign) throw new Error('Campaign not found')
  if (campaign.status !== 'draft') throw new Error('Only draft campaigns can be scheduled')

  // CAN-SPAM: validate before scheduling
  validateCanSpam(campaign)

  return db.campaign.update({
    where: { id },
    data: { status: 'scheduled', scheduleAt },
  })
}

export async function sendCampaign(id: string, userId: string) {
  const campaign = await db.campaign.findFirst({
    where: { id, userId },
    include: { recipients: true },
  })
  if (!campaign) throw new Error('Campaign not found')
  if (!['draft', 'scheduled'].includes(campaign.status)) {
    throw new Error('Only draft or scheduled campaigns can be sent')
  }

  // CAN-SPAM: validate before sending
  validateCanSpam(campaign)

  // Mark as sending
  await db.campaign.update({ where: { id }, data: { status: 'sending' } })

  try {
    // Resolve recipients from segments
    const segmentIds: string[] = JSON.parse(campaign.segmentIds || '[]')
    let contacts: { id: string; email: string | null; firstName: string | null; lastName: string; status: string }[] = []

    if (segmentIds.length > 0) {
      // Get contacts from specified contact groups
      const groupMembers = await db.contactGroupMember.findMany({
        where: { groupId: { in: segmentIds } },
        include: {
          contact: {
            select: { id: true, email: true, firstName: true, lastName: true, status: true },
          },
        },
      })
      contacts = groupMembers
        .map(gm => gm.contact)
        .filter(c => c.email && c.status !== 'unsubscribed' && c.status !== 'bounced')
    } else {
      // No segments: send to all active contacts owned by user
      contacts = await db.crmContact.findMany({
        where: {
          userId,
          status: 'active',
          email: { not: null },
        },
        select: { id: true, email: true, firstName: true, lastName: true, status: true },
      })
    }

    // Deduplicate by contact ID
    const seen = new Set<string>()
    const uniqueContacts = contacts.filter(c => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })

    // Create CampaignRecipient records (skip existing)
    const recipientData = uniqueContacts.map(contact => ({
      campaignId: id,
      contactId: contact.id,
      email: contact.email!,
      trackingPixel: generatePixelId(),
      status: 'pending' as const,
    }))

    // Batch create recipients (SQLite doesn't support createMany with skipDuplicates well)
    for (const rd of recipientData) {
      try {
        await db.campaignRecipient.create({ data: rd })
      } catch {
        // Skip duplicate (unique constraint on campaignId+contactId)
      }
    }

    // MVP: Simulate sending — mark all as 'sent'
    const now = new Date()
    await db.campaignRecipient.updateMany({
      where: { campaignId: id, status: 'pending' },
      data: { status: 'sent', sentAt: now },
    })

    // Update campaign stats
    const sentCount = await db.campaignRecipient.count({ where: { campaignId: id, status: 'sent' } })
    await db.campaign.update({
      where: { id },
      data: {
        status: 'sent',
        stats: JSON.stringify({ sent: sentCount, delivered: sentCount, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, complained: 0 }),
      },
    })

    console.log(`[Campaign] Campaign "${campaign.name}" sent to ${sentCount} recipients (MVP: simulated)`)

    return { sent: sentCount }
  } catch (error) {
    // Mark campaign as failed/paused
    await db.campaign.update({ where: { id }, data: { status: 'draft' } })
    throw error
  }
}

// ─── Tracking ──────────────────────────────────────────────────────────────────

export async function trackOpen(campaignId: string, contactId: string, pixelId: string) {
  const recipient = await db.campaignRecipient.findFirst({
    where: { campaignId, contactId, trackingPixel: pixelId },
  })
  if (!recipient) return

  const now = new Date()
  await db.campaignRecipient.update({
    where: { id: recipient.id },
    data: {
      openedAt: recipient.openedAt ?? now,
      openCount: recipient.openCount + 1,
    },
  })

  // Update campaign stats
  await incrementCampaignStat(campaignId, 'opened')
}

export async function trackClick(linkTrackingId: string) {
  const link = await db.campaignLink.findUnique({ where: { trackingId: linkTrackingId } })
  if (!link) throw new Error('Link not found')

  await db.campaignLink.update({
    where: { id: link.id },
    data: { clicks: link.clicks + 1, uniqueClicks: link.uniqueClicks + 1 },
  })

  // Update campaign stats
  await incrementCampaignStat(link.campaignId, 'clicked')

  return link.originalUrl
}

// ─── Unsubscribe (CAN-SPAM) ────────────────────────────────────────────────────

export async function unsubscribe(contactId: string, token: string) {
  // Verify the unsubscribe token
  const payload = verifyUnsubscribeToken(token)
  if (payload.contactId !== contactId) throw new Error('Invalid unsubscribe token')

  // Mark contact as unsubscribed
  await db.crmContact.update({
    where: { id: contactId },
    data: { status: 'unsubscribed' },
  })

  // Mark campaign recipient as unsubscribed
  const now = new Date()
  await db.campaignRecipient.updateMany({
    where: { contactId, campaignId: payload.campaignId },
    data: { unsubscribedAt: now },
  })

  // Update campaign stats
  await incrementCampaignStat(payload.campaignId, 'unsubscribed')

  console.log(`[Campaign] Contact ${contactId} unsubscribed from campaign ${payload.campaignId}`)
}

export function generateUnsubscribeToken(contactId: string, campaignId: string): string {
  return sign(
    { contactId, campaignId, type: 'unsubscribe' },
    { expiresIn: '30d' },
  )
}

export function verifyUnsubscribeToken(token: string): { contactId: string; campaignId: string } {
  const payload = verify(token)
  if (payload.type !== 'unsubscribe') throw new Error('Invalid token type')
  return { contactId: payload.contactId as string, campaignId: payload.campaignId as string }
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

export async function getCampaignStats(id: string) {
  const campaign = await db.campaign.findUnique({
    where: { id },
    include: {
      _count: { select: { recipients: true, links: true } },
    },
  })
  if (!campaign) throw new Error('Campaign not found')

  const [sent, delivered, opened, clicked, bounced, unsubscribed, complained] = await Promise.all([
    db.campaignRecipient.count({ where: { campaignId: id, status: 'sent' } }),
    db.campaignRecipient.count({ where: { campaignId: id, status: 'delivered' } }),
    db.campaignRecipient.count({ where: { campaignId: id, openedAt: { not: null } } }),
    db.campaignRecipient.count({ where: { campaignId: id, clickedAt: { not: null } } }),
    db.campaignRecipient.count({ where: { campaignId: id, status: 'bounced' } }),
    db.campaignRecipient.count({ where: { campaignId: id, unsubscribedAt: { not: null } } }),
    db.campaignRecipient.count({ where: { campaignId: id, complainedAt: { not: null } } }),
  ])

  const totalRecipients = await db.campaignRecipient.count({ where: { campaignId: id } })

  return {
    totalRecipients,
    sent,
    delivered: delivered || sent, // MVP: treat sent as delivered
    opened,
    clicked,
    bounced,
    unsubscribed,
    complained,
    openRate: totalRecipients > 0 ? (opened / totalRecipients) * 100 : 0,
    clickRate: totalRecipients > 0 ? (clicked / totalRecipients) * 100 : 0,
    bounceRate: totalRecipients > 0 ? (bounced / totalRecipients) * 100 : 0,
    unsubscribeRate: totalRecipients > 0 ? (unsubscribed / totalRecipients) * 100 : 0,
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function validateCanSpam(campaign: {
  senderAddress: string | null
  fromName: string | null
  fromEmail: string | null
  subject: string
  listUnsubscribe: boolean
}) {
  const errors: string[] = []

  if (!campaign.senderAddress) {
    errors.push('CAN-SPAM: Sender physical address is required')
  }
  if (!campaign.fromEmail) {
    errors.push('CAN-SPAM: From email is required')
  }
  if (!campaign.subject || campaign.subject.trim().length === 0) {
    errors.push('CAN-SPAM: Subject line must not be deceptive or empty')
  }

  if (errors.length > 0) {
    throw new Error(`CAN-SPAM compliance errors: ${errors.join('; ')}`)
  }
}

function generatePixelId(): string {
  return createHmac('sha256', Math.random().toString(36))
    .update(Date.now().toString())
    .digest('hex')
    .slice(0, 16)
}

async function incrementCampaignStat(campaignId: string, stat: 'opened' | 'clicked' | 'bounced' | 'unsubscribed' | 'complained') {
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return

  const stats = JSON.parse(campaign.stats || '{}')
  stats[stat] = (stats[stat] || 0) + 1
  await db.campaign.update({
    where: { id: campaignId },
    data: { stats: JSON.stringify(stats) },
  })
}
