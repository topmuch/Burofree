# Burofree — PRIORITÉ 2 Productivité : Worklog & Auto-Audit

## Session: 2026-04-28

---

## Task ID: 1 — Auth + Rate Limiting + Zod sur les 13 routes API

**Agent:** Main Agent + Subagent full-stack-developer

**Work Log:**
- Créé `/src/lib/validations/productivity.ts` — 11 schémas Zod centralisés
- Corrigé 13 routes API : remplacé `db.user.findFirst()` par `requireAuth()` partout
- Ajouté rate limiting (429 si limite dépassée) sur chaque handler
- Ajouté validation Zod sur tous les inputs (body + query params)

**Auto-Audit Results (13/13 routes):**
| # | Route | Auth | Rate Limit | Zod | db.user.findFirst removed |
|---|-------|:----:|:----------:|:---:|:-------------------------:|
| 1 | templates/route | ✅ | ✅ | ✅ | ✅ |
| 2 | templates/[id]/route | ✅ | ✅ | ✅ | ✅ |
| 3 | templates/[id]/apply/route | ✅ | ✅ | ✅ | ✅ |
| 4 | automations/check/route | ✅ | ✅ | N/A | ✅ |
| 5 | automations/preferences/route | ✅ | ✅ | ✅ | ✅ |
| 6 | automations/logs/route | ✅ | ✅ | ✅ | ✅ |
| 7 | analytics/overview/route | ✅ | ✅ | ✅ | ✅ |
| 8 | analytics/export/route | ✅ | ✅ | ✅ | ✅ |
| 9 | search/route | ✅ | ✅ | ✅ | ✅ |
| 10 | tags/route | ✅ | ✅ | ✅ | ✅ |
| 11 | tags/[id]/route | ✅ | ✅ | ✅ | ✅ |
| 12 | tags/assign/route | ✅ | ✅ | ✅ | ✅ |
| 13 | tags/unassign/route | ✅ | ✅ | ✅ | ✅ |

**Stage Summary:**
- 100% des routes utilisent `requireAuth()` au lieu de `db.user.findFirst()`
- 100% ont un rate limiting
- 12/13 ont un schéma Zod (1 N/A car pas de body/query)
- Bug fix: automations/logs — `success !== null` remplacé par `searchParams.has('success')`
- Bug fix: analytics/export — PDF retourne un vrai PDF Puppeteer (pas HTML)
- Bug fix: analytics/export — CSV a un BOM pour les caractères français
- Bug fix: tags/assign — `skipDuplicates` incompatible SQLite → filtrage manuel des doublons
- Bug fix: tags/assign — vérification ownership des entités avant assignation

---

## Task ID: 1b — Store Zustand + Middleware + Search Utils + Automation Cron

**Agent:** Main Agent + Subagent full-stack-developer

**Work Log:**
- **store.ts**: Supprimé les actions Template dupliquées (6 actions × 2 = 12 defs → 6 defs)
- **store.ts**: Supprimé `fetchAnalytics` dupliqué
- **store.ts**: Ajouté `fetchUser`, `fetchMeetings`, `fetchAutomationLogs`, `fetchAnalytics` à `fetchAll`
- **store.ts**: Ajouté `exportAnalytics(format, range)` et `clearSearch()`
- **middleware.ts**: Corrigé OAUTH_ROUTES (`/api/email-sync` → supprimé, route correcte = `/api/emails/sync`)
- **middleware.ts**: Ajouté rate limiting (429) après vérification session
- **search-utils.ts**: Ajouté `escapeHtml()`, fix XSS dans `highlightMatches` et `generateSnippet`
- **automation-cron.ts**: Ajouté `sendEmailNotification()` (Resend API)
- **automation-cron.ts**: Intégré email dans les 4 check functions quand channel=email|both
- **automation-cron.ts**: Ajouté `startAutomationCron()` + `stopAutomationCron()` + `runCronForAllUsers()`
- **cron-starter.ts** (nouveau): `initCron()` pour démarrer le cron en production

**Auto-Audit Results:**
| File | Check | Result |
|------|-------|--------|
| store.ts | Duplicatas supprimés | ✅ PASS |
| store.ts | fetchAll complet | ✅ PASS |
| store.ts | exportAnalytics + clearSearch | ✅ PASS |
| middleware.ts | OAUTH_ROUTES corrigé | ✅ PASS |
| middleware.ts | Rate limiting intégré | ✅ PASS |
| search-utils.ts | escapeHtml + XSS fix | ✅ PASS |
| automation-cron.ts | startAutomationCron | ✅ PASS |
| automation-cron.ts | sendEmailNotification (Resend) | ✅ PASS |
| automation-cron.ts | 4 checks → email si channel | ✅ PASS |
| cron-starter.ts | Existe + exporte initCron | ✅ PASS |

**Stage Summary:**
- XSS corrigé dans search (escapeHtml avant <mark>)
- Cron scheduler ajouté (toutes les 15 min pour tous les users onboarded)
- Email notifications via Resend quand channel=email|both
- Store Zustand nettoyé et complété

---

## Task ID: 2-6 — UI Panels API Wiring

**Agent:** Main Agent + Subagent full-stack-developer

**Work Log:**

### Tags Panel
- Remplacé état initial hardcodé par `fetchTags()` → GET /api/tags
- `handleCreate` → POST /api/tags (au lieu de local state)
- `handleEdit` → PUT /api/tags/:id
- `handleDelete` → DELETE /api/tags/:id + confirmation dialog
- `handleBulkAssign` → POST /api/tags/assign
- `handleLoadDefaults` → POST /api/tags/seed
- Ajouté loading states + skeleton + toast notifications
- Fix: `tag.icon ?? ''` (null → string)
- Fix: `ringColor` CSS property invalide → `boxShadow` CSS

### Automations Panel
- Remplacé prefs hardcodées par `fetchPreferences()` → GET /api/automations/preferences
- `updatePreference` → POST /api/automations/preferences (optimistic + rollback)
- "Vérifier maintenant" → POST /api/automations/check (au lieu de setTimeout fake)
- Logs → GET /api/automations/logs?page=&limit= (au lieu de generateMockLogs)
- Supprimé `generateMockLogs()` entièrement
- Ajouté "Charger plus" avec pagination
- Ajouté loading skeletons

### Global Search
- Ajouté AbortController pour annuler les requêtes précédentes
- Ajouté `sanitizeHtml()` (defense-in-depth, seuls <mark> et <em> autorisés)
- Ajouté `clearSearch()` avec bouton X
- Ajouté bouton flottant Cmd/Ctrl+K quand recherche fermée

**Auto-Audit Results:**
| Panel | API Wired | Mock Data Removed | Loading States | Security |
|-------|:---------:|:-----------------:|:--------------:|:--------:|
| tags-panel | ✅ 5/5 endpoints | ✅ | ✅ | ✅ null coalesce + CSS fix |
| automations-panel | ✅ 3/3 endpoints | ✅ generateMockLogs supprimé | ✅ | ✅ |
| global-search | ✅ | ✅ | ✅ AbortController | ✅ sanitizeHtml |

---

## Task ID: 7 — Auto-Audit Final & TypeScript Compilation

**Compilation TypeScript:**
- 0 erreurs dans les fichiers modifiés
- 24 erreurs pré-existantes dans d'autres fichiers (ai/suggestions, invoices/pdf, stripe/webhook, etc.) — non liées à ce travail

**Bugs résolus lors de l'auto-audit:**
1. `logsQuerySchema` inline → centralisé dans validations/productivity.ts ✅
2. `user.profession` pas dans AuthenticatedUser → valeur par défaut '' ✅
3. `skipDuplicates: true` incompatible SQLite → filtrage manuel ✅
4. `tag.icon` null → coalesce `?? ''` ✅
5. `ringColor` CSS invalide → `boxShadow` CSS ✅
6. `Buffer` pas assignable à BodyInit → `new Uint8Array()` ✅

---

## Résumé Final — 5 Fonctionnalités PRIORITÉ 2

| Fonctionnalité | Backend API | Auth | Rate Limit | Zod | UI↔API | Cron/Email | Sécurité |
|----------------|:-----------:|:----:|:----------:|:---:|:------:|:----------:|:--------:|
| Templates & Modèles | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Rappels Automatiques | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Cron 15min + Resend | ✅ |
| Rapports & Analytics | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ PDF réel |
| Recherche Full-Text | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ XSS fix |
| Tags Multi-Dim | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ Ownership check |

### Fichiers modifiés (22 fichiers):
**API Routes (13):** templates/route, templates/[id]/route, templates/[id]/apply/route, automations/check/route, automations/preferences/route, automations/logs/route, analytics/overview/route, analytics/export/route, search/route, tags/route, tags/[id]/route, tags/assign/route, tags/unassign/route

**Core Infra (5):** store.ts, middleware.ts, search-utils.ts, automation-cron.ts, cron-starter.ts (nouveau)

**UI Panels (3):** tags-panel.tsx, automations-panel.tsx, global-search.tsx

**Validation (1):** validations/productivity.ts (nouveau)

### Configuration requise:
- `RESEND_API_KEY` — pour les notifications email (optionnel si in_app only)
- `ENABLE_CRON=true` — pour activer le cron en développement
- En production, le cron démarre automatiquement via `initCron()`

---

# PRIORITÉ 3 — Différenciation : Worklog & Auto-Audit

## Session: 2026-04-28 (suite)

---

## Task ID: P3-1 — Prisma Schema (7 nouveaux modèles)

**Agent:** Subagent full-stack-developer

**Work Log:**
- Ajouté 7 modèles Prisma : Module, UserModule, PortalInvite, PortalComment, IntegrationConnection, FocusSession, VoiceLog
- Ajouté relations inverses dans User (5), Project (2), Task (1)
- Indexes : slug, userId+status, token, provider, createdAt, etc.
- Contraintes : @@unique([userId, moduleId]), @@unique([userId, provider]), @@unique([token])
- `npx prisma db push` exécuté avec succès

**Auto-Audit:**
| Model | Created | Indexes | Relations | Unique constraints |
|-------|:-------:|:-------:|:---------:|:------------------:|
| Module | ✅ | slug, category+isActive | UserModule[] | slug |
| UserModule | ✅ | userId+status, expiresAt | User, Module | userId+moduleId |
| PortalInvite | ✅ | token, projectId+isActive, expiresAt | Project, User, PortalComment[] | token |
| PortalComment | ✅ | inviteId+entityType+entityId, createdAt | PortalInvite | — |
| IntegrationConnection | ✅ | userId+status, provider | User | userId+provider |
| FocusSession | ✅ | userId+startedAt, userId+completed, taskId | User, Task?, Project? | — |
| VoiceLog | ✅ | userId+createdAt, intent | User | — |

---

## Task ID: P3-2 — Marketplace & Feature Flags

**Agent:** Subagent full-stack-developer

**Work Log:**
- Créé `features/differentiation/marketplace/entitlement.ts` — checkEntitlement(), requireEntitlement(), getUserModules()
- Modules gratuits : marketplace, focus-mode, voice-commands
- Créé `lib/validations/differentiation.ts` — 12+ schémas Zod
- Créé 3 routes API : GET/POST /api/marketplace, PUT/DELETE /api/marketplace/[id], POST /api/marketplace/seed
- Créé marketplace-panel.tsx — grille de modules, catégories, toggle, essai gratuit

**Auto-Audit (après corrections):**
| Route | Auth | Rate Limit | Zod | Status |
|-------|:----:|:----------:|:---:|:------:|
| marketplace/route (GET+POST) | ✅ | ✅ | ✅ | PASS |
| marketplace/[id]/route (PUT+DELETE) | ✅ | ✅ | ✅ | PASS |
| marketplace/seed/route (POST) | ✅ | ✅ | ✅ | PASS (fix: ajout auth) |

---

## Task ID: P3-3 — Portail Client

**Agent:** Subagent full-stack-developer

**Work Log:**
- Créé `portal/portal-token.ts` — HMAC-SHA256 token generation + timing-safe verification
- Créé 6 routes API : POST /api/portal/invite, GET /api/portal/[projectId]/[token], POST .../comment, GET .../comments, GET /api/portal/invites, DELETE /api/portal/invites/[inviteId]
- Routes publiques vérifiées via token (pas requireAuth)
- Envoi email via Resend quand RESEND_API_KEY configuré
- Créé portal-viewer.tsx (client-facing, light theme, lecture seule)
- Créé invite-manager.tsx (freelance-facing, CRUD + copy-link + stats)

**Auto-Audit (après corrections):**
| Route | Type | Auth/Token | Rate Limit | Zod | Status |
|-------|------|:----------:|:----------:|:---:|:------:|
| portal/invite (POST) | Protected | ✅ requireAuth | ✅ | ✅ | PASS |
| portal/[projectId]/[token] (GET) | PUBLIC | ✅ verifyPortalToken | ✅ (fix: ajout) | ✅ | PASS |
| portal/.../comment (POST) | PUBLIC | ✅ verifyPortalToken | ✅ | ✅ | PASS |
| portal/.../comments (GET) | PUBLIC | ✅ verifyPortalToken | ✅ (fix: ajout) | ✅ | PASS |
| portal/invites (GET) | Protected | ✅ | ✅ | ✅ | PASS |
| portal/invites/[inviteId] (DELETE) | Protected | ✅ | ✅ | ✅ | PASS |

---

## Task ID: P3-4 — Intégrations Externes

**Agent:** Subagent full-stack-developer

**Work Log:**
- Créé `integrations/provider.ts` — Interface IntegrationProvider + registry + 5 stub providers (Slack, Zoom, Drive, GitHub, Notion)
- Créé 4 routes API : POST /api/integrations/connect, POST /api/integrations/disconnect, GET /api/integrations, POST /api/integrations/[provider]/sync
- Créé 1 route webhook : POST /api/webhooks/[provider] (HMAC signature verification)
- Tokens OAuth chiffrés via AES-256-GCM (lib/crypto.ts)
- Créé integration-manager.tsx — grille de providers, connect/disconnect, sync status

**Auto-Audit (après corrections):**
| Route | Auth | Rate Limit | Zod | HMAC Verify | Status |
|-------|:----:|:----------:|:---:|:-----------:|:------:|
| integrations/connect (POST) | ✅ | ✅ | ✅ | N/A | PASS |
| integrations/disconnect (POST) | ✅ | ✅ | ✅ (fix: ajout) | N/A | PASS |
| integrations (GET) | ✅ | ✅ | ✅ | N/A | PASS |
| integrations/[provider]/sync (POST) | ✅ | ✅ | ✅ (fix: ajout) | N/A | PASS |
| webhooks/[provider] (POST) | N/A (public) | ✅ | ✅ (fix: ajout) | ✅ | PASS |

---

## Task ID: P3-5 — Mode Focus Avancé & Pomodoro

**Agent:** Subagent full-stack-developer (2 passes — rebuild complet)

**Work Log:**
- Créé `focus/focus-timer.ts` — Classe FocusTimer avec start/pause/stop, multi-round, Page Visibility
- Créé `focus/ambient-sounds.ts` — Web Audio API, 5 sons procéduraux (rain, forest, cafe, fireplace, white_noise)
- Créé 4 routes API : POST /api/focus/sessions, PUT /api/focus/sessions/[id], GET /api/focus/sessions, GET /api/focus/stats
- Auto-crée TimeEntry quand session focus complétée (lié à task/project)
- Créé focus-overlay.tsx — OVERLAY COMPLET (rebuild depuis stub 38 lignes) :
  - Timer MM:SS + SVG progress ring + Framer Motion
  - Play/Pause/Stop/Skip controls
  - 5 sons ambiants avec volume slider
  - Sélecteur type (Pomodoro/Deep Work/Custom) + sliders custom
  - Task + Project selectors
  - F12 keyboard shortcut
  - Page Visibility API (auto-pause)
  - Browser Notifications (session complète, pause terminée)
  - Stats (aujourd'hui, sessions, streak)
  - Auto-save via API (/api/focus/sessions)

**Auto-Audit:**
| Composant | Timer | Controls | Sons | F12 | Visibility | Notifications | API save |
|-----------|:-----:|:--------:|:----:|:---:|:----------:|:--------------:|:--------:|
| focus-overlay.tsx | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| focus-timer.ts | ✅ Class | ✅ | N/A | N/A | ✅ | N/A | N/A |
| ambient-sounds.ts | N/A | N/A | ✅ 5 sons | N/A | N/A | N/A | N/A |

---

## Task ID: P3-6 — Commandes Vocales

**Agent:** Subagent full-stack-developer (2 passes — ajout confirmation + privacy)

**Work Log:**
- Créé `voice/voice-parser.ts` — 15+ regex French intent rules + param extraction
- Créé `voice/voice-dispatcher.ts` — DispatchAction types + navigation mapping + full pipeline
- Créé 2 routes API : POST /api/voice/log, GET /api/voice/history
- Créé voice-button.tsx — Bouton micro flottant avec :
  - Web Speech API (fr-FR)
  - Retour visuel pulsant
  - **Confirmation dialog** avant exécution (fix: ajouté)
  - **Privacy notice** localStorage (fix: ajouté)
  - **Bouton aide "?"** avec liste des commandes (fix: ajouté)
  - Gestion fallback navigateur
  - Toast feedback après exécution

**Auto-Audit:**
| Critère | Résultat |
|---------|:--------:|
| Web Speech API (fr-FR) | ✅ |
| Visual feedback | ✅ |
| Confirmation dialog | ✅ (fix: ajouté) |
| Privacy notice | ✅ (fix: ajouté) |
| Help button | ✅ (fix: ajouté) |
| 15+ intents parser | ✅ |
| Dispatcher + navigation | ✅ |

---

## Task ID: P3-7 — Auto-Audit Final PRIORITÉ 3

**Compilation TypeScript:**
- 0 erreurs dans les fichiers PRIORITÉ 3
- 20 erreurs pré-existantes (invoices, stripe, auth, etc.) — non liées

**Bugs trouvés et corrigés lors de l'auto-audit:**

| # | Sévérité | Fichier | Bug | Fix |
|---|----------|---------|-----|-----|
| 1 | 🔴 CRITIQUE | marketplace/seed/route.ts | Pas d'auth — endpoint DB ouvert | Ajouté requireAuth() |
| 2 | 🔴 CRITIQUE | portal/[projectId]/[token]/route.ts | Pas de rate limit (route publique) | Ajouté checkRateLimit |
| 3 | 🔴 CRITIQUE | portal/.../comments/route.ts | Pas de rate limit (route publique) | Ajouté checkRateLimit |
| 4 | 🟡 MOYEN | 7 fichiers API | Validation Zod manquante | Ajouté 6 schémas Zod |
| 5 | 🔴 CRITIQUE | focus-overlay.tsx | Stub 38 lignes — pas de timer/controls | Rebuild complet (~500 lignes) |
| 6 | 🟡 MOYEN | voice-button.tsx | Pas de confirmation avant exécution | Ajouté Dialog confirmation |
| 7 | 🟡 MOYEN | voice-button.tsx | Pas de privacy notice | Ajouté localStorage + dialog |
| 8 | 🟡 MOYEN | voice-button.tsx | Pas d'aide commandes | Ajouté bouton "?" + help dialog |

---

## Résumé Final — 5 Fonctionnalités PRIORITÉ 3

| Fonctionnalité | Backend API | Auth/Token | Rate Limit | Zod | UI | Sécurité |
|----------------|:-----------:|:----------:|:----------:|:---:|:--:|:--------:|
| Marketplace & Feature Flags | ✅ 4 routes | ✅ | ✅ | ✅ | ✅ Grid+Toggle | ✅ Entitlement checker |
| Portail Client | ✅ 6 routes | ✅ HMAC tokens | ✅ | ✅ | ✅ Viewer+Manager | ✅ Isolation stricte |
| Intégrations Externes | ✅ 5 routes | ✅+HMAC webhooks | ✅ | ✅ | ✅ Manager+Cards | ✅ AES-256-GCM tokens |
| Mode Focus & Pomodoro | ✅ 4 routes | ✅ | ✅ | ✅ | ✅ Overlay complet | ✅ Auto TimeEntry |
| Commandes Vocales | ✅ 2 routes | ✅ | ✅ | ✅ | ✅ Button+Dialogs | ✅ Local only, privacy |

### Fichiers créés/modifiés PRIORITÉ 3:

**Prisma (1):** schema.prisma — 7 modèles ajoutés

**API Routes (19):**
- marketplace/route.ts, marketplace/[id]/route.ts, marketplace/seed/route.ts
- portal/invite/route.ts, portal/[projectId]/[token]/route.ts, portal/[projectId]/[token]/comment/route.ts, portal/[projectId]/[token]/comments/route.ts, portal/invites/route.ts, portal/invites/[inviteId]/route.ts
- integrations/route.ts, integrations/[provider]/route.ts, integrations/connect/route.ts, integrations/disconnect/route.ts
- webhooks/[provider]/route.ts
- focus/sessions/route.ts, focus/sessions/[id]/route.ts, focus/stats/route.ts
- voice/log/route.ts, voice/history/route.ts

**Features (10):**
- marketplace/entitlement.ts, marketplace/marketplace-panel.tsx
- portal/portal-token.ts, portal/portal-viewer.tsx, portal/invite-manager.tsx
- integrations/provider.ts, integrations/integration-manager.tsx
- focus/focus-timer.ts, focus/ambient-sounds.ts, focus/focus-overlay.tsx
- voice/voice-parser.ts, voice/voice-dispatcher.ts, voice/voice-button.tsx

**Validation (1):** lib/validations/differentiation.ts — 12+ schémas Zod

### Configuration additionnelle requise:
- `PORTAL_SECRET` — secret pour signer les tokens portail (défaut: NEXTAUTH_SECRET)
- `RESEND_API_KEY` — pour emails d'invitation portail
- `INTEGRATION_SLACK_CLIENT_ID/SECRET` — OAuth Slack
- `INTEGRATION_ZOOM_CLIENT_ID/SECRET` — OAuth Zoom
- `INTEGRATION_GITHUB_CLIENT_ID/SECRET` — OAuth GitHub
- `INTEGRATION_NOTION_CLIENT_ID/SECRET` — OAuth Notion
- `INTEGRATION_GOOGLE_DRIVE_CLIENT_ID/SECRET` — OAuth Google Drive

---

# PRIORITÉ 5 — Sécurité & Conformité : Worklog

## Session: 2026-04-28 (suite)

---

## Task ID: 3 — Prisma Schema PRIORITÉ 5 (10 nouveaux modèles + 2 modifications)

**Agent:** Main Agent (Task 3)

**Work Log:**
- Ajouté 5 relations inverses au modèle `User` existant : `backupCodes BackupCode[]`, `consentLogs ConsentLog[]`, `gdprRequests GdprRequest[]`, `deletionSchedule GdprDeletionSchedule[]`, `dpoContacts DpoContact[]`
- Modifié `TeamMember` : ajouté `roleId String?` et `roleRef Role? @relation(fields: [roleId], references: [id], onDelete: SetNull)` pour la relation RBAC
- Ajouté 10 nouveaux modèles Prisma pour la sécurité et conformité :
  1. **BackupCode** — Codes de secours 2FA (single-use, bcrypt hash, index userId+usedAt)
  2. **ConsentLog** — Journal des consentements GDPR (consentType, action, version, IP, userAgent)
  3. **GdprRequest** — Demandes export/suppression GDPR (status pipeline, filePath, fileSize, expiresAt)
  4. **GdprDeletionSchedule** — Période de grâce suppression (30 jours, double confirmation, @unique userId)
  5. **EncryptionKey** — Registre des clés de chiffrement (version @unique, rotation, keyHash)
  6. **SecurityAlert** — Détection comportement anomal (severity, type, résolution, metadata JSON)
  7. **Permission** — Permissions granulaires RBAC (slug @unique, resource+action @@unique)
  8. **Role** — Rôles hiérarchiques RBAC (slug @unique, level, isDefault, teamMembers[])
  9. **RolePermission** — Junction Role↔Permission (@@unique [roleId, permissionId])
  10. **DpoContact** — Communications DPO (userId optionnel car non-user peut contacter, status pipeline)
- Fix: DpoContact.userId est `String?` avec `user User? @relation(... onDelete: SetNull)` car un non-utilisateur peut soumettre une demande DPO
- `bun run db:push` exécuté avec succès ✅

**Auto-Audit:**
| Model | Created | Indexes | Relations | Unique constraints | Notes |
|-------|:-------:|:-------:|:---------:|:------------------:|-------|
| BackupCode | ✅ | userId+usedAt | User (cascade) | — | bcrypt hash |
| ConsentLog | ✅ | userId+consentType, createdAt | User (cascade) | — | GDPR consent tracking |
| GdprRequest | ✅ | userId+status, status+requestedAt, expiresAt | User (cascade) | — | Export/delete pipeline |
| GdprDeletionSchedule | ✅ | gracePeriodEnd, status | User (cascade) | userId @unique | 30-day grace period |
| EncryptionKey | ✅ | activeFrom, activeUntil | — | version @unique | Key rotation registry |
| SecurityAlert | ✅ | userId+status, type+severity, status+createdAt, teamId | — | — | Anomaly detection |
| Permission | ✅ | resource, action | RolePermission[] | slug @unique, resource+action @@unique | Granular RBAC |
| Role | ✅ | slug, level | RolePermission[], TeamMember[] | slug @unique | Hierarchical roles |
| RolePermission | ✅ | — | Role, Permission | roleId+permissionId @@unique | Junction table |
| DpoContact | ✅ | status, createdAt | User? (SetNull) | — | Non-user compatible |

**Modifications to existing models:**
| Model | Change | Type |
|-------|--------|------|
| User | +5 relations (backupCodes, consentLogs, gdprRequests, deletionSchedule, dpoContacts) | New fields |
| TeamMember | +roleId (String?), +roleRef (Role?, SetNull) | New fields + relation |

---

## Task ID: 4-a — 2FA TOTP & Backup Codes Backend

**Agent:** Task 4-a Agent

**Work Log:**
- Créé `features/security/two-factor/totp.ts` — 4 fonctions TOTP (generateSecret, verify, generateQRCode, generateBackupCodes)
  - Codes de secours : 8 caractères alphanumériques format XXXX-XXXX, charset sans ambiguïté (pas 0/O/1/I/l)
  - QR code : base64 data URL 256px
- Créé `features/security/audit/logger.ts` — createAuditLog() pour AuditLog table
- Créé `features/security/two-factor/service.ts` — 5 fonctions service 2FA :
  - `setup2FA` — Génère secret, chiffre (AES-256-GCM), stocke dans user.twoFactorSecret, retourne QR + backup codes (n'active PAS)
  - `enable2FA` — Vérifie premier token TOTP, active 2FA, hash backup codes (bcrypt), invalide sessions, audit log
  - `disable2FA` — Vérifie TOTP OU backup code, désactive, efface secret, supprime codes, audit log
  - `verify2FAToken` — Vérifie TOTP ou backup code (single-use), retourne boolean
  - `regenerateBackupCodes` — TOTP uniquement (pas backup code), génère nouveaux codes, supprime anciens, audit log
- Créé 5 routes API (toutes avec requireAuth + rate limit 5/15min) :
  - POST `/api/security/2fa/setup` — Setup 2FA
  - POST `/api/security/2fa/enable` — Activer 2FA avec token
  - POST `/api/security/2fa/disable` — Désactiver 2FA avec token
  - POST `/api/security/2fa/verify` — Vérifier token → { valid }
  - POST `/api/security/2fa/backup-codes` — Régénérer codes de secours avec token TOTP

**Auto-Audit:**
| File | Auth | Rate Limit | Input Validation | Audit Log | Encryption | Status |
|------|:----:|:----------:|:----------------:|:---------:|:----------:|:------:|
| totp.ts | N/A | N/A | N/A | N/A | N/A | ✅ PASS |
| audit/logger.ts | N/A | N/A | N/A | N/A | N/A | ✅ PASS |
| service.ts | N/A | N/A | ✅ | ✅ | ✅ AES-256-GCM + bcrypt | ✅ PASS |
| 2fa/setup/route.ts | ✅ | ✅ 5/15min | ✅ | ✅ | N/A | ✅ PASS |
| 2fa/enable/route.ts | ✅ | ✅ 5/15min | ✅ token | ✅ | N/A | ✅ PASS |
| 2fa/disable/route.ts | ✅ | ✅ 5/15min | ✅ token | ✅ | N/A | ✅ PASS |
| 2fa/verify/route.ts | ✅ | ✅ 5/15min | ✅ token | N/A | ✅ PASS | ✅ PASS |
| 2fa/backup-codes/route.ts | ✅ | ✅ 5/15min | ✅ token | ✅ | N/A | ✅ PASS |

**Lint:** 0 erreurs dans les nouveaux fichiers ✅

---

## Task ID: 5-a — Data Encryption Service & API

**Agent:** Task 5-a-5-b Agent

**Work Log:**
- Créé `features/security/encryption/service.ts` — Service de chiffrement avec rotation de clés
  - `encryptField(plaintext)` — Chiffrement AES-256-GCM avec préfixe version (`v{version}:{base64}`)
  - `decryptField(encrypted)` — Déchiffrement sensible à la version (support rotation de clés)
  - `rotateEncryptionKey(adminUserId)` — Crée nouvelle version, marque l'ancienne expirée
  - `getEncryptionStatus()` — Retourne version courante, total clés, dernière rotation
  - Cache mémoire des clés dérivées (Map<version, Buffer>) pour performance
  - Dérivation de clés via scryptSync avec salts spécifiques à chaque version
  - Seuls les hashes SHA-256 des clés sont stockés en DB (jamais les clés elles-mêmes)
  - Format versionné permet la rotation progressive (anciens champs déchiffrables avec ancienne version)
- Créé `app/api/security/encryption/status/route.ts` — GET: statut des clés de chiffrement (superadmin only)
- Créé `app/api/security/encryption/rotate/route.ts` — POST: rotation de clé (superadmin only, 2/heure)
  - Double log : AuditLog + SuperAdminAuditLog
  - Validation Zod (reason optionnel)
- Créé `lib/validations/security.ts` — Schémas Zod pour toutes les routes sécurité/conformité (8 schemas)
  - gdprExportQuerySchema, gdprDeleteRequestSchema, gdprDeleteConfirmSchema
  - gdprCancelSchema, consentUpdateSchema, dpoContactSchema, dpoContactQuerySchema, encryptionRotateSchema

**Auto-Audit:**
| Route | Method | Auth | Rate Limit | Zod | Audit Log | Status |
|-------|--------|:----:|:----------:|:---:|:---------:|:------:|
| encryption/status | GET | ✅ superAdmin | ✅ 100/min | N/A | ✅ | PASS |
| encryption/rotate | POST | ✅ superAdmin | ✅ 2/hr | ✅ | ✅ double-log | PASS |

---

## Task ID: 5-b — RGPD/Compliance & Consent Service & API

**Agent:** Task 5-a-5-b Agent

**Work Log:**
- Créé `features/security/gdpr/service.ts` — Service GDPR complet (7 fonctions exportées)
  - `exportUserData(userId)` — Collecte données de 21 tables, JSON structuré (Art. 15 & 20)
    - Exclusion des données sensibles : passwordHash, twoFactorSecret, accessToken, refreshToken, fileUrl, body
    - Création d'un GdprRequest + audit log
  - `requestAccountDeletion(userId, ipAddress)` — Crée planning 30 jours, anonymise email immédiatement (Art. 17)
    - Email original stocké dans GdprRequest.metadata pour restauration potentielle
    - Email anonymisé = `anonymized_{userId}@burofree.anonymized` (empêche connexion)
  - `confirmAccountDeletion(userId)` — Double confirmation, passe status='confirmed'
  - `cancelAccountDeletion(userId)` — Annulation dans période de grâce, restaure email
  - `executePendingDeletions()` — Appelé par cron, anonymise tout pour les plannings passés+confirmés
    - `anonymizeUserData()` interne : remplace PII par valeurs anonymisées, supprime tokens/sessions/codes
  - `logConsent(userId, consentType, action, ipAddress, userAgent)` — Journal append-only (Art. 7)
    - Types valides : analytics, functional, marketing, essential
    - Actions valides : granted, revoked, updated
  - `getUserConsents(userId)` — Retourne état actuel par type (dernière action)
  - `getDeletionSchedule(userId)` — Helper pour le planning courant
- Mis à jour `features/security/audit/logger.ts` — Ajouté `getClientIp()` et `getUserAgent()` helpers
- Créé 5 routes API :
  - GET `/api/gdpr/export` — Export JSON téléchargeable (auth + 1/jour rate limit)
  - POST `/api/gdpr/delete` — Demande suppression (auth)
  - DELETE `/api/gdpr/delete` — Confirmation suppression avec `{ confirmed: true }` (auth + Zod)
  - POST `/api/gdpr/cancel` — Annulation suppression (auth)
  - GET `/api/consent` — Préférences consentement (auth)
  - POST `/api/consent` — Mise à jour consentements (auth + Zod)
  - POST `/api/dpo/contact` — Contact DPO (public, 5/hr rate limit + Zod)
  - GET `/api/dpo/contact` — Liste demandes DPO (superadmin only + Zod query)

**Auto-Audit:**
| Route | Method | Auth | Rate Limit | Zod | Audit Log | Status |
|-------|--------|:----:|:----------:|:---:|:---------:|:------:|
| gdpr/export | GET | ✅ requireAuth | ✅ 1/day | N/A | ✅ (service) | PASS |
| gdpr/delete | POST | ✅ requireAuth | ✅ 100/min | N/A | ✅ (service) | PASS |
| gdpr/delete | DELETE | ✅ requireAuth | ✅ 100/min | ✅ confirmed | ✅ (service) | PASS |
| gdpr/cancel | POST | ✅ requireAuth | ✅ 100/min | N/A | ✅ (service) | PASS |
| consent | GET | ✅ requireAuth | ✅ 100/min | N/A | N/A | PASS |
| consent | POST | ✅ requireAuth | ✅ 100/min | ✅ | ✅ (service) | PASS |
| dpo/contact | POST | ❌ public | ✅ 5/hr | ✅ | ✅ (if user) | PASS |
| dpo/contact | GET | ✅ superAdmin | ✅ 100/min | ✅ query | ✅ | PASS |

**Lint:** 0 erreurs dans les nouveaux fichiers ✅

---

### Fichiers créés PRIORITÉ 5 (Feature 2 + Feature 3) :

**Services (3):**
- features/security/encryption/service.ts
- features/security/gdpr/service.ts
- features/security/audit/logger.ts (mis à jour)

**API Routes (7):**
- api/security/encryption/status/route.ts
- api/security/encryption/rotate/route.ts
- api/gdpr/export/route.ts
- api/gdpr/delete/route.ts
- api/gdpr/cancel/route.ts
- api/consent/route.ts
- api/dpo/contact/route.ts

**Validation (1):** lib/validations/security.ts — 8 schémas Zod

---

## Task ID: 6-a-7-a — Audit Logs & RBAC Permissions Backend

**Agent:** Task 6-a-7-a Agent

**Work Log:**

### Feature 4: Audit Logs & Traceability

- Créé `features/security/audit/enhanced-logger.ts` — Système d'audit logging avancé
  - `logAudit(entry)` — Crée une entrée AuditLog dans la DB
  - `queryAuditLogs(params)` — Requête avec filtres (userId, teamId, action, target, dates) + pagination
  - `detectAnomalies(userId, action, ip)` — Détection comportement anomal :
    - Login depuis ≥ 3 IPs en 1h → alerte haute sévérité
    - ≥ 5 exports en 1h → alerte moyenne sévérité
    - ≥ 10 suppressions en 1h → alerte haute sévérité
  - Types : `AuditAction` (35+ actions), `AuditLogEntry`, `QueryAuditLogsParams`, `QueryAuditLogsResult`
- Créé `features/security/audit/logger.ts` — Module de compatibilité
  - Re-exporte `logAudit` comme `createAuditLog` (backward compat avec two-factor/service.ts)
  - Ajoute `logSecurityAction()` (alias pour logAudit, utilisé par GDPR/encryption)
  - Ajoute `getClientIp(req)` et `getUserAgent(req)` helpers (utilisés par consent/DPO/GDPR routes)
  - Résout les erreurs TypeScript pré-existantes : 8 imports de `createAuditLog`, `logSecurityAction`, `getClientIp`, `getUserAgent`
- Créé `app/api/audit-logs/route.ts` — GET: requête logs audit
  - Filtrage : userId, teamId, action, target, startDate, endDate, page, limit
  - Validation Zod complète
  - Contrôle d'accès : admins voient tous les logs, utilisateurs réguliers voient uniquement les leurs
- Créé `app/api/security/alerts/route.ts` — GET + POST
  - GET: Liste alertes de sécurité (admin only) avec filtres (status, severity, type) + pagination
  - POST: Acquitter/résoudre/faux positif (body: { alertId, action: 'acknowledge'|'resolve'|'false_positive' })

### Feature 5: RBAC Granular Permissions

- Créé `features/security/rbac/permissions.ts` — Définition centralisée des permissions
  - 36 permissions sur 10 ressources : task, project, invoice, email, document, time, team, billing, settings, data
  - Chaque permission : `{ resource, action, description }` en français
  - Type `PermissionSlug` pour validation TypeScript
- Créé `features/security/rbac/checker.ts` — Système de vérification des permissions
  - `hasPermission(userId, permissionSlug, teamId?)` — Vérification avec cache mémoire
  - `loadUserPermissions(userId, teamId?)` — Charge permissions depuis :
    1. Superadmin → toutes les permissions
    2. Role via team membership (roleRef)
    3. Role par défaut (isDefault)
    4. Owner (rôle dénormalisé) → toutes les permissions
  - `invalidatePermissionCache(userId)` — Invalidation quand rôles changent
  - `requirePermission(userId, permissionSlug, teamId?)` — Alias qui retourne boolean
  - `getUserPermissions(userId, teamId?)` — Retourne Set complet pour UI
- Créé `features/security/rbac/seed.ts` — Fonction de seeding idempotente
  - 6 rôles par défaut : SuperAdmin (100), Owner (80), Admin (60), Member (40, défaut), Viewer (20), Guest (10)
  - Upsert permissions + rôles + assignations (supprime aussi les permissions retirées)
  - Retourne résumé : counts + détails par rôle
- Créé `app/api/roles/route.ts` — GET + POST
  - GET: Liste tous les rôles avec permissions et nombre de membres
  - POST: Crée rôle personnalisé (admin only, validation Zod : slug regex, nom, niveau max 99, permission slugs)
- Créé `app/api/roles/[id]/route.ts` — GET + PUT + DELETE
  - GET: Détails rôle avec permissions et compte membres
  - PUT: Mise à jour rôle (nom, description, niveau, addPermissions, removePermissions) + invalidation cache
  - DELETE: Suppression rôle personnalisé (impossible pour rôles par défaut, vérifie assignations avant suppression)
- Créé `app/api/roles/seed/route.ts` — POST
  - Seeding des rôles/permissions par défaut (superadmin only, idempotent)
- Créé `app/api/roles/check/route.ts` — POST
  - Vérification permission pour utilisateur courant (body: { permission, teamId? })
- Créé `app/api/roles/assign/route.ts` — POST
  - Assigne rôle à membre d'équipe (admin only, body: { userId, roleId, teamId })
  - Invalidation cache + audit log (action: role.assign)

**Auto-Audit:**

| Route | Method | Auth | Rate Limit | Zod | Audit Log | Access Control |
|-------|--------|:----:|:----------:|:---:|:---------:|:--------------:|
| audit-logs | GET | ✅ | ✅ 100/min | ✅ | N/A | ✅ admin=all, user=own |
| security/alerts | GET | ✅ admin | ✅ 100/min | ✅ | N/A | ✅ |
| security/alerts | POST | ✅ admin | ✅ 100/min | ✅ | N/A | ✅ |
| roles | GET | ✅ | ✅ 100/min | N/A | N/A | ✅ |
| roles | POST | ✅ admin | ✅ 100/min | ✅ | N/A | ✅ |
| roles/[id] | GET | ✅ | ✅ 100/min | N/A | N/A | ✅ |
| roles/[id] | PUT | ✅ admin | ✅ 100/min | ✅ | N/A | ✅ + cache invalidation |
| roles/[id] | DELETE | ✅ admin | ✅ 100/min | N/A | N/A | ✅ no default + no members |
| roles/seed | POST | ✅ superadmin | ✅ 100/min | N/A | N/A | ✅ |
| roles/check | POST | ✅ | ✅ 100/min | ✅ | N/A | ✅ |
| roles/assign | POST | ✅ admin | ✅ 100/min | ✅ | ✅ role.assign | ✅ + cache invalidation |

**Lint:** 0 erreurs dans les nouveaux fichiers ✅
**TypeScript:** 0 erreurs dans les nouveaux fichiers ✅ (résout aussi 8 erreurs pré-existantes dans two-factor, gdpr, consent, dpo, encryption routes)

### Fichiers créés (11):

**Feature Modules (5):**
- features/security/audit/enhanced-logger.ts — Audit logging avancé + détection anomalies
- features/security/audit/logger.ts — Compatibilité (createAuditLog, logSecurityAction, getClientIp, getUserAgent)
- features/security/rbac/permissions.ts — 36 permissions sur 10 ressources
- features/security/rbac/checker.ts — Vérification permissions avec cache mémoire
- features/security/rbac/seed.ts — Seeding idempotent 6 rôles + 36 permissions

**API Routes (6):**
- app/api/audit-logs/route.ts — GET
- app/api/security/alerts/route.ts — GET + POST
- app/api/roles/route.ts — GET + POST
- app/api/roles/[id]/route.ts — GET + PUT + DELETE
- app/api/roles/seed/route.ts — POST
- app/api/roles/check/route.ts — POST
- app/api/roles/assign/route.ts — POST

---

## Task ID: 5-c — GDPR/Consent Frontend Components

**Agent:** Task 5-c Agent

**Work Log:**

### 1. consent-banner.tsx — GDPR/CCPA Cookie Consent Banner

- Créé `features/security/components/consent-banner.tsx` — Banner de consentement cookies conforme CNIL
  - Apparaît au premier visit (vérifie localStorage `burofree-consent`)
  - Options granulaires : Accepter tout, Refuser non-essentiels, Personnaliser
  - Panneau de personnalisation : switches pour analytics, functional, marketing
  - Stocke consentement dans localStorage + synchronise avec POST /api/consent
  - Custom hook `useInitialConsent()` pour éviter `setState` dans un effect (React Compiler compliant)
  - Animation slide-up avec framer-motion + `useReducedMotion`
  - Compact sur mobile, plus large sur desktop
  - Accessible : `role="dialog"`, `aria-label`, `aria-modal="false"`

### 2. dpo-contact-form.tsx — DPO Contact Form

- Créé `features/security/components/dpo-contact-form.tsx` — Formulaire de contact DPO
  - Champs : name, email, subject, message
  - Validation côté client (matching Zod schema : min/max lengths, email format)
  - Submit to POST /api/dpo/contact (endpoint public)
  - Feedback succès : card verte avec confirmation + bouton "Envoyer une autre demande"
  - Feedback erreur : toast sonner avec messages spécifiques (429, 400, 500)
  - Loading state avec spinner
  - Character counter pour le message (max 5000)
  - Props optionnels `defaultName` / `defaultEmail` pour pré-remplir si utilisateur connecté

### 3. gdpr-panel.tsx — GDPR Data Management Panel

- Créé `features/security/components/gdpr-panel.tsx` — Panel de gestion RGPD pour settings
  - **Section 1: Gestion des consentements** — Toggle switches pour chaque type (essential/analytics/functional/marketing) avec état courant chargé depuis GET /api/consent, mise à jour optimistic + rollback via POST /api/consent, loading skeletons, badges "Requis"/"Actif"
  - **Section 2: Export de données** — Bouton export JSON téléchargeable via GET /api/gdpr/export, date du dernier export, avertissement limite 1/jour
  - **Section 3: Suppression du compte** — Zone danger (Card border-red), flow complet :
    - Demande → POST /api/gdpr/delete (AlertDialog de confirmation)
    - Confirmation → DELETE /api/gdpr/delete avec `{ confirmed: true }` (AlertDialog double)
    - Annulation → POST /api/gdpr/cancel (AlertDialog de confirmation)
    - Badges de statut (pending/confirmed/cancelled/executed) avec couleurs
    - Affichage période de grâce (30 jours)
  - **Section 4: Contact DPO** — Intègre le composant DpoContactForm
  - Animations staggered avec framer-motion `sectionVariants`

**Auto-Audit:**

| Composant | API Endpoints Wired | Loading States | Error Handling | Optimistic Updates | Accessible | Status |
|-----------|:-------------------:|:--------------:|:--------------:|:------------------:|:----------:|:------:|
| consent-banner | POST /api/consent | ✅ saving spinner | ✅ console.error | N/A | ✅ role=dialog | PASS |
| dpo-contact-form | POST /api/dpo/contact | ✅ spinner | ✅ toast 429/400/500 | N/A | ✅ labels | PASS |
| gdpr-panel (consent) | GET+POST /api/consent | ✅ skeleton | ✅ toast + rollback | ✅ | ✅ aria-label | PASS |
| gdpr-panel (export) | GET /api/gdpr/export | ✅ spinner | ✅ toast | N/A | ✅ | PASS |
| gdpr-panel (delete) | POST+DELETE /api/gdpr/delete | ✅ per-action | ✅ toast | N/A | ✅ AlertDialog | PASS |
| gdpr-panel (cancel) | POST /api/gdpr/cancel | ✅ spinner | ✅ toast | N/A | ✅ AlertDialog | PASS |
| gdpr-panel (dpo) | Via DpoContactForm | ✅ | ✅ | N/A | ✅ | PASS |

**Lint:** 0 erreurs dans les 3 nouveaux fichiers ✅ (fix: useInitialConsent hook pour éviter react-hooks/set-state-in-effect)

### Fichiers créés (3):

- `features/security/components/consent-banner.tsx` — Banner de consentement cookies GDPR/CCPA
- `features/security/components/dpo-contact-form.tsx` — Formulaire de contact DPO
- `features/security/components/gdpr-panel.tsx` — Panel de gestion RGPD (4 sections)
