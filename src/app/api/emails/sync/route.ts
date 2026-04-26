import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchGmailEmails, type GoogleMessage } from '@/lib/google'
import { fetchOutlookEmails, type OutlookMessage } from '@/lib/microsoft'

/**
 * GET /api/emails/sync
 *
 * Fetches new emails from Gmail or Outlook and saves
 * them to the local DB. Handles deduplication by sourceId and categorizes
 * emails using simple heuristic rules.
 *
 * Query params:
 *   - accountId (optional): specific email account to sync; defaults to primary
 *   - maxResults (optional): max emails to fetch per batch (default 20)
 *   - pageToken (optional): Gmail page token for pagination
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get('accountId')
    const maxResults = parseInt(searchParams.get('maxResults') || '20')
    const pageToken = searchParams.get('pageToken') || undefined

    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    // Find the email account to sync
    let account = accountId
      ? await db.emailAccount.findUnique({ where: { id: accountId } })
      : await db.emailAccount.findFirst({ where: { userId: user.id, isPrimary: true } })

    if (!account) {
      // Try any account for this user
      account = await db.emailAccount.findFirst({ where: { userId: user.id } })
    }

    if (!account) {
      return NextResponse.json(
        { error: 'No email account connected. Please connect an email account first.' },
        { status: 400 },
      )
    }

    let importedCount = 0
    let skippedCount = 0
    let nextPageToken: string | undefined

    if (account.provider === 'gmail') {
      // Sync from Gmail
      const result = await fetchGmailEmails(account.id, maxResults, pageToken)
      nextPageToken = result.nextPageToken

      for (const msg of result.messages) {
        // Deduplication: check if sourceId (Gmail message ID) already exists
        const existing = await db.email.findFirst({
          where: { sourceId: msg.id },
        })

        if (existing) {
          skippedCount++
          continue
        }

        // Categorize email using heuristic rules
        const category = categorizeGmailEmail(msg)

        await db.email.create({
          data: {
            fromAddress: msg.from,
            fromName: msg.fromName || null,
            toAddress: msg.to || account.email,
            subject: msg.subject || '(Sans objet)',
            body: msg.body,
            snippet: msg.snippet,
            isRead: msg.isRead,
            isStarred: false,
            isSent: false,
            category,
            hasTask: false,
            source: 'google',
            sourceId: msg.id,
            emailAccountId: account.id,
            userId: user.id,
          },
        })

        importedCount++
      }

      // Update the history ID for incremental sync
      if (result.messages.length > 0) {
        await db.emailAccount.update({
          where: { id: account.id },
          data: { gmailHistoryId: `synced-${Date.now()}` },
        })
      }
    } else if (account.provider === 'outlook') {
      // Sync from Microsoft Outlook via Graph API
      const messages = await fetchOutlookEmails(account.id, maxResults)

      for (const msg of messages) {
        // Deduplication: check if sourceId (Outlook message ID) already exists
        const existing = await db.email.findFirst({
          where: { sourceId: msg.id },
        })

        if (existing) {
          skippedCount++
          continue
        }

        // Categorize email using heuristic rules adapted for Outlook
        const category = categorizeOutlookEmail(msg)

        await db.email.create({
          data: {
            fromAddress: msg.from,
            fromName: msg.fromName || null,
            toAddress: msg.to || account.email,
            subject: msg.subject || '(Sans objet)',
            body: msg.body,
            snippet: msg.snippet,
            isRead: msg.isRead,
            isStarred: false,
            isSent: false,
            category,
            hasTask: false,
            source: 'outlook',
            sourceId: msg.id,
            emailAccountId: account.id,
            userId: user.id,
          },
        })

        importedCount++
      }

      // Track last sync time in gmailHistoryId field (reused for Outlook too)
      if (messages.length > 0) {
        await db.emailAccount.update({
          where: { id: account.id },
          data: { gmailHistoryId: `outlook-synced-${Date.now()}` },
        })
      }
    } else {
      return NextResponse.json(
        { error: `Unsupported provider: ${account.provider}` },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
      skipped: skippedCount,
      nextPageToken,
    })
  } catch (error) {
    console.error('Email sync error:', error)
    const message = error instanceof Error ? error.message : 'Failed to sync emails'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Categorize a Gmail email using heuristic rules.
 *
 * Categories:
 *   - client: Direct messages from known client domains or personal emails
 *   - newsletter: Bulk/marketing emails (lists, unsub links)
 *   - admin: System notifications, automated messages
 *   - spam: Obvious spam patterns
 */
function categorizeGmailEmail(msg: GoogleMessage): string {
  const subject = msg.subject.toLowerCase()
  const from = msg.from.toLowerCase()
  const body = (msg.body || '').toLowerCase()

  // Newsletter indicators
  const newsletterIndicators = [
    'unsubscribe',
    'se désinscrire',
    'newsletter',
    'bulletin',
    'no-reply@',
    'noreply@',
    'ne-pas-repondre@',
    'mailing@',
    'notifications@',
  ]

  if (newsletterIndicators.some(ind => from.includes(ind) || body.includes(ind))) {
    return 'newsletter'
  }

  // Spam indicators
  const spamIndicators = [
    'viagra',
    'lottery',
    'loterie',
    'congratulations you won',
    'click here to claim',
    'free money',
    'argent gratuit',
    'gagnez',
  ]

  if (spamIndicators.some(ind => subject.includes(ind) || body.includes(ind))) {
    return 'spam'
  }

  // Admin/system indicators
  const adminIndicators = [
    'noreply@',
    'no-reply@',
    'notification@',
    'alert@',
    'security@',
    'support@',
    'automated',
    'notification',
    'alerte',
    'sécurité',
  ]

  if (adminIndicators.some(ind => from.includes(ind) || subject.includes('notification') || subject.includes('alert'))) {
    return 'admin'
  }

  // Default to client category
  return 'client'
}

/**
 * Categorize an Outlook email using the same heuristic rules
 * adapted for the OutlookMessage format.
 */
function categorizeOutlookEmail(msg: OutlookMessage): string {
  const subject = msg.subject.toLowerCase()
  const from = msg.from.toLowerCase()
  const body = (msg.body || '').toLowerCase()

  // Newsletter indicators
  const newsletterIndicators = [
    'unsubscribe',
    'se désinscrire',
    'newsletter',
    'bulletin',
    'no-reply@',
    'noreply@',
    'ne-pas-repondre@',
    'mailing@',
    'notifications@',
  ]

  if (newsletterIndicators.some(ind => from.includes(ind) || body.includes(ind))) {
    return 'newsletter'
  }

  // Spam indicators
  const spamIndicators = [
    'viagra',
    'lottery',
    'loterie',
    'congratulations you won',
    'click here to claim',
    'free money',
    'argent gratuit',
    'gagnez',
  ]

  if (spamIndicators.some(ind => subject.includes(ind) || body.includes(ind))) {
    return 'spam'
  }

  // Admin/system indicators
  const adminIndicators = [
    'noreply@',
    'no-reply@',
    'notification@',
    'alert@',
    'security@',
    'support@',
    'automated',
    'notification',
    'alerte',
    'sécurité',
  ]

  if (adminIndicators.some(ind => from.includes(ind) || subject.includes('notification') || subject.includes('alert'))) {
    return 'admin'
  }

  // Default to client category
  return 'client'
}
