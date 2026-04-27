import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateSnippet, calculateScore, parseFilters } from '@/lib/search-utils'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS, createRateLimitHeaders } from '@/lib/rate-limit'
import { searchQuerySchema } from '@/lib/validations/productivity'

export const dynamic = 'force-dynamic'

/**
 * GET /api/search
 *
 * Full-text search across tasks, emails, documents, and projects/contacts.
 * Query params:
 *   - q:       search query string (required, min 2 chars)
 *   - type:    task | email | document | contact | all  (default: all)
 *   - filters: tag:urgent,client:acme  (optional comma-separated key:value pairs)
 *   - page:    page number (default: 1)
 *   - limit:   results per page (default: 20)
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req)
    const rateCheck = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429, headers: createRateLimitHeaders(DEFAULT_API_OPTIONS, 0, rateCheck.retryAfterMs) }
      )
    }

    // Auth
    const { user, response: authResponse } = await requireAuth()
    if (!user) return authResponse!

    // Validate query params with Zod
    const { searchParams } = new URL(req.url)
    const queryParse = searchQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))
    if (!queryParse.success) {
      return NextResponse.json(
        { error: 'Paramètres de recherche invalides', details: queryParse.error.flatten() },
        { status: 400 }
      )
    }
    const { q: query, type, filters: filtersStr, page, limit } = queryParse.data

    const userId = user.id

    // Parse filters
    const filters = parseFilters(filtersStr || '')

    // ─── Collect results from all searchable entities ──────────────────────────
    const results: Array<{
      id: string
      type: string
      title: string
      snippet: string
      score: number
      createdAt: string
    }> = []

    const searchTypes = type === 'all'
      ? ['task', 'email', 'document', 'contact'] as const
      : [type] as const

    // Run searches in parallel
    const searchPromises = searchTypes.map(async (searchType) => {
      const typeResults: Array<{
        id: string
        type: string
        title: string
        snippet: string
        score: number
        createdAt: string
      }> = []

      switch (searchType) {
        // ─── Tasks ───────────────────────────────────────────────────────────────
        case 'task': {
          const taskWhere: Record<string, unknown> = {
            userId,
            OR: [
              { title: { contains: query } },
              { description: { contains: query } },
            ],
          }

          // Apply tag filter
          if (filters.tag) {
            taskWhere.tags = {
              some: {
                tag: { name: { contains: filters.tag } },
              },
            }
          }

          const tasks = await db.task.findMany({
            where: taskWhere,
            take: limit * 2, // fetch extra for scoring/ranking
            orderBy: { createdAt: 'desc' },
          })

          for (const task of tasks) {
            const titleMatch = task.title.toLowerCase().includes(query.toLowerCase())
            const descMatch = task.description
              ? task.description.toLowerCase().includes(query.toLowerCase())
              : false

            if (!titleMatch && !descMatch) continue

            const score = calculateScore({
              titleMatch,
              bodyMatch: descMatch,
              createdAt: task.createdAt,
            })

            const snippet = generateSnippet(
              task.description || task.title,
              query,
              100
            )

            typeResults.push({
              id: task.id,
              type: 'task',
              title: task.title,
              snippet,
              score,
              createdAt: task.createdAt.toISOString(),
            })
          }
          break
        }

        // ─── Emails ─────────────────────────────────────────────────────────────
        case 'email': {
          const emailWhere: Record<string, unknown> = {
            userId,
            OR: [
              { subject: { contains: query } },
              { body: { contains: query } },
              { fromName: { contains: query } },
            ],
          }

          // Apply tag filter
          if (filters.tag) {
            emailWhere.tags = {
              some: {
                tag: { name: { contains: filters.tag } },
              },
            }
          }

          const emails = await db.email.findMany({
            where: emailWhere,
            take: limit * 2,
            orderBy: { createdAt: 'desc' },
          })

          for (const email of emails) {
            const titleMatch = email.subject.toLowerCase().includes(query.toLowerCase())
            const bodyMatch = email.body
              ? email.body.toLowerCase().includes(query.toLowerCase())
              : false
            const fromMatch = email.fromName
              ? email.fromName.toLowerCase().includes(query.toLowerCase())
              : false

            if (!titleMatch && !bodyMatch && !fromMatch) continue

            const score = calculateScore({
              titleMatch,
              bodyMatch: bodyMatch || fromMatch,
              createdAt: email.createdAt,
            })

            const snippet = generateSnippet(
              email.body || email.subject,
              query,
              100
            )

            typeResults.push({
              id: email.id,
              type: 'email',
              title: email.subject,
              snippet,
              score,
              createdAt: email.createdAt.toISOString(),
            })
          }
          break
        }

        // ─── Documents ──────────────────────────────────────────────────────────
        case 'document': {
          const docWhere: Record<string, unknown> = {
            userId,
            OR: [
              { name: { contains: query } },
              { content: { contains: query } },
            ],
          }

          // Apply tag filter
          if (filters.tag) {
            docWhere.tags = {
              some: {
                tag: { name: { contains: filters.tag } },
              },
            }
          }

          const documents = await db.document.findMany({
            where: docWhere,
            take: limit * 2,
            orderBy: { createdAt: 'desc' },
          })

          for (const doc of documents) {
            const titleMatch = doc.name.toLowerCase().includes(query.toLowerCase())
            const bodyMatch = doc.content
              ? doc.content.toLowerCase().includes(query.toLowerCase())
              : false

            if (!titleMatch && !bodyMatch) continue

            const score = calculateScore({
              titleMatch,
              bodyMatch,
              createdAt: doc.createdAt,
            })

            const snippet = generateSnippet(
              doc.content || doc.name,
              query,
              100
            )

            typeResults.push({
              id: doc.id,
              type: 'document',
              title: doc.name,
              snippet,
              score,
              createdAt: doc.createdAt.toISOString(),
            })
          }
          break
        }

        // ─── Contacts (Projects) ────────────────────────────────────────────────
        case 'contact': {
          const contactWhere: Record<string, unknown> = {
            userId,
            OR: [
              { name: { contains: query } },
              { clientName: { contains: query } },
              { description: { contains: query } },
            ],
          }

          // Apply client filter
          if (filters.client) {
            contactWhere.clientName = { contains: filters.client }
          }

          // Apply tag filter
          if (filters.tag) {
            contactWhere.tags = {
              some: {
                tag: { name: { contains: filters.tag } },
              },
            }
          }

          const contacts = await db.project.findMany({
            where: contactWhere,
            take: limit * 2,
            orderBy: { createdAt: 'desc' },
          })

          for (const project of contacts) {
            const titleMatch = project.name.toLowerCase().includes(query.toLowerCase())
            const clientMatch = project.clientName
              ? project.clientName.toLowerCase().includes(query.toLowerCase())
              : false
            const descMatch = project.description
              ? project.description.toLowerCase().includes(query.toLowerCase())
              : false

            if (!titleMatch && !clientMatch && !descMatch) continue

            const score = calculateScore({
              titleMatch,
              bodyMatch: descMatch || clientMatch,
              createdAt: project.createdAt,
            })

            const snippet = generateSnippet(
              project.description || `${project.name}${project.clientName ? ` — ${project.clientName}` : ''}`,
              query,
              100
            )

            typeResults.push({
              id: project.id,
              type: 'contact',
              title: project.clientName
                ? `${project.name} — ${project.clientName}`
                : project.name,
              snippet,
              score,
              createdAt: project.createdAt.toISOString(),
            })
          }
          break
        }
      }

      return typeResults
    })

    const allTypeResults = await Promise.all(searchPromises)

    // Merge all results
    for (const typeResult of allTypeResults) {
      results.push(...typeResult)
    }

    // Sort by score (descending), then by date (most recent first)
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    // ─── Pagination ────────────────────────────────────────────────────────────
    const total = results.length
    const offset = (page - 1) * limit
    const paginatedResults = results.slice(offset, offset + limit)
    const hasMore = offset + limit < total

    return NextResponse.json({
      results: paginatedResults,
      total,
      page,
      limit,
      hasMore,
    })
  } catch (error) {
    console.error('Search GET error:', error)
    return NextResponse.json(
      { error: 'Échec de la recherche' },
      { status: 500 }
    )
  }
}
