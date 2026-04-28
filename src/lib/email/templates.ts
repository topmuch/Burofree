/**
 * Email Templates — Maellis Notification System
 *
 * Production-ready HTML email templates with:
 *  - Responsive design (mobile-first)
 *  - Dark/light mode support
 *  - Branded design (emerald/green Maellis theme)
 *  - Accessibility (semantic HTML, alt text)
 *  - Inlining-friendly CSS (no external stylesheets)
 *
 * Each template returns { subject, html, text } for nodemailer.
 */

// ─── Base Layout ──────────────────────────────────────────────────────────────────

interface BaseTemplateParams {
  recipientName: string
  previewText: string
  content: string
  ctaUrl?: string
  ctaLabel?: string
  footerNote?: string
}

function baseTemplate(params: BaseTemplateParams): string {
  const { recipientName, previewText, content, ctaUrl, ctaLabel, footerNote } = params
  const siteUrl = process.env.NEXTAUTH_URL || 'https://maellis.com'

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${previewText}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #f4f4f5; }

    /* Responsive */
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; padding: 16px !important; }
      .email-content { padding: 20px !important; }
      .email-hero { padding: 24px 20px !important; }
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #18181b !important; }
      .email-card { background-color: #27272a !important; border-color: #3f3f46 !important; }
      .email-text { color: #e4e4e7 !important; }
      .email-subtext { color: #a1a1aa !important; }
      .email-heading { color: #f4f4f5 !important; }
    }
  </style>
</head>
<body class="email-bg" style="margin: 0; padding: 0; background-color: #f4f4f5;">
  <!-- Preheader (hidden preview text) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <div class="email-container" style="max-width: 600px; width: 100%;">

          <!-- Header / Logo -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding-bottom: 24px; text-align: center;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                  <tr>
                    <td style="padding-right: 10px; vertical-align: middle;">
                      <div style="width: 36px; height: 36px; border-radius: 8px; background: linear-gradient(135deg, #10b981, #059669); display: inline-block; text-align: center; line-height: 36px; color: white; font-weight: bold; font-size: 16px;">M</div>
                    </td>
                    <td style="vertical-align: middle;">
                      <span class="email-heading" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 600; color: #18181b;">Maellis</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Main Card -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td>
                <div class="email-card" style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">

                  <!-- Content -->
                  <div class="email-content" style="padding: 32px;">
                    <p class="email-subtext" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280; margin: 0 0 8px;">
                      Bonjour ${recipientName},
                    </p>

                    <div class="email-text" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #374151; line-height: 1.6;">
                      ${content}
                    </div>

                    ${ctaUrl && ctaLabel ? `
                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 24px;">
                      <tr>
                        <td align="center">
                          <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; text-decoration: none; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; letter-spacing: 0.02em;">
                            ${ctaLabel}
                          </a>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                  </div>
                </div>
              </td>
            </tr>
          </table>

          <!-- Footer -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding-top: 20px; text-align: center;">
                <p class="email-subtext" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #9ca3af; margin: 0;">
                  ${footerNote || 'Cet email a été envoyé par Maellis — Votre copilote intelligent freelance.'}
                </p>
                <p class="email-subtext" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #9ca3af; margin: 8px 0 0;">
                  <a href="${siteUrl}/settings" style="color: #10b981; text-decoration: none;">Gérer vos préférences de notification</a> · <a href="${siteUrl}" style="color: #9ca3af; text-decoration: none;">maellis.com</a>
                </p>
              </td>
            </tr>
          </table>

        </div>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Specific Templates ───────────────────────────────────────────────────────────

/**
 * Welcome email — sent when a new user signs up.
 */
export function welcomeEmail(params: {
  name: string
  email: string
}): { subject: string; html: string; text: string } {
  const siteUrl = process.env.NEXTAUTH_URL || 'https://maellis.com'

  const subject = '🚀 Bienvenue sur Maellis — Votre copilote freelance est prêt !'
  const html = baseTemplate({
    recipientName: params.name || 'Freelance',
    previewText: 'Bienvenue sur Maellis ! Commencez à gérer vos projets, factures et tâches.',
    content: `
      <h2 class="email-heading" style="color: #18181b; font-size: 22px; margin: 0 0 16px;">Bienvenue sur Maellis ! 🎉</h2>
      <p>Votre copilote intelligent est maintenant prêt à vous accompagner au quotidien.</p>
      <p>Voici ce que vous pouvez faire dès maintenant :</p>
      <ul style="padding-left: 20px; margin: 12px 0;">
        <li style="margin-bottom: 8px;">📋 <strong>Gérer vos tâches</strong> — Organisez et priorisez votre travail</li>
        <li style="margin-bottom: 8px;">📅 <strong>Calendrier synchronisé</strong> — Google & Outlook, jamais plus de conflits</li>
        <li style="margin-bottom: 8px;">💰 <strong>Facturation automatisée</strong> — Créez, envoyez et relancez en 1 clic</li>
        <li style="margin-bottom: 8px;">⏱️ <strong>Suivi du temps</strong> — Timer intégré, rapports détaillés</li>
        <li style="margin-bottom: 8px;">🤖 <strong>Assistant IA</strong> — Votre assistant qui comprend le contexte</li>
        <li style="margin-bottom: 8px;">🧘 <strong>Mode Focus</strong> — Deep work avec sons ambiants</li>
      </ul>
      <p>Connectez votre premier compte email pour débloquer toute la puissance de Maellis.</p>
    `,
    ctaUrl: `${siteUrl}/?action=setup`,
    ctaLabel: 'Configurer mon espace →',
    footerNote: 'Vous recevez cet email car vous avez créé un compte Maellis.',
  })

  const text = `Bienvenue sur Maellis !

Votre copilote intelligent est maintenant prêt à vous accompagner au quotidien.

Commencez par configurer votre espace : ${siteUrl}/?action=setup

Fonctionnalités principales :
- Gestion des tâches et projets
- Calendrier synchronisé (Google & Outlook)
- Facturation automatisée
- Suivi du temps avec rapports
- Assistant IA intégré
- Mode Focus pour le deep work

Cordialement,
L'équipe Maellis`

  return { subject, html, text }
}

/**
 * Invoice email — sent when an invoice is sent to a client.
 */
export function invoiceEmail(params: {
  clientName: string
  freelancerName: string
  invoiceNumber: string
  amount: string
  currency: string
  dueDate?: string
  invoiceType: 'invoice' | 'quote'
  paymentUrl?: string
}): { subject: string; html: string; text: string } {
  const { clientName, freelancerName, invoiceNumber, amount, dueDate, invoiceType, paymentUrl } = params
  const isQuote = invoiceType === 'quote'
  const docLabel = isQuote ? 'devis' : 'facture'
  const docLabelCap = isQuote ? 'Devis' : 'Facture'

  const subject = `${docLabelCap} ${invoiceNumber} — ${freelancerName}`

  const html = baseTemplate({
    recipientName: clientName,
    previewText: `${docLabelCap} ${invoiceNumber} d'un montant de ${amount} de ${freelancerName}`,
    content: `
      <p>Veuillez trouver ci-joint ${isQuote ? 'le devis' : 'la facture'} <strong>${invoiceNumber}</strong> d'un montant de <strong>${amount}</strong>.</p>
      ${dueDate ? `<p>📅 Échéance : <strong>${dueDate}</strong></p>` : ''}
      ${paymentUrl ? `<p>Vous pouvez régler en ligne directement via le bouton ci-dessous.</p>` : ''}
      <p>N'hésitez pas à me contacter pour toute question.</p>
      <p>Cordialement,<br><strong>${freelancerName}</strong></p>
    `,
    ctaUrl: paymentUrl,
    ctaLabel: paymentUrl ? (isQuote ? 'Voir le devis' : 'Payer en ligne') : undefined,
    footerNote: `Cet email a été envoyé via Maellis par ${freelancerName}.`,
  })

  const text = `${docLabelCap} ${invoiceNumber}

Bonjour ${clientName},

Veuillez trouver ci-joint ${isQuote ? 'le devis' : 'la facture'} ${invoiceNumber} d'un montant de ${amount}.
${dueDate ? `Échéance : ${dueDate}` : ''}

N'hésitez pas à me contacter pour toute question.

Cordialement,
${freelancerName}`

  return { subject, html, text }
}

/**
 * Reminder email — for overdue tasks, unpaid invoices, meetings, etc.
 */
export function reminderEmail(params: {
  userName: string
  reminderTitle: string
  reminderMessage: string
  reminderType: 'task' | 'invoice' | 'meeting' | 'custom'
  dueInfo?: string
  actionUrl?: string
}): { subject: string; html: string; text: string } {
  const { userName, reminderTitle, reminderMessage, reminderType, dueInfo, actionUrl } = params

  const icons: Record<string, string> = {
    task: '📋',
    invoice: '💰',
    meeting: '📅',
    custom: '🔔',
  }

  const subject = `${icons[reminderType] || '🔔'} Rappel — ${reminderTitle}`
  const siteUrl = process.env.NEXTAUTH_URL || 'https://maellis.com'

  const html = baseTemplate({
    recipientName: userName,
    previewText: `Rappel : ${reminderTitle}`,
    content: `
      <h2 class="email-heading" style="color: #18181b; font-size: 18px; margin: 0 0 16px;">${icons[reminderType] || '🔔'} ${reminderTitle}</h2>
      <p>${reminderMessage}</p>
      ${dueInfo ? `
      <div style="margin: 16px 0; padding: 12px 16px; background: #fef3c7; border-radius: 8px; border-left: 3px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>⏰ ${dueInfo}</strong></p>
      </div>` : ''}
    `,
    ctaUrl: actionUrl || `${siteUrl}`,
    ctaLabel: 'Voir dans Maellis →',
    footerNote: 'Vous recevez ce rappel car vous avez activé les notifications par email sur Maellis.',
  })

  const text = `Rappel : ${reminderTitle}

${reminderMessage}
${dueInfo ? dueInfo : ''}

Voir dans Maellis : ${actionUrl || siteUrl}`

  return { subject, html, text }
}

/**
 * Notification email — generic notification sent via email channel.
 */
export function notificationEmail(params: {
  userName: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  actionUrl?: string
  actionLabel?: string
}): { subject: string; html: string; text: string } {
  const { userName, title, message, type, actionUrl, actionLabel } = params

  const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', icon: 'ℹ️' },
    success: { bg: '#f0fdf4', border: '#10b981', text: '#065f46', icon: '✅' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', icon: '⚠️' },
    error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', icon: '❌' },
  }

  const style = colors[type] || colors.info
  const siteUrl = process.env.NEXTAUTH_URL || 'https://maellis.com'

  const subject = `${style.icon} ${title}`

  const html = baseTemplate({
    recipientName: userName,
    previewText: title,
    content: `
      <div style="margin: 0 0 16px; padding: 12px 16px; background: ${style.bg}; border-radius: 8px; border-left: 3px solid ${style.border};">
        <p style="margin: 0; color: ${style.text}; font-size: 14px;"><strong>${style.icon} ${title}</strong></p>
      </div>
      <p>${message}</p>
    `,
    ctaUrl: actionUrl,
    ctaLabel: actionLabel || 'Voir dans Maellis →',
    footerNote: 'Vous recevez cette notification car vous avez activé les emails sur Maellis.',
  })

  const text = `${style.icon} ${title}

${message}

${actionUrl ? `Voir : ${actionUrl}` : ''}
${!actionUrl ? `Maellis : ${siteUrl}` : ''}`

  return { subject, html, text }
}

/**
 * Password reset email.
 */
export function passwordResetEmail(params: {
  userName: string
  resetUrl: string
  expiryMinutes: number
}): { subject: string; html: string; text: string } {
  const { userName, resetUrl, expiryMinutes } = params

  const subject = '🔐 Réinitialisation de votre mot de passe Maellis'

  const html = baseTemplate({
    recipientName: userName,
    previewText: 'Réinitialisez votre mot de passe Maellis',
    content: `
      <h2 class="email-heading" style="color: #18181b; font-size: 18px; margin: 0 0 16px;">🔐 Réinitialisation du mot de passe</h2>
      <p>Une demande de réinitialisation de votre mot de passe a été effectuée. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.</p>
      <div style="margin: 16px 0; padding: 12px 16px; background: #fef3c7; border-radius: 8px; border-left: 3px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>⏰ Ce lien expire dans ${expiryMinutes} minutes.</strong></p>
      </div>
      <p style="color: #9ca3af; font-size: 13px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre mot de passe reste inchangé.</p>
    `,
    ctaUrl: resetUrl,
    ctaLabel: 'Réinitialiser le mot de passe →',
    footerNote: 'Cet email de sécurité a été envoyé par Maellis.',
  })

  const text = `Réinitialisation de votre mot de passe Maellis

Cliquez sur le lien suivant pour réinitialiser votre mot de passe :
${resetUrl}

Ce lien expire dans ${expiryMinutes} minutes.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.`

  return { subject, html, text }
}

/**
 * Team invitation email.
 */
export function teamInviteEmail(params: {
  inviteeName: string
  teamName: string
  inviterName: string
  acceptUrl: string
  role: string
}): { subject: string; html: string; text: string } {
  const { inviteeName, teamName, inviterName, acceptUrl, role } = params

  const roleLabels: Record<string, string> = {
    owner: 'Propriétaire',
    admin: 'Administrateur',
    member: 'Membre',
    viewer: 'Observateur',
  }

  const subject = `🤝 ${inviterName} vous invite à rejoindre "${teamName}" sur Maellis`

  const html = baseTemplate({
    recipientName: inviteeName,
    previewText: `${inviterName} vous invite à rejoindre l'équipe "${teamName}"`,
    content: `
      <h2 class="email-heading" style="color: #18181b; font-size: 18px; margin: 0 0 16px;">🤝 Invitation à rejoindre une équipe</h2>
      <p><strong>${inviterName}</strong> vous invite à rejoindre l'équipe <strong>"${teamName}"</strong> sur Maellis.</p>
      <div style="margin: 16px 0; padding: 12px 16px; background: #f0fdf4; border-radius: 8px; border-left: 3px solid #10b981;">
        <p style="margin: 0; color: #065f46; font-size: 14px;">
          <strong>Rôle :</strong> ${roleLabels[role] || role}<br>
          <strong>Équipe :</strong> ${teamName}
        </p>
      </div>
      <p>En rejoignant cette équipe, vous aurez accès aux projets, tâches et outils collaboratifs partagés.</p>
    `,
    ctaUrl: acceptUrl,
    ctaLabel: 'Rejoindre l\'équipe →',
    footerNote: 'Vous recevez cette invitation car quelqu\'un vous a ajouté à une équipe Maellis.',
  })

  const text = `Invitation à rejoindre "${teamName}"

${inviterName} vous invite à rejoindre l'équipe "${teamName}" sur Maellis.
Rôle : ${roleLabels[role] || role}

Accepter l'invitation : ${acceptUrl}`

  return { subject, html, text }
}

/**
 * Weekly summary email.
 */
export function weeklySummaryEmail(params: {
  userName: string
  weekRange: string
  stats: {
    tasksCompleted: number
    tasksCreated: number
    hoursTracked: number
    revenue: number
    currency: string
    invoicesSent: number
  }
  topProjects: Array<{ name: string; hours: number }>
  upcomingDeadlines: Array<{ title: string; date: string }>
}): { subject: string; html: string; text: string } {
  const { userName, weekRange, stats, topProjects, upcomingDeadlines } = params
  const siteUrl = process.env.NEXTAUTH_URL || 'https://maellis.com'

  const subject = `📊 Résumé de votre semaine — ${weekRange}`

  const html = baseTemplate({
    recipientName: userName,
    previewText: `Semaine du ${weekRange} : ${stats.tasksCompleted} tâches, ${stats.hoursTracked}h, ${stats.revenue}€`,
    content: `
      <h2 class="email-heading" style="color: #18181b; font-size: 18px; margin: 0 0 16px;">📊 Résumé de la semaine</h2>
      <p style="color: #6b7280; margin-bottom: 16px;">Semaine du <strong>${weekRange}</strong></p>

      <!-- Stats Grid -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
        <tr>
          <td width="50%" style="padding: 4px;">
            <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #10b981;">${stats.tasksCompleted}</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Tâches terminées</div>
            </div>
          </td>
          <td width="50%" style="padding: 4px;">
            <div style="background: #eff6ff; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #3b82f6;">${stats.hoursTracked}h</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Heures trackées</div>
            </div>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding: 4px;">
            <div style="background: #fef3c7; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #f59e0b;">${stats.invoicesSent}</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Factures envoyées</div>
            </div>
          </td>
          <td width="50%" style="padding: 4px;">
            <div style="background: #fce7f3; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #ec4899;">${stats.revenue.toLocaleString('fr-FR', { style: 'currency', currency: stats.currency })}</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Revenu</div>
            </div>
          </td>
        </tr>
      </table>

      ${topProjects.length > 0 ? `
      <h3 style="color: #374151; font-size: 15px; margin: 16px 0 8px;">🏷️ Top projets</h3>
      <ul style="padding-left: 20px; margin: 0;">
        ${topProjects.map(p => `<li style="margin-bottom: 4px; color: #6b7280;">${p.name} — ${p.hours}h</li>`).join('')}
      </ul>` : ''}

      ${upcomingDeadlines.length > 0 ? `
      <h3 style="color: #374151; font-size: 15px; margin: 16px 0 8px;">⏰ Échéances à venir</h3>
      <ul style="padding-left: 20px; margin: 0;">
        ${upcomingDeadlines.map(d => `<li style="margin-bottom: 4px; color: #6b7280;">${d.title} — ${d.date}</li>`).join('')}
      </ul>` : ''}
    `,
    ctaUrl: `${siteUrl}`,
    ctaLabel: 'Voir mon tableau de bord →',
    footerNote: 'Résumé hebdomadaire automatique de Maellis.',
  })

  const text = `Résumé de la semaine du ${weekRange}

Tâches terminées : ${stats.tasksCompleted}
Heures trackées : ${stats.hoursTracked}h
Factures envoyées : ${stats.invoicesSent}
Revenu : ${stats.revenue.toLocaleString('fr-FR', { style: 'currency', currency: stats.currency })}

${topProjects.map(p => `- ${p.name}: ${p.hours}h`).join('\n')}

Voir le tableau de bord : ${siteUrl}`

  return { subject, html, text }
}
