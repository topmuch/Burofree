# 🔒 AUDIT TECHNIQUE EXHAUSTIF — Burozen (Maellis)

**Date :** 2025-07-11  
**Auditeur :** Lead Dev & Architecte QA  
**Scope :** Codebase complète — 180+ API routes, 17 modules fonctionnels, 35+ fichiers sécurité critiques  
**Stack auditée :** Next.js 16.1.3 (Turbopack), TypeScript 5, Tailwind 4, Prisma 6, NextAuth 4, BullMQ, Redis, SQLite (local) / PostgreSQL (Docker)  

---

## 1. TABLEAU SYNTHÉTIQUE GLOBAL

| # | Axe | Statut | Score | Résumé |
|---|-----|--------|-------|--------|
| 1 | **Complétude fonctionnelle** | ⚠️ | **85%** | 10/12 modules fully implémentés. Workflows : 4/7 actions sont des stubs `console.log`. |
| 2 | **Architecture & qualité code** | ⚠️ | **55%** | Feature isolation excellente, mais god store 1350 lignes, `noImplicitAny: false`, SPA dans App Router. |
| 3 | **Sécurité & conformité** | 🔴 | **40%** | 4 vulnérabilités CRITIQUES (auto-creation compte, impersonation end sans auth, rate-limiting in-memory, 2FA non enforced). |
| 4 | **Performance & scalabilité** | 🔴 | **35%** | SQLite vs PostgreSQL mismatch bloquant. ~15 models sans index `userId`. Analytics sans cache. Workers jamais démarrés. |
| 5 | **Tests & CI/CD** | ❌ | **5%** | Zéro test, zéro CI/CD, zéro README, zéro .env.example. |
| 6 | **Intégrations & externes** | ⚠️ | **70%** | Stripe webhooks + idempotency OK. OAuth refresh OK. Groq/zai fallback OK. Workers jamais lancés. |
| 7 | **Documentation & handover** | ❌ | **10%** | Aucun README, aucun .env.example, aucun runbook, aucun schéma d'architecture. |

**Score global de maturité production : ~38/100 — NON PRÊT POUR LA PRODUCTION**

---

## 2. BLOQUANTS PRODUCTION (Priorité P0 — Doit être résolu AVANT tout déploiement)

### 🔴 P0-1 : Auto-création de compte sans mot de passe
- **Fichier :** `src/app/api/auth/[...nextauth]/route.ts` → `authorize()`, L174-179
- **Impact :** N'importe qui peut créer un compte avec n'importe quel email en envoyant `{"email":"victim@example.com","password":""}`
- **Fix :** Supprimer le code de création passwordless. Exiger un mot de passe pour toute inscription credentials.

### 🔴 P0-2 : Endpoint impersonation/end sans authentification
- **Fichier :** `src/app/api/superadmin/impersonation/end/route.ts`
- **Impact :** N'importe quel utilisateur non authentifié peut terminer une session d'impersonation active
- **Fix :** Ajouter `requireAuth()` + vérifier que l'appelant est l'admin initiateur

### 🔴 P0-3 : Rate-limiting en mémoire (inopérant en production)
- **Fichier :** `src/lib/rate-limit.ts` — `Map<string, RateLimitEntry>()`
- **Impact :** En multi-instance/serveurless, le rate limiting est contournable. Brute-force possible.
- **Fix :** Migrer vers Redis `INCR` + `EXPIRE` (module `redis.ts` déjà existant)

### 🔴 P0-4 : 2FA défini mais jamais enforced dans le middleware
- **Fichier :** `src/middleware.ts` — `TWO_FA_REQUIRED_ROUTES` (L30-35) jamais vérifié
- **Impact :** Les opérations sensibles (rotation clé, suppression GDPR, export) sont accessibles sans 2FA
- **Fix :** Ajouter la vérification 2FA dans le middleware pour les routes listées

### 🔴 P0-5 : SQLite en schema.prisma vs PostgreSQL dans docker-compose
- **Fichier :** `prisma/schema.prisma:6` → `provider = "sqlite"` vs `docker-compose.yml:8` → `postgresql://...`
- **Impact :** Le déploiement Docker est impossible. Les queries Prisma génèrent du SQL SQLite incompatible.
- **Fix :** `provider = "postgresql"` + `url = env("DATABASE_URL")` + `prisma migrate dev`

### 🔴 P0-6 : ~15 models sans index sur `userId`
- **Fichier :** `prisma/schema.prisma` — Task, Invoice, Email, TimeEntry, Reminder, Notification, CalendarEvent, Document, ChatMessage, Snippet, WeeklyGoal, Template, AutomationLog
- **Impact :** Full table scan sur chaque query `WHERE userId = ?`. Performance dégrade linéairement.
- **Fix :** Ajouter `@@index([userId])` à chaque model + indexes composites `[userId, status]`, `[userId, createdAt]`

### 🔴 P0-7 : docker-compose.prod.yml sans Redis
- **Fichier :** `docker-compose.prod.yml`
- **Impact :** BullMQ crash au démarrage. Aucun job de fond ne fonctionne (emails, workflows, backups).
- **Fix :** Ajouter le service Redis + `REDIS_URL` dans l'environnement de l'app

### 🔴 P0-8 : Zéro test, zéro CI/CD
- **Impact :** Toute modification peut casser la production sans détection.
- **Fix :** Setup Vitest + Testing Library pour les composants critiques + API routes. Ajouter GitHub Actions.

### 🔴 P0-9 : Secrets hardcodés en fallback
- **Fichiers :** `src/lib/crypto.ts:21`, `src/lib/jwt-simple.ts:17`, `src/lib/invoice-token.ts:19`, `src/features/security/encryption/service.ts:31`, `src/lib/stripe.ts:13`
- **Impact :** Si `NODE_ENV` est non-production (staging, preview, test), tous les secrets crypto sont publics.
- **Fix :** Throw au démarrage si un secret requis est manquant, quel que soit l'environnement.

---

## 3. CHECKLIST DE FINITION

### Sécurité (3-5 jours)

| # | Action | Commande/Fichier | Effort |
|---|--------|------------------|--------|
| S1 | Supprimer l'auto-creation passwordless | `src/app/api/auth/[...nextauth]/route.ts` | 30 min |
| S2 | Auth sur impersonation/end | `src/app/api/superadmin/impersonation/end/route.ts` | 15 min |
| S3 | Migrer rate-limit vers Redis | `src/lib/rate-limit.ts` | 2h |
| S4 | Enforce 2FA dans middleware | `src/middleware.ts` | 2h |
| S5 | Renforcer CSP (retirer unsafe-eval) | `next.config.ts:30` | 4h |
| S6 | Corriger la policy password (min 8, complexité) | `src/app/api/auth/[...nextauth]/route.ts` | 1h |
| S7 | Supprimer les fallback secrets | `crypto.ts`, `jwt-simple.ts`, `invoice-token.ts`, `stripe.ts` | 1h |
| S8 | Corriger l'escalade RBAC cross-team | `src/features/security/rbac/checker.ts:93-118` | 3h |
| S9 | Consolider en 1 seul module de chiffrement | Supprimer `src/lib/crypto.ts`, tout router via `encryption/service.ts` | 4h |
| S10 | Ajouter TTL au cache permissions RBAC | `src/features/security/rbac/checker.ts` | 1h |
| S11 | Vérifier DB status impersonation dans verifyToken | `src/features/superadmin/utils/impersonation.ts:84-95` | 1h |

### Base de données & Performance (2-3 jours)

| # | Action | Commande/Fichier | Effort |
|---|--------|------------------|--------|
| D1 | Switch provider PostgreSQL | `prisma/schema.prisma` → `provider = "postgresql"` | 30 min |
| D2 | Générer migrations | `bunx prisma migrate dev --name init` | 1h |
| D3 | Ajouter @@index([userId]) sur 15 models | `prisma/schema.prisma` | 2h |
| D4 | Ajouter indexes composites | `@@index([userId, status])`, `@@index([userId, createdAt])` | 2h |
| D5 | Ajouter dates bounds aux queries analytics | `src/app/api/analytics/overview/route.ts` | 1h |
| D6 | Activer le cache Redis pour analytics | `src/features/crm/services/analytics-service.ts` | 3h |
| D7 | Rendre l'export asynchrone via BullMQ | `src/app/api/export/route.ts` | 4h |
| D8 | Wire up startWorkers() | Créer `src/instrumentation.ts` | 30 min |

### Architecture & Code (3-5 jours)

| # | Action | Fichier | Effort |
|---|--------|---------|--------|
| A1 | `noImplicitAny: true` dans tsconfig | `tsconfig.json` | 1 jour (fix all errors) |
| A2 | Split store.ts en domain stores | `src/lib/store.ts` (1350 lignes) | 3 jours |
| A3 | Extraire API client générique | Créer `src/lib/api-client.ts` | 1 jour |
| A4 | Code-splitting panels avec dynamic() | `src/app/app/page.tsx` | 4h |
| A5 | DRY AI providers (prompts partagés) | `src/lib/ai/groq.ts` + `zai.ts` | 4h |
| A6 | Utiliser Zod dans toutes les API routes | Tous les `src/app/api/*/route.ts` | 2 jours |
| A7 | Retirer `next-intl` si non utilisé | `package.json` | 15 min |
| A8 | Supprimer `tls: rejectUnauthorized: false` | `src/lib/pdf-generator.ts:92` | 5 min |

### Workflows (1-2 jours)

| # | Action | Fichier | Effort |
|---|--------|---------|--------|
| W1 | Implémenter action `email.send` | `src/features/automation/services/workflow-engine.ts` | 3h |
| W2 | Implémenter action `webhook.call` | idem | 2h |
| W3 | Implémenter action `ai.generate_reply` | idem | 2h |
| W4 | Implémenter action `assign.to` | idem | 2h |

### Tests & CI/CD (3-5 jours)

| # | Action | Fichier | Effort |
|---|--------|---------|--------|
| T1 | Installer Vitest + Testing Library | `package.json` | 1h |
| T2 | Tests unitaires auth (login, register, 2FA) | `src/__tests__/auth/` | 1 jour |
| T3 | Tests API routes critiques (tasks, invoices, GDPR) | `src/__tests__/api/` | 2 jours |
| T4 | Tests composants UI (dashboard, sidebar) | `src/__tests__/components/` | 1 jour |
| T5 | GitHub Actions workflow (lint + test + build) | `.github/workflows/ci.yml` | 2h |
| T6 | Ajouter script `"test"` dans package.json | `package.json` | 5 min |

### Documentation & Ops (1-2 jours)

| # | Action | Fichier | Effort |
|---|--------|---------|--------|
| O1 | Créer README.md | `/README.md` | 2h |
| O2 | Créer .env.example | `/.env.example` | 30 min |
| O3 | Fixer docker-compose.prod.yml (ajouter Redis) | `docker-compose.prod.yml` | 30 min |
| O4 | Décommenter HTTPS redirect dans nginx.conf | `nginx.conf` | 5 min |
| O5 | Ajouter BACKUP_DIR volume dans docker-compose | `docker-compose.prod.yml` | 15 min |
| O6 | Remplacer les placeholders SEO | `src/app/layout.tsx` (verification, app links) | 30 min |

---

## 4. RAPPORT DE RISQUES

### 🔴 Risques Critiques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **R1 — Account takeover via auto-creation** | Élevée | Critique | Supprimer code passwordless (S1) |
| **R2 — Impersonation abuse sans auth** | Moyenne | Critique | Ajouter auth guard (S2) |
| **R3 — Brute-force sans rate limiting** | Élevée | Critique | Redis rate limit (S3) |
| **R4 — Données chiffrées avec clés publiques** | Moyenne | Critique | Supprimer fallback secrets (S7) |
| **R5 — DB corrompue au déploiement PG** | Certaine | Critique | Switch provider PG (D1) |

### 🟠 Risques High

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **R6 — Dégradation perf analytics** | Certaine | High | Cache Redis + indexes (D3, D6) |
| **R7 — BullMQ workers jamais démarrés** | Certaine | High | instrumentation.ts (D8) |
| **R8 — XSS via CSP permissive** | Moyenne | High | Retirer unsafe-eval (S5) |
| **R9 — Session hijacking (JWT 30j)** | Moyenne | High | Réduire TTL + revocation list |
| **R10 — OOM sur exports massifs** | Moyenne | High | Export async (D7) |
| **R11 — Régression silencieuse (0 tests)** | Certaine | High | Setup Vitest (T1-T4) |

### 🟡 Risques Medium

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **R12 — Race condition campaign stats** | Moyenne | Medium | Atomic DB increments |
| **R13 — N+1 sur import CSV** | Moyenne | Medium | Batch dedup |
| **R14 — Cache permissions stale** | Faible | Medium | TTL-based invalidation (S10) |
| **R15 — Cross-team permission escalation** | Faible | Medium | Scope permissions (S8) |
| **R16 — Module-level mutable state** | Faible | Medium | Refactor notifications.ts |

### 🔵 Risques Low

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **R17 — Modulo bias backup codes** | Faible | Low | Rejection sampling |
| **R18 — Invoice tokens sans expiry** | Faible | Low | Ajouter timestamp |
| **R19 — Audit logs sans intégrité** | Faible | Low | Hash chaining |

---

## 5. PLAN DE LANCEMENT (J-7 à J-0)

### J-7 : Freeze & Setup
- [ ] Créer la branche `release/v1.0` — aucun merge sans review
- [ ] Setup Vitest + GitHub Actions (T1, T5)
- [ ] Créer `.env.example` avec toutes les variables (O2)
- [ ] Supprimer les fallback secrets hardcoded (S7)
- [ ] `git rm -r skills/ .zscripts/ download/` (ne pas déployer le tooling dev)

### J-6 : Sécurité Bloquante
- [ ] S1 : Supprimer auto-creation passwordless
- [ ] S2 : Auth sur impersonation/end
- [ ] S3 : Migrer rate-limit vers Redis
- [ ] S4 : Enforce 2FA dans middleware
- [ ] S5 : Corriger CSP
- [ ] Validation : `npx eslint .` + tests auth

### J-5 : Base de données
- [ ] D1 : Switch `provider = "postgresql"` dans schema.prisma
- [ ] `bunx prisma migrate dev --name init_pg`
- [ ] D3-D4 : Ajouter tous les indexes manquants
- [ ] D8 : Créer `instrumentation.ts` avec `startWorkers()`
- [ ] Fix `docker-compose.prod.yml` (ajouter Redis)
- [ ] Validation : `bunx prisma migrate status`

### J-4 : Performance & Architecture
- [ ] D5-D6 : Analytics bounds + cache Redis
- [ ] D7 : Export asynchrone
- [ ] A4 : Code-splitting panels
- [ ] A5 : DRY AI providers
- [ ] Validation : `bun run build` (no errors)

### J-3 : Tests Critiques
- [ ] T2 : Tests unitaires auth
- [ ] T3 : Tests API routes critiques
- [ ] T4 : Tests composants UI
- [ ] W1-W4 : Compléter les 4 actions workflow manquantes
- [ ] Validation : `bun test` (green), `bun run lint` (clean)

### J-2 : Documentation & SEO
- [ ] O1 : README.md complet
- [ ] O3 : Fix docker-compose.prod.yml
- [ ] O4 : HTTPS redirect nginx
- [ ] Remplacer placeholders SEO (Google verification, app links)
- [ ] Validation : review README + docker-compose

### J-1 : Déploiement Staging
- [ ] Déployer sur VPS staging via Docker
- [ ] `docker compose -f docker-compose.prod.yml up -d`
- [ ] `curl -I https://staging.example.com/api/health` → 200
- [ ] Tests manuels : login, 2FA, GDPR export/delete, Stripe checkout
- [ ] Vérifier Redis : `docker compose exec redis redis-cli ping` → PONG
- [ ] Vérifier workers : logs BullMQ
- [ ] Checklist sign-off par Lead Dev

### J-0 : Lancement Production
- [ ] Changer DNS vers le nouveau serveur
- [ ] Vérifier HTTPS via Certbot/Let's Encrypt
- [ ] Monitoring premieres heures :
  - `curl -s https://example.com/api/health | jq`
  - Vérifier logs nginx : `docker compose logs nginx --tail 50`
  - Vérifier logs app : `docker compose logs app --tail 50`
- [ ] Rollback plan : `git checkout release/v0.9 && docker compose up -d --build`

---

## 6. COMMANDES DE VALIDATION

```bash
# 1. Vérifier la DB
cd /home/z/my-project/Burofree
bunx prisma migrate status
bunx prisma db push

# 2. Linter
bun run lint

# 3. Build production
bun run build

# 4. Tests
bun test

# 5. Docker healthcheck
curl -s http://localhost:3000/api/health | jq

# 6. Redis
docker compose exec redis redis-cli ping

# 7. Security headers
curl -I https://localhost:3000/api/health
# Vérifier: Strict-Transport-Security, Content-Security-Policy, X-Frame-Options

# 8. CSP (pas de unsafe-eval)
curl -sI https://localhost:3000 | grep -i content-security-policy
```

---

## 7. RÉSUMÉ EXÉCUTIF

**Ce que le projet fait BIEN :**
- ✅ Feature isolation excellente (`features/` bien structuré)
- ✅ Shadcn/UI utilisé correctement et uniformément
- ✅ 180+ API routes avec pattern consistant (auth guard + try/catch)
- ✅ RBAC bien pensé (roles, permissions, hierarchy)
- ✅ 2FA TOTP + backup codes bien implémentés
- ✅ GDPR complet (export, suppression, consent, DPO, grace period)
- ✅ Backup manager production-grade (pg_dump, encryption, S3, retention)
- ✅ PWA solide (SW v3, offline queue, push, periodic sync)
- ✅ SEO landing page (OG, Twitter, JSON-LD, sitemap, robots)
- ✅ Superadmin dashboard complet (8 KPI, charts, tickets, flags)

**Ce qui BLOQUE la production :**
- 🔴 4 vulnérabilités critiques de sécurité
- 🔴 SQLite vs PostgreSQL incompatibilité
- 🔴 15 models sans indexes de performance
- 🔴 0 test, 0 CI/CD
- 🔴 Rate limiting inopérant en multi-instance
- 🔴 Workers BullMQ jamais démarrés
- 🔴 God store 1350 lignes à refactorer

**Estimation effort total : 15-25 jours de développement senior** pour atteindre un niveau production acceptable.

---

*Fin du rapport d'audit — Généré le 2025-07-11*
