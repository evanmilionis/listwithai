# ListAI - Project Map & Context

## What This Is
ListAI (listwithai.io) is a SaaS product that generates AI-powered home selling toolkits for Florida homeowners and real estate agents. Built as a Next.js 14 App Router application.

## Business Model
- **Homeowner tier** — $500 one-time Stripe payment, gets a full AI report
- **Agent tier** — $150/month Stripe subscription, gets a dashboard to run reports for clients

## Tech Stack
- **Framework:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database/Auth:** Supabase (PostgreSQL + magic link auth + RLS)
- **Payments:** Stripe (one-time for homeowners, recurring for agents)
- **AI:** Anthropic Claude API (model: `claude-sonnet-4-6`) — generates 5 report modules
- **Property Data:** Rentcast API (3 endpoints: valuation, comparables, market stats)
- **Amenities:** Google Places API (nearby schools, parks, hospitals, grocery, restaurants)
- **Email:** Resend (domain: listwithai.io, from: hello@listwithai.io)

---

## Directory Structure

```
Listwithai/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing page
│   ├── globals.css                   # Global styles
│   ├── homeowner/page.tsx            # Intake form + exit-intent popup
│   ├── agent/page.tsx                # Agent pricing + sign-in link
│   ├── success/page.tsx              # Post-payment confirmation
│   ├── report/[id]/page.tsx          # Public report viewer
│   ├── dashboard/
│   │   ├── layout.tsx                # Auth check + subscription linking
│   │   ├── page.tsx                  # Agent dashboard home
│   │   ├── new/page.tsx              # Create new agent report
│   │   └── report/[id]/page.tsx      # Agent report view
│   ├── api/
│   │   ├── auth/callback/route.ts    # Supabase magic link callback
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts     # Creates Stripe checkout sessions
│   │   │   └── webhook/route.ts      # Handles payment + subscription events
│   │   ├── report/
│   │   │   ├── generate/route.ts     # Triggers report generation (fire-and-forget)
│   │   │   └── [id]/route.ts         # Fetch report data by ID
│   │   ├── leads/
│   │   │   ├── capture/route.ts      # Upsert lead data from form auto-save
│   │   │   ├── route.ts              # Admin leads listing (protected by ADMIN_SECRET)
│   │   │   └── followup/route.ts     # Abandoned cart email cron
│   │   ├── sold-status/route.ts      # Update sold status
│   │   └── followup/trigger/route.ts # Post-sale followup email cron
├── components/
│   ├── IntakeForm.tsx                # 3-step wizard (property info, condition, contact)
│   ├── ReportViewer.tsx              # 8-tabbed report display (the main deliverable)
│   ├── ExitIntentPopup.tsx           # Exit-intent modal on /homeowner
│   ├── PricingCards.tsx              # Homeowner vs Agent pricing display
│   ├── AttorneyCards.tsx             # Location-matched FL attorney recommendations
│   ├── MLSReferral.tsx               # Houzeo + ListWithFreedom flat-fee MLS cards
│   ├── AgentDashboard.tsx            # Agent stats component
│   ├── Header.tsx                    # Site header/nav
│   ├── Footer.tsx                    # Site footer
│   ├── Disclaimer.tsx                # Legal disclaimer (3 variants)
│   └── ui/                           # Reusable UI primitives
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Select.tsx
├── lib/
│   ├── claude.ts                     # Claude API integration (5 AI modules)
│   ├── reportGenerator.ts            # Main orchestrator (fetches data, runs AI, saves)
│   ├── rentcast.ts                   # Rentcast API (valuation, comps, market stats)
│   ├── googlePlaces.ts               # Google Places API (amenity search + geocoding)
│   ├── resend.ts                     # Email sending via Resend
│   ├── stripe.ts                     # Stripe instance
│   ├── supabase.ts                   # Browser + service role Supabase clients
│   └── utils.ts                      # cn(), formatCurrency(), getConditionLabel()
├── types/
│   └── index.ts                      # All TypeScript interfaces
├── data/
│   ├── attorneys.json                # FL attorney directory (6 regions)
│   └── emailTemplates.ts             # 5-stage post-sale followup email templates
├── supabase-schema.sql               # Database schema (reports, agent_subscriptions, leads)
├── .env.local                        # All API keys and config
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.mjs
```

---

## Database Schema (Supabase PostgreSQL)

### `reports` table
- `id` UUID (PK), `created_at`, `user_id` (FK to auth.users, nullable)
- `customer_email`, `customer_name`, `stripe_session_id`
- `property_address`, `property_city`, `property_state` (default 'FL'), `property_zip`
- `beds` INT, `baths` DECIMAL, `sqft` INT
- `condition_score` INT (1-10), `asking_price` INT, `target_close_date` TEXT
- `customer_type` ('homeowner' | 'agent')
- `status` ('pending' | 'processing' | 'complete' | 'failed')
- `rentcast_data` JSONB — cached Rentcast API response
- `report_output` JSONB — all 5 AI module outputs + amenities
- `sold_status` ('unknown' | 'active' | 'sold' | 'withdrawn'), `sold_price`, `sold_date`
- `followup_stage` INT (default 0), `report_url` TEXT

### `agent_subscriptions` table
- `id` UUID (PK), `created_at`, `user_id` (FK, nullable — webhook creates before auth)
- `email`, `name`, `stripe_customer_id`, `stripe_subscription_id`
- `status` ('active' | 'canceled' | 'past_due'), `reports_run` INT

### `leads` table
- `id` UUID (PK), `created_at`, `email`, `name`, `phone`
- Property fields, `form_step_reached`, `converted`, `converted_at`
- `source`, `utm_source`, `utm_medium`, `utm_campaign`, `notes`
- `followup_count`, `last_followup_at`

### RLS Policies
- Agents can SELECT/INSERT own reports (by user_id)
- Users can SELECT own subscription (by user_id OR email when user_id is NULL)
- Users can UPDATE to link their auth account to an unlinked subscription
- Service role key used server-side for webhooks/API (bypasses RLS)

---

## Report Generation Pipeline

The end-to-end flow:
1. **User fills intake form** → auto-saves to `leads` table at each step
2. **User pays via Stripe** → checkout session with metadata (property info)
3. **Stripe webhook fires** → creates `reports` row (status: 'pending'), triggers report generation API
4. **Report generation** (`lib/reportGenerator.ts`):
   - Sets status to 'processing'
   - Fetches Rentcast data (valuation + comps + market stats) — skips if already cached
   - Fetches Google Places amenities
   - Runs 5 Claude AI modules **sequentially** (not parallel, for reliability):
     1. **Timeline** — 90-day selling timeline with phases, tasks, milestones
     2. **Improvements** — ROI-ranked home improvements based on condition score
     3. **Pricing** — Market analysis with pricing strategy and confidence intervals
     4. **Listing Copy** — MLS description, social media posts, highlight bullets
     5. **Legal** — FL-specific contracts, disclosures, closing checklist
   - Saves all results to `report_output` JSONB column
   - Sends "Your report is ready" email via Resend
   - Sets status to 'complete'
5. **User views report** at `/report/[id]` — 8-tabbed ReportViewer component

### Claude API Details (`lib/claude.ts`)
- Uses `LISTAI_CLAUDE_API_KEY` env var (not `ANTHROPIC_API_KEY` — Claude Code overrides that)
- Model: `claude-sonnet-4-6`
- Max tokens: 8192 default, 16384 for legal module
- System prompt forces raw JSON output (no markdown code blocks)
- `extractJSON()` function handles edge cases (trailing commas, control chars)
- `callClaude()` retries once on failure

---

## Key Integration Details

### Stripe
- Homeowner: one-time payment → `checkout.session.completed` webhook → creates report + triggers generation
- Agent: recurring subscription → `checkout.session.completed` creates subscription record, `customer.subscription.updated/deleted` manages status
- Webhook secret validates incoming events
- Checkout metadata carries all property info

### Supabase Auth
- Magic link authentication (email-based, no passwords)
- Agent flow: pay first → get magic link on success page → sign in → dashboard auto-links subscription by email
- Auth callback at `/auth/callback`

### Resend Email
- Domain: listwithai.io (verified via GoDaddy DNS)
- From: hello@listwithai.io
- Sends: report ready notification, abandoned cart followups, post-sale followup sequence

---

## Current Status (as of March 2026)

### Working
- Full payment flow (Stripe test mode) for both tiers
- Report generation pipeline (5/5 Claude modules generating and saving)
- Email notifications via Resend
- Lead capture with auto-save
- Exit-intent popup
- Report viewer with 8 tabs
- Agent dashboard with auth

### Known Issues / TODO
- `reportGenerator.ts` line 174: `if (true)` should be `if (!isRegeneration)` — currently sends email on every generation, not just first time
- Rentcast free tier exhausted — needs paid plan upgrade
- Attorney data in `attorneys.json` is placeholder — needs real FL attorneys
- Not yet deployed to production (running locally)

### Pending for Launch
- Deploy to Vercel with domain listwithai.io
- Set `NEXT_PUBLIC_APP_URL` to `https://listwithai.io`
- Set up production Stripe webhook at `https://listwithai.io/api/stripe/webhook`
- Swap to live Stripe keys
- Add Supabase auth redirect URL for production
- Set up cron jobs (abandoned cart emails, post-sale followups)
- Add Google Analytics / SEO meta tags
- Rate limiting on API routes
- Set up Calendly/Cal.com for exit-intent "Book a Free Call" button

---

## Environment Variables (.env.local)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Stripe
STRIPE_SECRET_KEY=<sk_test_...>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<pk_test_...>
STRIPE_WEBHOOK_SECRET=<whsec_...>
STRIPE_HOMEOWNER_PRICE_ID=<price_...>
STRIPE_AGENT_PRICE_ID=<price_...>

# Anthropic (use LISTAI_CLAUDE_API_KEY, not ANTHROPIC_API_KEY)
LISTAI_CLAUDE_API_KEY=<sk-ant-api03-...>
ANTHROPIC_API_KEY=<sk-ant-api03-...>

# Rentcast
RENTCAST_API_KEY=<key>

# Resend
RESEND_API_KEY=<re_...>

# Google Places
GOOGLE_PLACES_API_KEY=<AIza...>

# Admin
ADMIN_SECRET=<secret>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Dependencies

```json
{
  "@anthropic-ai/sdk": "^0.78.0",
  "@stripe/stripe-js": "^8.9.0",
  "@supabase/ssr": "^0.9.0",
  "@supabase/supabase-js": "^2.99.1",
  "clsx": "^2.1.1",
  "lucide-react": "^0.577.0",
  "next": "14.2.35",
  "react": "^18",
  "react-dom": "^18",
  "resend": "^6.9.3",
  "stripe": "^20.4.1",
  "tailwind-merge": "^3.5.0",
  "uuid": "^13.0.0"
}
```
