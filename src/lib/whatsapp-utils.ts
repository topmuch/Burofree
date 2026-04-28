/**
 * WhatsApp Utility Functions for Fiscaly Badge Sending
 *
 * Provides helpers to generate wa.me links and encode messages
 * for the "Envoyer Badge WhatsApp" feature.
 */

/**
 * Validates a phone number for WhatsApp usage.
 * Accepts formats: +33612345678, 33612345678, 0612345678
 * Returns the cleaned international format (no +, no spaces) or null if invalid.
 */
export function sanitizePhoneNumber(phone: string): string | null {
  // Remove all whitespace, dashes, dots, parentheses
  const cleaned = phone.replace(/[\s\-().]/g, '')

  // If starts with +, remove it
  const withoutPlus = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned

  // If starts with 0 (local French format), replace with 33
  const internationalized = withoutPlus.startsWith('0')
    ? '33' + withoutPlus.slice(1)
    : withoutPlus

  // Validate: must be 10-15 digits, all numeric
  if (!/^\d{10,15}$/.test(internationalized)) {
    return null
  }

  return internationalized
}

/**
 * Encodes a text message for use in a wa.me URL.
 * Handles line breaks, special characters, and emojis.
 */
export function encodeMessage(text: string): string {
  return encodeURIComponent(text)
    .replace(/%20/g, '+') // More readable URLs
}

/**
 * Generates a wa.me link that opens WhatsApp with a pre-filled message.
 *
 * @param phone - Phone number in international format (e.g., "33612345678")
 * @param message - The pre-filled text message
 * @returns Full wa.me URL string
 *
 * @example
 * generateWhatsAppLink('33612345678', 'Bonjour! Voici votre badge Fiscaly.')
 * // => "https://wa.me/33612345678?text=Bonjour%21+Voici+votre+badge+Fiscaly."
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  const sanitizedPhone = sanitizePhoneNumber(phone)

  if (!sanitizedPhone) {
    throw new Error(`Invalid phone number: ${phone}`)
  }

  const encodedText = encodeMessage(message)
  return `https://wa.me/${sanitizedPhone}?text=${encodedText}`
}

/**
 * Default WhatsApp message template for badge sending.
 * Variables: {merchantName}, {year}, {badgeUrl}
 */
export const DEFAULT_BADGE_MESSAGE_TEMPLATE = `🎉 Bonjour {merchantName} !

Voici votre Badge Fiscaly {year} ! 🏆

📌 Votre badge certifié est prêt :
👉 {badgeUrl}

🎧 Écoutez le guide audio explicatif ci-joint pour savoir comment l'utiliser et le partager avec vos clients.

N'hésitez pas à nous contacter si vous avez des questions !

— L'équipe Fiscaly`

/**
 * Generates the pre-filled WhatsApp message for badge sending.
 */
export function generateBadgeMessage(
  merchantName: string,
  badgeUrl: string,
  year: number = new Date().getFullYear(),
  customMessage?: string
): string {
  const template = customMessage || DEFAULT_BADGE_MESSAGE_TEMPLATE

  return template
    .replace(/\{merchantName\}/g, merchantName)
    .replace(/\{year\}/g, String(year))
    .replace(/\{badgeUrl\}/g, badgeUrl)
}

/**
 * Opens the WhatsApp link in a new window/tab.
 * On mobile, this will open the WhatsApp app directly.
 */
export function openWhatsAppLink(link: string): void {
  window.open(link, '_blank', 'noopener,noreferrer')
}

/**
 * Triggers a file download from a URL.
 */
export function downloadFile(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
