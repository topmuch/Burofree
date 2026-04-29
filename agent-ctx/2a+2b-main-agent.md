# Task 2a+2b — PDF Invoice Generation & Stripe Payment Integration

## Agent: Main Agent
## Status: Completed

## Summary

Implemented professional PDF invoice generation using puppeteer-core (with HTML fallback) and Stripe payment integration with checkout sessions, webhooks, and graceful degradation.

## Key Files Created
- `src/lib/pdf-generator.ts` — PDF generation engine with puppeteer-core, multi-currency, DRAFT watermark
- `src/app/api/invoices/[id]/send/route.ts` — Email sending via Gmail/Outlook
- `src/app/api/invoices/remind/route.ts` — AI-powered reminder automation (GET all + POST specific)
- `src/lib/stripe.ts` — Stripe client wrapper with checkout sessions, webhook verification, amount formatting
- `src/app/api/stripe/checkout/route.ts` — Checkout session creation endpoint
- `src/app/api/stripe/webhook/route.ts` — Webhook handler for payment events
- `src/app/api/stripe/config/route.ts` — Stripe configuration status endpoint
- `src/components/stripe-payment-button.tsx` — Payment button component with compact mode and badges

## Key Files Modified
- `prisma/schema.prisma` — Added Stripe fields to Invoice + User models
- `src/lib/store.ts` — Added Stripe fields to Invoice interface
- `src/app/api/invoices/[id]/pdf/route.ts` — Rewritten with PDF generator
- `src/app/api/invoices/[id]/route.ts` — Added Stripe field updates
- `src/app/api/invoices/route.ts` — Added paymentMethod to creation
- `src/components/invoicing-panel.tsx` — Complete Stripe integration, email sending, real reminders
- `.env.example` — Added Stripe environment variables

## Prisma Schema Changes
- Invoice: +stripePaymentIntentId, +stripeCheckoutUrl, +paymentMethod (default "manual")
- User: +stripeAccountId, +stripeCustomerId

## Lint: 0 errors, 0 warnings
