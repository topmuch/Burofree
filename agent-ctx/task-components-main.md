# Task: Build Invoicing, Documents, Notifications, and Settings Components

## Status: ✅ Complete

### Files Modified:
1. **`src/components/invoicing-panel.tsx`** — Complete rewrite
2. **`src/components/documents-panel.tsx`** — Complete rewrite
3. **`src/components/notifications-panel.tsx`** — Complete rewrite
4. **`src/components/settings-panel.tsx`** — Complete rewrite

### Implementation Details:

#### 1. Invoicing Panel
- **Stats Bar**: 4 mini cards (CA du mois/emerald, Factures en attente/amber, Factures en retard/red, Total annuel/zinc)
- **Filter Bar**: Type tabs (Tous/Devis/Factures) + Status select (Tous/Brouillon/Envoyée/Payée/En retard)
- **Create buttons**: "Nouveau devis" (emerald) and "Nouvelle facture" (amber)
- **Invoice/Quote Table**: shadcn Table with columns for Numéro, Client, Type badge, Montant (€), Statut badge, Échéance, Actions
- **Create Invoice Dialog**: Comprehensive form with type select, auto-generated number, client info, dynamic line items (add/remove), auto-calculated subtotal/TVA 20%/total, date picker, project select, notes textarea
- **Revenue Chart**: recharts BarChart with emerald bars, last 6 months from stats.monthlyData
- **Overdue handling**: Warning icon, "Relance" button for overdue invoices
- **View Invoice Dialog**: Detail view of invoice data

#### 2. Documents Panel
- **Two-column layout**: Left project list + Right document grid (responsive)
- **Project sidebar**: "Tous les documents" + project cards with colored dot, name, client, document count
- **Document grid**: Search + type filter (Contrat/Devis/Livrable/Autre), 3-column grid with icon, name, type badge, date, size
- **Hover actions**: Eye + Trash2 buttons appear on hover
- **Upload area**: Dashed border zone with Upload icon + "Glisser-déposer ou cliquer"
- **Snippets tab**: "Documents" / "Modèles" tabs, snippets with copy button (toast "Copié !"), add snippet dialog

#### 3. Notifications Panel
- **Header**: "Centre de notifications" + "Tout marquer comme lu" button + unread count badge
- **Grouped notifications**: "Aujourd'hui", "Hier", "Cette semaine", "Plus ancier"
- **Notification cards**: Type-based icons (Info/emerald, AlertTriangle/amber, AlertCircle/red, CheckCircle/green), bold if unread, relative time, read/unread dot, click to mark as read, delete button (visible on hover)
- **Empty state**: Bell icon + "Aucune notification"
- **Notification Settings**: Collapsible section with toggle rows (in-app, email, SMS, vocal), quiet hours start/end time inputs

#### 4. Settings Panel
- **Profil**: Name, email (read-only), profession, timezone select, Save button
- **Assistant IA**: Name input (default "Maellis"), Tone select (Professionnel/Amical/Minimaliste), Preview with tone-based message
- **Apparence**: Dark/Light toggle with Sun/Moon icons, Focus Mode switch
- **Comptes Email**: Connected accounts list with provider badge, "Ajouter un compte" dialog (Gmail/Outlook/IMAP, IMAP shows host/port)
- **Données**: "Exporter mes données" button (toast "Fonctionnalité à venir"), "Réinitialiser les données" with AlertDialog confirmation

### Tech Stack Used:
- All UI text in French
- Emerald (#10b981) and amber (#f59e0b) accents, NO blue/indigo
- `'use client'` directive at top of all files
- `useAppStore` from `@/lib/store` for state and types
- shadcn/ui components from `@/components/ui/`
- Lucide React icons
- Framer Motion for animations
- recharts for invoicing chart
- sonner for toast notifications

### Lint: ✅ Passed with no errors
### Dev Server: ✅ Running normally
