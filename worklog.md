# Task 3 — Onboarding Wizard, PDF Invoice Generation, and PWA Setup

## Summary

Implemented three major features for the Maellis freelance assistant application:

### Feature 1: Onboarding Wizard
- **File**: `src/components/onboarding-wizard.tsx` — Full 7-step wizard with Framer Motion animations
  - Step 1: Bienvenue — Large "M" logo with emerald gradient, welcome message
  - Step 2: Votre profil — Name input + profession select (7 options)
  - Step 3: Votre assistant — Assistant name, tone selection (3 cards: Professionnel/Amical/Minimaliste), live preview
  - Step 4: Vos projets — Dynamic project cards (name, client, budget), add/remove, skip option
  - Step 5: Connexion email — Google & Microsoft buttons with "Non configuré" badges, "Configurer plus tard" option
  - Step 6: Vos préférences — Notifications (in-app/email checkboxes), work hours (time inputs), work days (day toggle buttons)
  - Step 7: Terminé — Celebration animation, summary recap, "Accéder au dashboard" button
- **File**: `src/app/api/onboarding/route.ts` — POST endpoint saves user profile data and creates projects, sets onboardingDone=true
- **File**: `src/app/api/users/route.ts` — GET endpoint to fetch user data
- **File**: `src/lib/store.ts` — Added `fetchUser` action, integrated into `fetchAll`
- **File**: `src/app/page.tsx` — Checks `user.onboardingDone`, shows wizard if false, registers service worker

### Feature 2: PDF Invoice Generation
- **File**: `src/app/api/invoices/[id]/pdf/route.ts` — GET endpoint generates professional HTML invoice styled for print
  - Displays: invoice type (Facture/Devis), number, date, émetteur/client info, line items table, totals with TVA, due date, notes
  - Professional styling with emerald accent color, print-friendly layout
- **File**: `src/components/invoicing-panel.tsx` — Added Printer icon button in action column + "Voir / Imprimer PDF" button in invoice detail dialog

### Feature 3: PWA Setup
- **File**: `public/manifest.json` — PWA manifest with Maellis branding, emerald theme, standalone display
- **File**: `public/sw.js` — Basic service worker with cache-first strategy
- **File**: `src/app/layout.tsx` — Added manifest link, theme-color meta, apple-mobile-web-app meta tags
- **File**: `src/app/page.tsx` — Service worker registration in useEffect

## Technical Details
- All UI text in French
- Emerald (#10b981) and amber (#f59e0b) accent colors only — no blue/indigo
- Framer Motion AnimatePresence for step transitions
- shadcn/ui components: Dialog, Button, Input, Select, Checkbox, Progress, Card, Label
- Zustand store extended with fetchUser action
- Lint passes with 0 errors, 0 warnings

## Files Modified
- `src/components/onboarding-wizard.tsx` (new)
- `src/app/api/onboarding/route.ts` (new)
- `src/app/api/users/route.ts` (new)
- `src/app/api/invoices/[id]/pdf/route.ts` (new)
- `public/manifest.json` (new)
- `public/sw.js` (new)
- `src/components/invoicing-panel.tsx` (modified — added PDF button)
- `src/app/layout.tsx` (modified — PWA meta tags)
- `src/app/page.tsx` (modified — onboarding check, service worker)
- `src/lib/store.ts` (modified — fetchUser action)
