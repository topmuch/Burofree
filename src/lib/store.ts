import { create } from 'zustand'

export type TabType = 'dashboard' | 'calendar' | 'tasks' | 'emails' | 'reminders'

export interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  reminderAt: string | null
  completedAt: string | null
  category: string | null
  userId: string
  createdAt: string
  updatedAt: string
}

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  color: string
  allDay: boolean
  location: string | null
  userId: string
  createdAt: string
  updatedAt: string
}

export interface Reminder {
  id: string
  title: string
  message: string | null
  remindAt: string
  isSent: boolean
  type: string
  relatedId: string | null
  userId: string
  createdAt: string
  updatedAt: string
}

export interface Email {
  id: string
  fromAddress: string
  fromName: string | null
  toAddress: string
  subject: string
  body: string | null
  snippet: string | null
  isRead: boolean
  isStarred: boolean
  isSent: boolean
  receivedAt: string
  emailAccountId: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface EmailAccount {
  id: string
  provider: string
  email: string
  accessToken: string | null
  refreshToken: string | null
  imapHost: string | null
  imapPort: number | null
  smtpHost: string | null
  smtpPort: number | null
  isPrimary: boolean
  userId: string
  createdAt: string
  updatedAt: string
}

export interface Stats {
  tasksDueToday: number
  tasksThisWeek: number
  upcomingEvents: number
  unreadEmails: number
  totalTasks: number
  completedTasks: number
  pendingReminders: number
  dailyCompleted: { date: string; count: number }[]
  taskBreakdown: { todo: number; inProgress: number; done: number }
}

interface AppState {
  activeTab: TabType
  sidebarOpen: boolean
  selectedDate: string
  tasks: Task[]
  events: CalendarEvent[]
  reminders: Reminder[]
  emails: Email[]
  emailAccounts: EmailAccount[]
  stats: Stats | null
  selectedEmail: Email | null
  emailFilter: string
  isLoading: boolean

  setActiveTab: (tab: TabType) => void
  toggleSidebar: () => void
  setSelectedDate: (date: string) => void
  setSelectedEmail: (email: Email | null) => void
  setEmailFilter: (filter: string) => void

  fetchTasks: () => Promise<void>
  fetchEvents: () => Promise<void>
  fetchReminders: () => Promise<void>
  fetchEmails: () => Promise<void>
  fetchEmailAccounts: () => Promise<void>
  fetchStats: () => Promise<void>

  createTask: (task: Partial<Task>) => Promise<void>
  updateTask: (id: string, data: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>

  createEvent: (event: Partial<CalendarEvent>) => Promise<void>
  updateEvent: (id: string, data: Partial<CalendarEvent>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>

  createReminder: (reminder: Partial<Reminder>) => Promise<void>
  updateReminder: (id: string, data: Partial<Reminder>) => Promise<void>
  deleteReminder: (id: string) => Promise<void>

  sendEmail: (data: { to: string; subject: string; body: string }) => Promise<void>
  updateEmail: (id: string, data: { isRead?: boolean; isStarred?: boolean }) => Promise<void>
  deleteEmail: (id: string) => Promise<void>

  addEmailAccount: (account: Partial<EmailAccount>) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: 'dashboard',
  sidebarOpen: true,
  selectedDate: new Date().toISOString().split('T')[0],
  tasks: [],
  events: [],
  reminders: [],
  emails: [],
  emailAccounts: [],
  stats: null,
  selectedEmail: null,
  emailFilter: 'all',
  isLoading: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedEmail: (email) => set({ selectedEmail: email }),
  setEmailFilter: (filter) => set({ emailFilter: filter }),

  fetchTasks: async () => {
    try {
      const res = await fetch('/api/tasks')
      const data = await res.json()
      set({ tasks: data })
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  },

  fetchEvents: async () => {
    try {
      const res = await fetch('/api/events')
      const data = await res.json()
      set({ events: data })
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  },

  fetchReminders: async () => {
    try {
      const res = await fetch('/api/reminders')
      const data = await res.json()
      set({ reminders: data })
    } catch (error) {
      console.error('Error fetching reminders:', error)
    }
  },

  fetchEmails: async () => {
    try {
      const { emailFilter } = get()
      const filterParam = emailFilter !== 'all' ? `?filter=${emailFilter}` : ''
      const res = await fetch(`/api/emails${filterParam}`)
      const data = await res.json()
      set({ emails: data.emails || [] })
    } catch (error) {
      console.error('Error fetching emails:', error)
    }
  },

  fetchEmailAccounts: async () => {
    try {
      const res = await fetch('/api/email-accounts')
      const data = await res.json()
      set({ emailAccounts: data })
    } catch (error) {
      console.error('Error fetching email accounts:', error)
    }
  },

  fetchStats: async () => {
    try {
      const res = await fetch('/api/stats')
      const data = await res.json()
      set({ stats: data })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  },

  createTask: async (task) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      })
      if (res.ok) {
        await get().fetchTasks()
        await get().fetchStats()
      }
    } catch (error) {
      console.error('Error creating task:', error)
    }
  },

  updateTask: async (id, data) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        await get().fetchTasks()
        await get().fetchStats()
      }
    } catch (error) {
      console.error('Error updating task:', error)
    }
  },

  deleteTask: async (id) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await get().fetchTasks()
        await get().fetchStats()
      }
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  },

  createEvent: async (event) => {
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      })
      if (res.ok) {
        await get().fetchEvents()
        await get().fetchStats()
      }
    } catch (error) {
      console.error('Error creating event:', error)
    }
  },

  updateEvent: async (id, data) => {
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        await get().fetchEvents()
      }
    } catch (error) {
      console.error('Error updating event:', error)
    }
  },

  deleteEvent: async (id) => {
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await get().fetchEvents()
        await get().fetchStats()
      }
    } catch (error) {
      console.error('Error deleting event:', error)
    }
  },

  createReminder: async (reminder) => {
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminder),
      })
      if (res.ok) {
        await get().fetchReminders()
        await get().fetchStats()
      }
    } catch (error) {
      console.error('Error creating reminder:', error)
    }
  },

  updateReminder: async (id, data) => {
    try {
      const res = await fetch(`/api/reminders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        await get().fetchReminders()
      }
    } catch (error) {
      console.error('Error updating reminder:', error)
    }
  },

  deleteReminder: async (id) => {
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await get().fetchReminders()
        await get().fetchStats()
      }
    } catch (error) {
      console.error('Error deleting reminder:', error)
    }
  },

  sendEmail: async (data) => {
    try {
      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        await get().fetchEmails()
      }
    } catch (error) {
      console.error('Error sending email:', error)
    }
  },

  updateEmail: async (id, data) => {
    try {
      const res = await fetch(`/api/emails/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const updatedEmail = await res.json()
        set((state) => ({
          emails: state.emails.map((e) => (e.id === id ? updatedEmail : e)),
          selectedEmail: state.selectedEmail?.id === id ? updatedEmail : state.selectedEmail,
        }))
        await get().fetchStats()
      }
    } catch (error) {
      console.error('Error updating email:', error)
    }
  },

  deleteEmail: async (id) => {
    try {
      const res = await fetch(`/api/emails/${id}`, { method: 'DELETE' })
      if (res.ok) {
        set((state) => ({
          emails: state.emails.filter((e) => e.id !== id),
          selectedEmail: state.selectedEmail?.id === id ? null : state.selectedEmail,
        }))
        await get().fetchStats()
      }
    } catch (error) {
      console.error('Error deleting email:', error)
    }
  },

  addEmailAccount: async (account) => {
    try {
      const res = await fetch('/api/email-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      })
      if (res.ok) {
        await get().fetchEmailAccounts()
      }
    } catch (error) {
      console.error('Error adding email account:', error)
    }
  },
}))
