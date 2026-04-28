/**
 * BullMQ Worker for Campaign Sending
 * Processes campaign-sending jobs with throttling support.
 * Each job sends one email to one recipient.
 */
import { Worker, Job } from 'bullmq'
import { redis } from '@/lib/redis'
import { db } from '@/lib/db'
import { campaignQueue } from '@/lib/queue'

interface CampaignEmailJob {
  campaignId: string
  recipientId: string
  contactId: string
  email: string
  subject: string
  htmlContent: string
  fromEmail: string
  fromName: string
  trackingPixel: string
  listUnsubscribe: boolean
  unsubscribeUrl?: string
}

/**
 * Process a single campaign email job.
 * In production, replace the console.log with a real email provider (Resend, SendGrid, etc.)
 */
async function processCampaignEmail(job: Job<CampaignEmailJob>): Promise<void> {
  const { campaignId, recipientId, email, subject, fromName, fromEmail } = job.data

  try {
    // TODO: Replace with real email sending via Resend/SendGrid/Mailgun
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({ from: `${fromName} <${fromEmail}>`, to: email, subject, html: htmlContent })

    console.log(`[CampaignWorker] Sending email to ${email}: ${subject}`)

    // Mark recipient as sent
    await db.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    })

    // Increment campaign stats
    const campaign = await db.campaign.findUnique({ where: { id: campaignId } })
    if (campaign) {
      const stats = JSON.parse(campaign.stats || '{}')
      stats.sent = (stats.sent || 0) + 1
      stats.delivered = (stats.delivered || 0) + 1
      await db.campaign.update({
        where: { id: campaignId },
        data: { stats: JSON.stringify(stats) },
      })
    }
  } catch (error) {
    // Mark recipient as failed
    await db.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: 'failed',
        bounceReason: error instanceof Error ? error.message : 'Unknown error',
      },
    }).catch(() => {}) // Don't fail the job if the update fails

    throw error // Re-throw to trigger BullMQ retry
  }
}

// Create the worker (only in non-edge runtime)
export function startCampaignWorker(): Worker<CampaignEmailJob> {
  const worker = new Worker<CampaignEmailJob>(
    'campaign-sending',
    processCampaignEmail,
    {
      connection: redis.duplicate(),
      concurrency: 10, // Process 10 emails at a time
      limiter: {
        max: 100, // Max 100 emails
        duration: 1000, // per second (adjust based on provider limits)
      },
    },
  )

  worker.on('completed', (job) => {
    console.log(`[CampaignWorker] Job ${job.id} completed — sent to ${job.data.email}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[CampaignWorker] Job ${job?.id} failed:`, err.message)
  })

  return worker
}

/**
 * Queue a campaign for sending by creating individual jobs for each recipient.
 * Respects throttlePerHour setting.
 */
export async function queueCampaignSend(campaignId: string, userId: string): Promise<{ queued: number }> {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
  })
  if (!campaign) throw new Error('Campaign not found')

  // Get pending recipients
  const recipients = await db.campaignRecipient.findMany({
    where: { campaignId, status: 'pending' },
  })

  if (recipients.length === 0) {
    return { queued: 0 }
  }

  // Calculate delay between jobs based on throttlePerHour
  const throttlePerHour = campaign.throttlePerHour || 0
  const delayMs = throttlePerHour > 0 ? Math.ceil(3600000 / throttlePerHour) : 0

  // Queue each recipient as a separate job
  const jobs = recipients.map((recipient, index) => ({
    name: `campaign-email`,
    data: {
      campaignId,
      recipientId: recipient.id,
      contactId: recipient.contactId,
      email: recipient.email,
      subject: campaign.subject,
      htmlContent: campaign.contentHtml || '',
      fromEmail: campaign.fromEmail || 'noreply@maellis.com',
      fromName: campaign.fromName || 'Maellis',
      trackingPixel: recipient.trackingPixel || '',
      listUnsubscribe: campaign.listUnsubscribe,
    } satisfies CampaignEmailJob,
    opts: {
      delay: delayMs * index, // Stagger sends based on throttle
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 5000,
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  }))

  await campaignQueue.addBulk(jobs)

  // Mark campaign as sending
  await db.campaign.update({
    where: { id: campaignId },
    data: { status: 'sending' },
  })

  return { queued: jobs.length }
}
