import { create } from 'zustand'

export type TabType = 'dashboard' | 'tasks' | 'calendar' | 'emails' | 'documents' | 'invoices' | 'time' | 'meetings' | 'contracts' | 'notifications' | 'settings' | 'templates' | 'analytics'

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
  estimatedTime: number | null
  actualTime: number | null
  recurrence: string | null
  projectId: string | null
  project: Project | null
  userId: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  clientName: string | null
  color: string
  status: string
  budget: number | null
  deadline: string | null
  userId: string
  _count?: { tasks: number; invoices: number; documents: number; timeEntries: number }
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
  type: string
  source: string
  sourceId: string | null
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
  relatedType: string | null
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
  category: string
  hasTask: boolean
  scheduledAt: string | null
  source: string
  sourceId: string | null
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
  tokenExpiry: string | null
  scopes: string | null
  imapHost: string | null
  imapPort: number | null
  smtpHost: string | null
  smtpPort: number | null
  isPrimary: boolean
  gmailHistoryId: string | null
  userId: string
  createdAt: string
  updatedAt: string
}

export interface Invoice {
  id: string
  number: string
  type: string
  clientName: string
  clientEmail: string | null
  clientAddress: string | null
  items: string
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  currency: string
  status: string
  dueDate: string | null
  paidAt: string | null
  notes: string | null
  stripePaymentIntentId: string | null
  stripeCheckoutUrl: string | null
  paymentMethod: string
  projectId: string | null
  project: Project | null
  userId: string
  createdAt: string
  updatedAt: string
}

export interface TimeEntry {
  id: string
  startTime: string
  endTime: string | null
  duration: number | null
  description: string | null
  isBillable: boolean
  taskId: string | null
  task: Task | null
  projectId: string | null
  project: Project | null
  userId: string
  createdAt: string
  updatedAt: string
}

export interface Contract {
  id: string
  title: string
  description: string | null
  type: string // service, nda, partnership, freelance
  status: string // draft, sent, signed, active, expired, terminated
  clientName: string
  clientEmail: string | null
  clientAddress: string | null
  startDate: string | null
  endDate: string | null
  value: number | null
  currency: string
  terms: string | null
  notes: string | null
  fileUrl: string | null
  projectId: string | null
  project: Project | null
  userId: string
  createdAt: string
  updatedAt: string
}

export interface Document {
  id: string
  name: string
  type: string
  content: string | null
  fileUrl: string | null
  mimeType: string | null
  size: number | null
  projectId: string | null
  project: Project | null
  userId: string
  createdAt: string
  updatedAt: string
}

export interface Snippet {
  id: string
  title: string
  content: string
  category: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  channel: string
  isRead: boolean
  actionUrl: string | null
  userId: string
  createdAt: string
  updatedAt: string
}

export interface WeeklyGoal {
  id: string
  title: string
  target: number | null
  current: number
  unit: string
  weekStart: string
  weekEnd: string
  completed: boolean
  userId: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  role: string
  content: string
  userId: string
  createdAt: string
}

export interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  profession: string | null
  timezone: string
  assistantName: string
  assistantTone: string
  theme: string
  focusMode: boolean
  onboardingDone: boolean
  hourlyRate: number | null
  weeklyTargetHours: number | null
  weeklyTargetRevenue: number | null
  maxDailyHours: number | null
  createdAt: string
  updatedAt: string
}

export interface Stats {
  tasksToday: number
  tasksWeek: number
  tasksOverdue: number
  tasksByStatus: { status: string; count: number }[]
  eventsToday: number
  unreadEmails: number
  totalTasks: number
  completedTasksThisWeek: number
  paidInvoices: number
  pendingInvoices: number
  overdueInvoices: number
  monthlyRevenue: number
  yearlyRevenue: number
  weeklyHours: number
  billableHours: number
  activeProjects: number
  weekDays: { date: string; day: string; totalHours: number; byProject: Record<string, number> }[]
  monthlyData: { month: string; revenue: number }[]
}

export interface AISuggestion {
  icon: string
  title: string
  message: string
  priority: string
  actionUrl: string
}

export interface TimeGoals {
  targetHours: number
  targetRevenue: number
  trackedHours: number
  billableHours: number
  revenue: number
  percentageProgress: number
  hourlyRate: number
  weekStart: string
  weekEnd: string
  dailyBreakdown: { day: string; date: string; totalHours: number; billableHours: number }[]
  projectBreakdown: { projectId: string | null; projectName: string; projectColor: string; totalHours: number; billableHours: number; revenue: number }[]
}

export interface TimeReport {
  period: string
  startDate: string
  endDate: string
  totalHours: number
  billableHours: number
  nonBillableHours: number
  revenue: number
  avgHourlyRate: number
  totalEntries: number
  projectBreakdown: { projectId: string | null; projectName: string; projectColor: string; totalHours: number; billableHours: number; revenue: number; percentage: number }[]
  aggregation: { label: string; totalHours: number; billableHours: number; revenue: number }[]
}

export interface BreakSuggestion {
  shouldBreak: boolean
  reason: string
  breakType: 'short' | 'long' | 'stop'
  workedMinutes: number
  activeMinutes: number
  todayHours: number
  weeklyHours: number
  billableRatio: number
  maxDailyHours: number
  isTracking: boolean
}

export interface Meeting {
  id: string
  title: string
  description?: string | null
  startDate: string
  endDate?: string | null
  location?: string | null
  meetingUrl?: string | null
  type: string // video, phone, in_person
  status: string // scheduled, completed, cancelled
  agenda?: string | null
  notes?: string | null
  projectId?: string | null
  project?: { id: string; name: string; color: string } | null
  userId: string
  createdAt: string
  updatedAt: string
}

export interface Template {
  id: string
  name: string
  description: string | null
  type: string // contract, quote, email, project_structure, client_response
  content: string
  variables: string // JSON array
  category: string
  icon: string | null
  isDefault: boolean
  usageCount: number
  userId: string
  createdAt: string
  updatedAt: string
}

export interface AutomationPreference {
  id: string
  type: string // overdue_tasks, unpaid_invoices, meeting_reminder, email_followup
  enabled: boolean
  channel: string // in_app, email, both
  frequency: string
  threshold: number
  userId: string
  createdAt: string
  updatedAt: string
}

export interface AutomationLog {
  id: string
  type: string
  action: string
  details: string | null
  relatedId: string | null
  success: boolean
  userId: string
  createdAt: string
}

export interface Tag {
  id: string
  name: string
  color: string
  icon: string | null
  category: string
  userId: string
  _count?: {
    taskTags: number
    emailTags: number
    documentTags: number
    projectTags: number
  }
  createdAt: string
  updatedAt: string
}

export interface AnalyticsOverview {
  hoursWorked: number
  hoursBillable: number
  revenue: number
  revenueForecast: number
  conversionRate: number
  timeByProject: Array<{
    projectId: string | null
    projectName: string
    projectColor: string
    totalHours: number
    billableHours: number
    revenue: number
  }>
  completionRate: number
  workload: {
    today: number
    thisWeek: number
    tasksByDay: Array<{ day: string; count: number }>
  }
  monthlyRevenue: Array<{
    month: string
    revenue: number
    forecast: number
  }>
  topClients: Array<{
    clientName: string
    revenue: number
    projectCount: number
  }>
}

export interface SearchResult {
  id: string
  type: string // task, email, document, contact
  title: string
  snippet: string
  score: number
  createdAt: string
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

interface AppState {
  // UI state
  activeTab: TabType
  sidebarOpen: boolean
  focusMode: boolean
  selectedDate: string
  isLoading: boolean
  chatOpen: boolean
  authModalOpen: boolean

  // Data
  user: User | null
  tasks: Task[]
  projects: Project[]
  events: CalendarEvent[]
  reminders: Reminder[]
  emails: Email[]
  emailAccounts: EmailAccount[]
  selectedEmail: Email | null
  emailFilter: string
  invoices: Invoice[]
  meetings: Meeting[]
  contracts: Contract[]
  timeEntries: TimeEntry[]
  documents: Document[]
  snippets: Snippet[]
  notifications: Notification[]
  goals: WeeklyGoal[]
  chatMessages: ChatMessage[]
  stats: Stats | null
  briefing: string | null
  suggestions: AISuggestion[]

  // Timer state
  activeTimer: { startTime: string; taskId: string | null; projectId: string | null; description: string; isBillable: boolean } | null

  // Time tracking enhanced state
  timeGoals: TimeGoals | null
  timeReports: TimeReport | null
  breakSuggestion: BreakSuggestion | null

  // Templates, Automations, Tags, Analytics, Search
  templates: Template[]
  automationPrefs: AutomationPreference[]
  automationLogs: AutomationLog[]
  tags: Tag[]
  analytics: AnalyticsOverview | null
  searchResults: SearchResponse | null
  searchQuery: string

  // Actions - UI
  setActiveTab: (tab: TabType) => void
  toggleSidebar: () => void
  setFocusMode: (mode: boolean) => void
  setSelectedDate: (date: string) => void
  setSelectedEmail: (email: Email | null) => void
  setEmailFilter: (filter: string) => void
  setChatOpen: (open: boolean) => void
  setAuthModalOpen: (open: boolean) => void
  setUser: (user: Partial<User> | null) => void

  // Fetch - User
  fetchUser: () => Promise<void>

  // Fetch actions
  fetchTasks: () => Promise<void>
  fetchProjects: () => Promise<void>
  fetchEvents: () => Promise<void>
  fetchReminders: () => Promise<void>
  fetchEmails: () => Promise<void>
  fetchEmailAccounts: () => Promise<void>
  fetchInvoices: () => Promise<void>
  fetchTimeEntries: () => Promise<void>
  fetchDocuments: () => Promise<void>
  fetchSnippets: () => Promise<void>
  fetchNotifications: () => Promise<void>
  fetchGoals: () => Promise<void>
  fetchChatMessages: () => Promise<void>
  fetchStats: () => Promise<void>
  fetchBriefing: () => Promise<void>
  fetchSuggestions: () => Promise<void>
  // Time tracking enhanced
  fetchTimeGoals: () => Promise<void>
  fetchTimeReports: (params?: { period?: string; projectId?: string; startDate?: string; endDate?: string }) => Promise<void>
  fetchBreakSuggestion: () => Promise<void>
  setBillingGoal: (data: { targetHours?: number; targetRevenue?: number; hourlyRate?: number }) => Promise<void>

  fetchAll: () => Promise<void>

  // CRUD - Tasks
  createTask: (task: Partial<Task>) => Promise<void>
  updateTask: (id: string, data: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>

  // CRUD - Projects
  createProject: (project: Partial<Project>) => Promise<void>
  updateProject: (id: string, data: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  // CRUD - Events
  createEvent: (event: Partial<CalendarEvent>) => Promise<void>
  updateEvent: (id: string, data: Partial<CalendarEvent>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>

  // CRUD - Reminders
  createReminder: (reminder: Partial<Reminder>) => Promise<void>
  updateReminder: (id: string, data: Partial<Reminder>) => Promise<void>
  deleteReminder: (id: string) => Promise<void>

  // CRUD - Emails
  sendEmail: (data: { to: string; subject: string; body: string; scheduledAt?: string }) => Promise<void>
  updateEmail: (id: string, data: Record<string, unknown>) => Promise<void>
  deleteEmail: (id: string) => Promise<void>
  convertEmailToTask: (id: string) => Promise<void>

  // CRUD - Invoices
  createInvoice: (invoice: Partial<Invoice>) => Promise<void>
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<void>
  deleteInvoice: (id: string) => Promise<void>

  // CRUD - Meetings
  fetchMeetings: () => Promise<void>
  createMeeting: (data: Partial<Meeting>) => Promise<void>
  updateMeeting: (id: string, data: Partial<Meeting>) => Promise<void>
  deleteMeeting: (id: string) => Promise<void>

  // CRUD - Contracts
  fetchContracts: () => Promise<void>
  createContract: (contract: Partial<Contract>) => Promise<void>
  updateContract: (id: string, data: Partial<Contract>) => Promise<void>
  deleteContract: (id: string) => Promise<void>

  // CRUD - Time Entries
  createTimeEntry: (entry: Partial<TimeEntry>) => Promise<void>
  updateTimeEntry: (id: string, data: Partial<TimeEntry>) => Promise<void>
  deleteTimeEntry: (id: string) => Promise<void>
  startTimer: (data: { taskId?: string; projectId?: string; description: string; isBillable: boolean }) => void
  stopTimer: () => Promise<void>

  // CRUD - Documents
  createDocument: (doc: Partial<Document>) => Promise<void>
  updateDocument: (id: string, data: Partial<Document>) => Promise<void>
  deleteDocument: (id: string) => Promise<void>

  // CRUD - Snippets
  createSnippet: (snippet: Partial<Snippet>) => Promise<void>
  updateSnippet: (id: string, data: Partial<Snippet>) => Promise<void>
  deleteSnippet: (id: string) => Promise<void>

  // CRUD - Notifications
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>

  // CRUD - Goals
  createGoal: (goal: Partial<WeeklyGoal>) => Promise<void>
  updateGoal: (id: string, data: Partial<WeeklyGoal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>

  // AI Chat
  sendChatMessage: (message: string) => Promise<void>

  // Templates
  fetchTemplates: () => Promise<void>
  createTemplate: (template: Partial<Template>) => Promise<void>
  updateTemplate: (id: string, data: Partial<Template>) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  applyTemplate: (id: string, variables: Record<string, string>) => Promise<{ content: string; missing: string[] }>
  seedTemplates: () => Promise<void>

  // Automations
  fetchAutomationPrefs: () => Promise<void>
  updateAutomationPref: (type: string, data: Partial<AutomationPreference>) => Promise<void>
  fetchAutomationLogs: (page?: number) => Promise<void>
  runAutomationChecks: () => Promise<void>

  // Tags
  fetchTags: () => Promise<void>
  createTag: (tag: Partial<Tag>) => Promise<void>
  updateTag: (id: string, data: Partial<Tag>) => Promise<void>
  deleteTag: (id: string) => Promise<void>
  assignTag: (tagId: string, entityType: string, entityIds: string[]) => Promise<void>
  unassignTag: (tagId: string, entityType: string, entityIds: string[]) => Promise<void>
  seedTags: () => Promise<void>

  // Analytics
  fetchAnalytics: (range?: string) => Promise<void>
  exportAnalytics: (format: 'csv' | 'pdf', range: 'week' | 'month' | 'year') => Promise<void>

  // Search
  search: (query: string, type?: string, filters?: string) => Promise<void>
  setSearchQuery: (query: string) => void
  clearSearch: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // UI state
  activeTab: 'dashboard',
  sidebarOpen: true,
  focusMode: false,
  selectedDate: new Date().toISOString().split('T')[0],
  isLoading: false,
  chatOpen: false,
  authModalOpen: false,

  // Data
  user: null,
  tasks: [],
  projects: [],
  events: [],
  reminders: [],
  emails: [],
  emailAccounts: [],
  selectedEmail: null,
  emailFilter: 'all',
  invoices: [],
  meetings: [],
  contracts: [],
  timeEntries: [],
  documents: [],
  snippets: [],
  notifications: [],
  goals: [],
  chatMessages: [],
  stats: null,
  briefing: null,
  suggestions: [],

  // Timer
  activeTimer: null,

  // Time tracking enhanced
  timeGoals: null,
  timeReports: null,
  breakSuggestion: null,

  // Templates, Automations, Tags, Analytics, Search
  templates: [],
  automationPrefs: [],
  automationLogs: [],
  tags: [],
  analytics: null,
  searchResults: null,
  searchQuery: '',

  // UI Actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setFocusMode: (mode) => set({ focusMode: mode }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedEmail: (email) => set({ selectedEmail: email }),
  setEmailFilter: (filter) => set({ emailFilter: filter }),
  setChatOpen: (open) => set({ chatOpen: open }),
  setAuthModalOpen: (open) => set({ authModalOpen: open }),
  setUser: (user) => set((s) => ({
    user: user ? { ...s.user, ...user } as User : null
  })),

  // Time tracking enhanced
  fetchTimeGoals: async () => {
    try {
      const res = await fetch('/api/time-entries/goals')
      if (res.ok) set({ timeGoals: await res.json() })
    } catch (e) { console.error('fetchTimeGoals:', e) }
  },
  fetchTimeReports: async (params) => {
    try {
      const query = new URLSearchParams()
      if (params?.period) query.set('period', params.period)
      if (params?.projectId) query.set('projectId', params.projectId)
      if (params?.startDate) query.set('startDate', params.startDate)
      if (params?.endDate) query.set('endDate', params.endDate)
      const res = await fetch(`/api/time-entries/reports?${query.toString()}`)
      if (res.ok) set({ timeReports: await res.json() })
    } catch (e) { console.error('fetchTimeReports:', e) }
  },
  fetchBreakSuggestion: async () => {
    try {
      const res = await fetch('/api/time-entries/breaks')
      if (res.ok) set({ breakSuggestion: await res.json() })
    } catch (e) { console.error('fetchBreakSuggestion:', e) }
  },
  setBillingGoal: async (data) => {
    try {
      const res = await fetch('/api/time-entries/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { await get().fetchTimeGoals(); await get().fetchStats() }
    } catch (e) { console.error('setBillingGoal:', e) }
  },

  fetchAnalytics: async (range?: string) => {
    try {
      const r = range || 'month'
      const res = await fetch(`/api/analytics/overview?range=${r}`)
      if (res.ok) set({ analytics: await res.json() })
    } catch (e) { console.error('fetchAnalytics:', e) }
  },

  // Fetch - User
  fetchUser: async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) set({ user: await res.json() })
    } catch (e) { console.error('fetchUser:', e) }
  },

  // Fetch actions
  fetchTasks: async () => {
    try {
      const res = await fetch('/api/tasks')
      if (res.ok) set({ tasks: await res.json() })
    } catch (e) { console.error('fetchTasks:', e) }
  },

  fetchProjects: async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) set({ projects: await res.json() })
    } catch (e) { console.error('fetchProjects:', e) }
  },

  fetchEvents: async () => {
    try {
      const res = await fetch('/api/events')
      if (res.ok) set({ events: await res.json() })
    } catch (e) { console.error('fetchEvents:', e) }
  },

  fetchReminders: async () => {
    try {
      const res = await fetch('/api/reminders')
      if (res.ok) set({ reminders: await res.json() })
    } catch (e) { console.error('fetchReminders:', e) }
  },

  fetchEmails: async () => {
    try {
      const { emailFilter } = get()
      const param = emailFilter !== 'all' ? `?category=${emailFilter}` : ''
      const res = await fetch(`/api/emails${param}`)
      if (res.ok) {
        const data = await res.json()
        set({ emails: data.emails || data })
      }
    } catch (e) { console.error('fetchEmails:', e) }
  },

  fetchEmailAccounts: async () => {
    try {
      const res = await fetch('/api/email-accounts')
      if (res.ok) set({ emailAccounts: await res.json() })
    } catch (e) { console.error('fetchEmailAccounts:', e) }
  },

  fetchInvoices: async () => {
    try {
      const res = await fetch('/api/invoices')
      if (res.ok) set({ invoices: await res.json() })
    } catch (e) { console.error('fetchInvoices:', e) }
  },

  fetchContracts: async () => {
    try {
      const res = await fetch('/api/contracts')
      if (res.ok) set({ contracts: await res.json() })
    } catch (e) { console.error('fetchContracts:', e) }
  },

  fetchTimeEntries: async () => {
    try {
      const res = await fetch('/api/time-entries')
      if (res.ok) set({ timeEntries: await res.json() })
    } catch (e) { console.error('fetchTimeEntries:', e) }
  },

  fetchDocuments: async () => {
    try {
      const res = await fetch('/api/documents')
      if (res.ok) set({ documents: await res.json() })
    } catch (e) { console.error('fetchDocuments:', e) }
  },

  fetchSnippets: async () => {
    try {
      const res = await fetch('/api/snippets')
      if (res.ok) set({ snippets: await res.json() })
    } catch (e) { console.error('fetchSnippets:', e) }
  },

  fetchNotifications: async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) set({ notifications: await res.json() })
    } catch (e) { console.error('fetchNotifications:', e) }
  },

  fetchGoals: async () => {
    try {
      const res = await fetch('/api/goals')
      if (res.ok) set({ goals: await res.json() })
    } catch (e) { console.error('fetchGoals:', e) }
  },

  fetchChatMessages: async () => {
    try {
      const res = await fetch('/api/ai/chat')
      // Chat messages are loaded within the chat component context
    } catch (e) { console.error('fetchChatMessages:', e) }
  },

  fetchStats: async () => {
    try {
      const res = await fetch('/api/stats')
      if (res.ok) set({ stats: await res.json() })
    } catch (e) { console.error('fetchStats:', e) }
  },

  fetchBriefing: async () => {
    try {
      const res = await fetch('/api/ai/briefing')
      if (res.ok) {
        const data = await res.json()
        set({ briefing: data.briefing })
      }
    } catch (e) { console.error('fetchBriefing:', e) }
  },

  fetchSuggestions: async () => {
    try {
      const res = await fetch('/api/ai/suggestions')
      if (res.ok) {
        const data = await res.json()
        set({ suggestions: data.suggestions })
      }
    } catch (e) { console.error('fetchSuggestions:', e) }
  },

  fetchAll: async () => {
    set({ isLoading: true })
    try {
      // Use Promise.allSettled so one failing request doesn't block the rest
      const results = await Promise.allSettled([
        get().fetchUser(),
        get().fetchTasks(),
        get().fetchProjects(),
        get().fetchEvents(),
        get().fetchReminders(),
        get().fetchEmails(),
        get().fetchEmailAccounts(),
        get().fetchInvoices(),
        get().fetchContracts(),
        get().fetchTimeEntries(),
        get().fetchDocuments(),
        get().fetchSnippets(),
        get().fetchNotifications(),
        get().fetchGoals(),
        get().fetchStats(),
        get().fetchSuggestions(),
        get().fetchMeetings(),
        get().fetchAutomationPrefs(),
        get().fetchAutomationLogs(),
        get().fetchAnalytics(),
        get().fetchTags(),
        get().fetchTemplates(),
      ])
      // Log any failures (non-blocking)
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.warn(`fetchAll: request ${i} failed:`, r.reason)
        }
      })
    } finally {
      set({ isLoading: false })
    }
  },

  // CRUD - Tasks
  createTask: async (task) => {
    try {
      const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) })
      if (res.ok) { await get().fetchTasks(); await get().fetchStats() }
    } catch (e) { console.error('createTask:', e) }
  },
  updateTask: async (id, data) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { await get().fetchTasks(); await get().fetchStats() }
    } catch (e) { console.error('updateTask:', e) }
  },
  deleteTask: async (id) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      if (res.ok) { await get().fetchTasks(); await get().fetchStats() }
    } catch (e) { console.error('deleteTask:', e) }
  },

  // CRUD - Projects
  createProject: async (project) => {
    try {
      const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project) })
      if (res.ok) { await get().fetchProjects() }
    } catch (e) { console.error('createProject:', e) }
  },
  updateProject: async (id, data) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { await get().fetchProjects() }
    } catch (e) { console.error('updateProject:', e) }
  },
  deleteProject: async (id) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (res.ok) { await get().fetchProjects() }
    } catch (e) { console.error('deleteProject:', e) }
  },

  // CRUD - Events
  createEvent: async (event) => {
    try {
      const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event) })
      if (res.ok) { await get().fetchEvents() }
    } catch (e) { console.error('createEvent:', e) }
  },
  updateEvent: async (id, data) => {
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { await get().fetchEvents() }
    } catch (e) { console.error('updateEvent:', e) }
  },
  deleteEvent: async (id) => {
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' })
      if (res.ok) { await get().fetchEvents() }
    } catch (e) { console.error('deleteEvent:', e) }
  },

  // CRUD - Reminders
  createReminder: async (reminder) => {
    try {
      const res = await fetch('/api/reminders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reminder) })
      if (res.ok) { await get().fetchReminders() }
    } catch (e) { console.error('createReminder:', e) }
  },
  updateReminder: async (id, data) => {
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { await get().fetchReminders() }
    } catch (e) { console.error('updateReminder:', e) }
  },
  deleteReminder: async (id) => {
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' })
      if (res.ok) { await get().fetchReminders() }
    } catch (e) { console.error('deleteReminder:', e) }
  },

  // CRUD - Emails
  sendEmail: async (data) => {
    try {
      const res = await fetch('/api/emails', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { await get().fetchEmails() }
    } catch (e) { console.error('sendEmail:', e) }
  },
  updateEmail: async (id, data) => {
    try {
      const res = await fetch(`/api/emails/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { await get().fetchEmails(); await get().fetchStats() }
    } catch (e) { console.error('updateEmail:', e) }
  },
  deleteEmail: async (id) => {
    try {
      const res = await fetch(`/api/emails/${id}`, { method: 'DELETE' })
      if (res.ok) { await get().fetchEmails() }
    } catch (e) { console.error('deleteEmail:', e) }
  },
  convertEmailToTask: async (id) => {
    try {
      const res = await fetch(`/api/emails/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ convertToTask: true }) })
      if (res.ok) { await get().fetchEmails(); await get().fetchTasks() }
    } catch (e) { console.error('convertEmailToTask:', e) }
  },

  // CRUD - Invoices
  createInvoice: async (invoice) => {
    try {
      const res = await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invoice) })
      if (res.ok) { await get().fetchInvoices(); await get().fetchStats() }
    } catch (e) { console.error('createInvoice:', e) }
  },
  updateInvoice: async (id, data) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { await get().fetchInvoices(); await get().fetchStats() }
    } catch (e) { console.error('updateInvoice:', e) }
  },
  deleteInvoice: async (id) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
      if (res.ok) { await get().fetchInvoices() }
    } catch (e) { console.error('deleteInvoice:', e) }
  },

  // CRUD - Meetings
  fetchMeetings: async () => {
    try {
      const res = await fetch('/api/meetings')
      if (res.ok) set({ meetings: await res.json() })
    } catch (e) { console.error('fetchMeetings:', e) }
  },
  createMeeting: async (data) => {
    try {
      const res = await fetch('/api/meetings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { await get().fetchMeetings() }
    } catch (e) { console.error('createMeeting:', e) }
  },
  updateMeeting: async (id, data) => {
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { await get().fetchMeetings() }
    } catch (e) { console.error('updateMeeting:', e) }
  },
  deleteMeeting: async (id) => {
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: 'DELETE' })
      if (res.ok) { await get().fetchMeetings() }
    } catch (e) { console.error('deleteMeeting:', e) }
  },

  // CRUD - Contracts
  createContract: async (contract) => {
    try {
      const res = await fetch('/api/contracts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contract) })
      if (res.ok) { await get().fetchContracts() }
    } catch (e) { console.error('createContract:', e) }
  },
  updateContract: async (id, data) => {
    try {
      const res = await fetch(`/api/contracts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { await get().fetchContracts() }
    } catch (e) { console.error('updateContract:', e) }
  },
  deleteContract: async (id) => {
    try {
      const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE' })
      if (res.ok) { await get().fetchContracts() }
    } catch (e) { console.error('deleteContract:', e) }
  },

  // CRUD - Time Entries
  createTimeEntry: async (entry) => {
    try {
      const res = await fetch('/api/time-entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) })
      if (res.ok) { await get().fetchTimeEntries(); await get().fetchStats() }
    } catch (e) { console.error('createTimeEntry:', e) }
  },
  updateTimeEntry: async (id, data) => {
    try {
      const res = await fetch(`/api/time-entries/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { await get().fetchTimeEntries(); await get().fetchStats() }
    } catch (e) { console.error('updateTimeEntry:', e) }
  },
  deleteTimeEntry: async (id) => {
    try {
      const res = await fetch(`/api/time-entries/${id}`, { method: 'DELETE' })
      if (res.ok) { await get().fetchTimeEntries() }
    } catch (e) { console.error('deleteTimeEntry:', e) }
  },
  startTimer: (data) => {
    set({ activeTimer: { startTime: new Date().toISOString(), taskId: data.taskId || null, projectId: data.projectId || null, description: data.description, isBillable: data.isBillable } })
  },
  stopTimer: async () => {
    const { activeTimer, createTimeEntry } = get()
    if (activeTimer) {
      await createTimeEntry({
        startTime: activeTimer.startTime,
        endTime: new Date().toISOString(),
        taskId: activeTimer.taskId,
        projectId: activeTimer.projectId,
        description: activeTimer.description,
        isBillable: activeTimer.isBillable,
      })
      set({ activeTimer: null })
    }
  },

  // CRUD - Documents
  createDocument: async (doc) => {
    try {
      const res = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(doc) })
      if (res.ok) { await get().fetchDocuments() }
    } catch (e) { console.error('createDocument:', e) }
  },
  updateDocument: async (id, data) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { await get().fetchDocuments() }
    } catch (e) { console.error('updateDocument:', e) }
  },
  deleteDocument: async (id) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      if (res.ok) { await get().fetchDocuments() }
    } catch (e) { console.error('deleteDocument:', e) }
  },

  // CRUD - Snippets
  createSnippet: async (snippet) => {
    try {
      const res = await fetch('/api/snippets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snippet) })
      if (res.ok) { await get().fetchSnippets() }
    } catch (e) { console.error('createSnippet:', e) }
  },
  updateSnippet: async (id, data) => {
    try {
      const res = await fetch(`/api/snippets/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { await get().fetchSnippets() }
    } catch (e) { console.error('updateSnippet:', e) }
  },
  deleteSnippet: async (id) => {
    try {
      const res = await fetch(`/api/snippets/${id}`, { method: 'DELETE' })
      if (res.ok) { await get().fetchSnippets() }
    } catch (e) { console.error('deleteSnippet:', e) }
  },

  // CRUD - Notifications
  markNotificationRead: async (id) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isRead: true }) })
      await get().fetchNotifications()
    } catch (e) { console.error('markNotificationRead:', e) }
  },
  markAllNotificationsRead: async () => {
    try {
      const { notifications } = get()
      await Promise.all(notifications.filter(n => !n.isRead).map(n =>
        fetch(`/api/notifications/${n.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isRead: true }) })
      ))
      await get().fetchNotifications()
    } catch (e) { console.error('markAllNotificationsRead:', e) }
  },
  deleteNotification: async (id) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      await get().fetchNotifications()
    } catch (e) { console.error('deleteNotification:', e) }
  },

  // CRUD - Goals
  createGoal: async (goal) => {
    try {
      const res = await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goal) })
      if (res.ok) { await get().fetchGoals() }
    } catch (e) { console.error('createGoal:', e) }
  },
  updateGoal: async (id, data) => {
    try {
      const res = await fetch(`/api/goals/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { await get().fetchGoals() }
    } catch (e) { console.error('updateGoal:', e) }
  },
  deleteGoal: async (id) => {
    try {
      await fetch(`/api/goals/${id}`, { method: 'DELETE' })
      await get().fetchGoals()
    } catch (e) { console.error('deleteGoal:', e) }
  },

  // AI Chat
  sendChatMessage: async (message) => {
    try {
      const newMsg: ChatMessage = { id: `temp-${Date.now()}`, role: 'user', content: message, userId: '', createdAt: new Date().toISOString() }
      set((s) => ({ chatMessages: [...s.chatMessages, newMsg] }))
      const res = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })
      if (res.ok) {
        const data = await res.json()
        set((s) => ({ chatMessages: [...s.chatMessages, { id: `ai-${Date.now()}`, role: 'assistant', content: data.message, userId: '', createdAt: new Date().toISOString() }] }))
      }
    } catch (e) { console.error('sendChatMessage:', e) }
  },

  // Templates
  fetchTemplates: async () => {
    try {
      const res = await fetch('/api/templates')
      if (res.ok) set({ templates: await res.json() })
    } catch (e) { console.error('fetchTemplates:', e) }
  },
  createTemplate: async (template) => {
    try {
      const res = await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(template) })
      if (res.ok) { await get().fetchTemplates() }
    } catch (e) { console.error('createTemplate:', e) }
  },
  updateTemplate: async (id, data) => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { await get().fetchTemplates() }
    } catch (e) { console.error('updateTemplate:', e) }
  },
  deleteTemplate: async (id) => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      if (res.ok) { await get().fetchTemplates() }
    } catch (e) { console.error('deleteTemplate:', e) }
  },
  applyTemplate: async (id, variables) => {
    try {
      const res = await fetch(`/api/templates/${id}/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ variables }) })
      if (res.ok) {
        const data = await res.json()
        await get().fetchTemplates()
        return { content: data.content, missing: data.missingVariables || [] }
      }
      return { content: '', missing: [] }
    } catch (e) { console.error('applyTemplate:', e); return { content: '', missing: [] } }
  },
  seedTemplates: async () => {
    try {
      const res = await fetch('/api/templates/seed', { method: 'POST' })
      if (res.ok) { await get().fetchTemplates() }
    } catch (e) { console.error('seedTemplates:', e) }
  },

  // Automations
  fetchAutomationPrefs: async () => {
    try {
      const res = await fetch('/api/automations/preferences')
      if (res.ok) set({ automationPrefs: await res.json() })
    } catch (e) { console.error('fetchAutomationPrefs:', e) }
  },
  updateAutomationPref: async (type, data) => {
    try {
      const res = await fetch('/api/automations/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, ...data }) })
      if (res.ok) { await get().fetchAutomationPrefs() }
    } catch (e) { console.error('updateAutomationPref:', e) }
  },
  fetchAutomationLogs: async (page = 1) => {
    try {
      const res = await fetch(`/api/automations/logs?page=${page}`)
      if (res.ok) set({ automationLogs: await res.json() })
    } catch (e) { console.error('fetchAutomationLogs:', e) }
  },
  runAutomationChecks: async () => {
    try {
      const res = await fetch('/api/automations/check', { method: 'POST' })
      if (res.ok) { await get().fetchAutomationLogs(); await get().fetchNotifications() }
    } catch (e) { console.error('runAutomationChecks:', e) }
  },

  // Tags
  fetchTags: async () => {
    try {
      const res = await fetch('/api/tags')
      if (res.ok) set({ tags: await res.json() })
    } catch (e) { console.error('fetchTags:', e) }
  },
  createTag: async (tag) => {
    try {
      const res = await fetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tag) })
      if (res.ok) { await get().fetchTags() }
    } catch (e) { console.error('createTag:', e) }
  },
  updateTag: async (id, data) => {
    try {
      const res = await fetch(`/api/tags/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { await get().fetchTags() }
    } catch (e) { console.error('updateTag:', e) }
  },
  deleteTag: async (id) => {
    try {
      const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' })
      if (res.ok) { await get().fetchTags() }
    } catch (e) { console.error('deleteTag:', e) }
  },
  assignTag: async (tagId, entityType, entityIds) => {
    try {
      const res = await fetch('/api/tags/assign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tagId, entityType, entityIds }) })
      if (res.ok) { await get().fetchTags() }
    } catch (e) { console.error('assignTag:', e) }
  },
  unassignTag: async (tagId, entityType, entityIds) => {
    try {
      const res = await fetch('/api/tags/unassign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tagId, entityType, entityIds }) })
      if (res.ok) { await get().fetchTags() }
    } catch (e) { console.error('unassignTag:', e) }
  },
  seedTags: async () => {
    try {
      const res = await fetch('/api/tags/seed', { method: 'POST' })
      if (res.ok) { await get().fetchTags() }
    } catch (e) { console.error('seedTags:', e) }
  },

  // Search
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearSearch: () => set({ searchResults: null, searchQuery: '' }),

  search: async (query, type, filters) => {
    try {
      const params = new URLSearchParams({ q: query, page: '1', limit: '20' })
      if (type) params.set('type', type)
      if (filters) params.set('filters', filters)
      const res = await fetch(`/api/search?${params.toString()}`)
      if (res.ok) set({ searchResults: await res.json() })
    } catch (e) { console.error('search:', e) }
  },

  // Analytics export
  exportAnalytics: async (format, range) => {
    try {
      const res = await fetch(`/api/analytics/export?format=${format}&range=${range}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics-${range}.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (e) { console.error('exportAnalytics:', e) }
  },
}))
