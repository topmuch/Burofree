import type { Reminder } from './store'

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('Les notifications ne sont pas supportées par ce navigateur')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

export function showBrowserNotification(title: string, body: string, actionUrl?: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return
  }

  const notification = new Notification(title, {
    body,
    icon: '/logo.svg',
    badge: '/logo.svg',
    tag: `maellis-${Date.now()}`,
  })

  notification.onclick = () => {
    window.focus()
    if (actionUrl) {
      window.location.hash = actionUrl
    }
    notification.close()
  }

  setTimeout(() => notification.close(), 8000)
}

export function checkDueReminders(reminders: Reminder[]): Reminder[] {
  const now = new Date()
  return reminders.filter(
    (reminder) => !reminder.isSent && new Date(reminder.remindAt) <= now
  )
}

export function getTimeUntilReminder(remindAt: string): string {
  const now = new Date()
  const target = new Date(remindAt)
  const diffMs = target.getTime() - now.getTime()

  if (diffMs < 0) {
    const absDiff = Math.abs(diffMs)
    if (absDiff < 60000) return 'Maintenant'
    if (absDiff < 3600000) return `Il y a ${Math.floor(absDiff / 60000)} min`
    if (absDiff < 86400000) return `Il y a ${Math.floor(absDiff / 3600000)}h`
    return `Il y a ${Math.floor(absDiff / 86400000)}j`
  }

  if (diffMs < 60000) return 'Dans un instant'
  if (diffMs < 3600000) return `Dans ${Math.floor(diffMs / 60000)} min`
  if (diffMs < 86400000) return `Dans ${Math.floor(diffMs / 3600000)}h`
  return `Dans ${Math.floor(diffMs / 86400000)}j`
}

export function formatReminderDate(remindAt: string): string {
  const date = new Date(remindAt)
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Reminder check interval
let reminderInterval: ReturnType<typeof setInterval> | null = null

export function startReminderCheck(
  getReminders: () => Reminder[],
  onReminderDue: (reminder: Reminder) => void,
  focusMode = false
) {
  stopReminderCheck()
  
  reminderInterval = setInterval(() => {
    const dueReminders = checkDueReminders(getReminders())
    dueReminders.forEach((reminder) => {
      if (focusMode && reminder.type !== 'urgent') return
      onReminderDue(reminder)
      showBrowserNotification(
        '⏰ Rappel - Maellis',
        reminder.message || reminder.title,
        reminder.relatedType === 'task' ? '#tasks' : reminder.relatedType === 'invoice' ? '#invoices' : undefined
      )
    })
  }, 30000)
}

export function stopReminderCheck() {
  if (reminderInterval) {
    clearInterval(reminderInterval)
    reminderInterval = null
  }
}

export function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.value = 0.1
    oscillator.start()
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch {
    // Audio not available
  }
}
