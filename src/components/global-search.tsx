'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  FileText,
  Mail,
  Users,
  X,
  Loader2,
  Command,
  CheckSquare,
  ArrowRight,
} from 'lucide-react'
import { useAppStore, type SearchResult, type TabType } from '@/lib/store'
import { cn } from '@/lib/utils'

// ─── Type configuration ─────────────────────────────────────────────────────

const typeConfig: Record<
  string,
  { icon: typeof CheckSquare; label: string; color: string; bgColor: string }
> = {
  task: {
    icon: CheckSquare,
    label: 'Tâches',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
  },
  email: {
    icon: Mail,
    label: 'Emails',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  document: {
    icon: FileText,
    label: 'Documents',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  contact: {
    icon: Users,
    label: 'Contacts',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
}

const filterTabs = [
  { key: 'all', label: 'Tout' },
  { key: 'task', label: 'Tâches' },
  { key: 'email', label: 'Emails' },
  { key: 'document', label: 'Documents' },
  { key: 'contact', label: 'Contacts' },
] as const

type FilterTabKey = (typeof filterTabs)[number]['key']

// ─── Sanitize HTML helper (defense-in-depth) ──────────────────────────────

function sanitizeHtml(html: string): string {
  // Only allow <mark> and <em> tags, strip everything else
  return html.replace(/<(?!\/?(mark|em)\b)[^>]*>/gi, '')
}

// ─── Highlighted text renderer ──────────────────────────────────────────────

function HighlightedText({ html }: { html: string }) {
  // The API returns snippets with <mark> tags for highlighting.
  // First sanitize to strip any dangerous tags, then style <mark> elements.
  const safeHtml = sanitizeHtml(html).replace(
    /<mark>/g,
    '<mark class="bg-amber-400/30 text-amber-200 rounded-sm px-0.5">'
  )
  return (
    <span
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  )
}

// ─── Score bar ───────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  // Max score is around 4.5 (3 title + 1 body + 0.5 recent), normalise to 0‑1
  const pct = Math.min(1, score / 4.5)
  return (
    <div className="flex items-center gap-1.5" title={`Pertinence : ${score}`}>
      <div className="h-1 w-10 rounded-full bg-zinc-800 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ─── Relative date ──────────────────────────────────────────────────────────

function RelativeDate({ date }: { date: string }) {
  const label = useMemo(() => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return 'Hier'
    if (diffDays < 7) return `Il y a ${diffDays}j`
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`
    if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`
    return `Il y a ${Math.floor(diffDays / 365)} an${Math.floor(diffDays / 365) > 1 ? 's' : ''}`
  }, [date])

  return <span className="text-[10px] text-zinc-600 whitespace-nowrap">{label}</span>
}

// ─── Main component ─────────────────────────────────────────────────────────

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterTabKey>('all')
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const searchResults = useAppStore((s) => s.searchResults)

  // ── Keyboard shortcut: Cmd/Ctrl + K ─────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ── Focus input when opening ────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      // Slight delay to let animation settle
      setTimeout(() => inputRef.current?.focus(), 80)
      // Reset state
      setQuery('')
      setActiveFilter('all')
      setSelectedIndex(0)
      setIsSearching(false)
    }
  }, [open])

  // ── Clear search function ───────────────────────────────────────────────

  const clearSearch = useCallback(() => {
    setQuery('')
    setActiveFilter('all')
    setSelectedIndex(0)
    setIsSearching(false)
    abortControllerRef.current?.abort()
    useAppStore.getState().setSearchQuery('')
  }, [])

  // ── Debounced search with AbortController ───────────────────────────────
  useEffect(() => {
    if (!open) return

    // Clear previous timer
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      // Clear results if query is too short
      useAppStore.getState().setSearchQuery('')
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    debounceRef.current = setTimeout(async () => {
      // Cancel previous request
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&type=${activeFilter}&limit=20`,
          { signal: controller.signal }
        )
        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()

        // Update store with results
        useAppStore.setState({ searchResults: data })
        useAppStore.getState().setSearchQuery(trimmed)
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return // cancelled, ignore
        console.error('Search error:', error)
      } finally {
        setIsSearching(false)
        setSelectedIndex(0)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, activeFilter, open])

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // ── Group results by type ───────────────────────────────────────────────
  const groupedResults = useMemo(() => {
    if (!searchResults?.results) return []

    const groups: Record<string, SearchResult[]> = {}
    for (const r of searchResults.results) {
      const type = r.type || 'task'
      if (!groups[type]) groups[type] = []
      groups[type].push(r)
    }

    // Preserve display order from typeConfig
    const ordered: { type: string; config: (typeof typeConfig)[string]; items: SearchResult[] }[] = []
    for (const type of Object.keys(typeConfig)) {
      if (groups[type]?.length) {
        ordered.push({ type, config: typeConfig[type], items: groups[type] })
      }
    }
    // Add any unknown types
    for (const type of Object.keys(groups)) {
      if (!typeConfig[type] && groups[type]?.length) {
        ordered.push({
          type,
          config: { icon: FileText, label: type, color: 'text-zinc-400', bgColor: 'bg-zinc-800' },
          items: groups[type],
        })
      }
    }
    return ordered
  }, [searchResults])

  // ── Flat list for keyboard navigation ───────────────────────────────────
  const flatResults = useMemo(() => {
    return groupedResults.flatMap((g) => g.items)
  }, [groupedResults])

  // ── Navigate to result ──────────────────────────────────────────────────
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      const tabMap: Record<string, TabType> = {
        task: 'tasks',
        email: 'emails',
        document: 'documents',
        contact: 'tasks', // contacts are projects
      }
      useAppStore.getState().setActiveTab(tabMap[result.type] || 'dashboard')
      setOpen(false)
    },
    []
  )

  // ── Keyboard navigation within results ──────────────────────────────────
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1))
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        return
      }

      if (e.key === 'Enter' && flatResults[selectedIndex]) {
        e.preventDefault()
        handleResultClick(flatResults[selectedIndex])
        return
      }
    },
    [flatResults, selectedIndex, handleResultClick]
  )

  // ── Scroll selected item into view ──────────────────────────────────────
  useEffect(() => {
    if (!listRef.current) return
    const selected = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
    selected?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // ── Close handler ───────────────────────────────────────────────────────
  const handleClose = useCallback(() => setOpen(false), [])

  // ── Determine if we should show "no results" ────────────────────────────
  const showEmpty =
    query.trim().length >= 2 && !isSearching && flatResults.length === 0

  const totalCount = searchResults?.total ?? 0

  // ── Detect platform for shortcut display ────────────────────────────────
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod/.test(navigator.userAgent)

  return (
    <>
      {/* ── Floating shortcut button when search is closed ──────────────── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-lg
            bg-zinc-900/80 border border-zinc-700/60 text-zinc-400 text-xs
            hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-600
            backdrop-blur-sm transition-all shadow-lg shadow-black/20
            group"
          aria-label="Ouvrir la recherche"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Rechercher</span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border border-zinc-700 bg-zinc-800 text-zinc-500 ml-1">
            {isMac ? <Command className="w-2.5 h-2.5 mr-0.5" /> : 'Ctrl'}
            K
          </kbd>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="search-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={handleClose}
            />

            {/* Dialog */}
            <motion.div
              key="search-dialog"
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="fixed inset-x-0 top-[12%] mx-auto w-[calc(100%-2rem)] max-w-2xl z-50"
            >
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col max-h-[70vh]">
                {/* ── Search input ─────────────────────────────────────────── */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800">
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>

                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Rechercher partout…"
                    className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
                    autoComplete="off"
                    spellCheck={false}
                  />

                  <div className="flex items-center gap-1 text-zinc-600">
                    <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border border-zinc-700 bg-zinc-800 text-zinc-500">
                      <Command className="w-2.5 h-2.5 mr-0.5" />K
                    </kbd>
                    {query.length > 0 && (
                      <button
                        onClick={clearSearch}
                        className="p-1 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                        aria-label="Effacer la recherche"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={handleClose}
                      className="p-1 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                      aria-label="Fermer la recherche"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ── Filter tabs ──────────────────────────────────────────── */}
                <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-800 overflow-x-auto custom-scrollbar">
                  {filterTabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setActiveFilter(tab.key)
                        setSelectedIndex(0)
                      }}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                        activeFilter === tab.key
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}

                  {totalCount > 0 && (
                    <span className="ml-auto text-[10px] text-zinc-600 whitespace-nowrap">
                      {totalCount} résultat{totalCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* ── Results list ─────────────────────────────────────────── */}
                <div
                  ref={listRef}
                  className="flex-1 overflow-y-auto custom-scrollbar"
                >
                  {/* Empty state */}
                  {showEmpty && (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
                        <Search className="w-5 h-5 text-zinc-600" />
                      </div>
                      <p className="text-sm text-zinc-400">Aucun résultat</p>
                      <p className="text-xs text-zinc-600 mt-1">
                        Essayez avec d&apos;autres mots-clés
                      </p>
                    </div>
                  )}

                  {/* Idle state – show shortcut hint */}
                  {query.trim().length < 2 && (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
                        <Command className="w-5 h-5 text-zinc-500" />
                      </div>
                      <p className="text-sm text-zinc-400">
                        Recherche avancée full-text
                      </p>
                      <p className="text-xs text-zinc-600 mt-1">
                        Tapez au moins 2 caractères pour rechercher
                      </p>
                    </div>
                  )}

                  {/* Grouped results */}
                  {groupedResults.map((group) => {
                    const Icon = group.config.icon
                    return (
                      <div key={group.type}>
                        {/* Section header */}
                        <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                          <Icon className={cn('w-3.5 h-3.5', group.config.color)} />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                            {group.config.label}
                          </span>
                          <span className="text-[10px] text-zinc-700">
                            {group.items.length}
                          </span>
                        </div>

                        {/* Items */}
                        {group.items.map((result) => {
                          const globalIndex = flatResults.indexOf(result)
                          const isSelected = globalIndex === selectedIndex

                          return (
                            <button
                              key={`${result.type}-${result.id}`}
                              data-index={globalIndex}
                              onClick={() => handleResultClick(result)}
                              onMouseEnter={() => setSelectedIndex(globalIndex)}
                              className={cn(
                                'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors',
                                isSelected
                                  ? 'bg-zinc-800/80'
                                  : 'hover:bg-zinc-800/50'
                              )}
                            >
                              {/* Icon */}
                              <div
                                className={cn(
                                  'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5',
                                  group.config.bgColor
                                )}
                              >
                                <Icon
                                  className={cn('w-3.5 h-3.5', group.config.color)}
                                />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-200 truncate">
                                  {result.title}
                                </p>
                                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
                                  <HighlightedText html={result.snippet} />
                                </p>
                              </div>

                              {/* Meta */}
                              <div className="flex flex-col items-end gap-1 flex-shrink-0 pt-0.5">
                                <ScoreBar score={result.score} />
                                <RelativeDate date={result.createdAt} />
                              </div>

                              {/* Arrow hint */}
                              {isSelected && (
                                <ArrowRight className="w-3.5 h-3.5 text-zinc-600 mt-1 flex-shrink-0" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}

                  {/* Loading indicator at bottom */}
                  {isSearching && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      <span className="ml-2 text-xs text-zinc-500">
                        Recherche en cours…
                      </span>
                    </div>
                  )}

                  {/* Bottom padding */}
                  {flatResults.length > 0 && <div className="h-2" />}
                </div>

                {/* ── Footer hint ──────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 text-[10px] text-zinc-600">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-500">
                        ↑↓
                      </kbd>
                      Naviguer
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-500">
                        ↵
                      </kbd>
                      Ouvrir
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-500">
                        esc
                      </kbd>
                      Fermer
                    </span>
                  </div>
                  <span className="text-zinc-700">Maellis Search</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
