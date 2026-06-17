# ListAI — Shutdown Checklist (Product Ended)

Last updated: 2026-06-14

ListAI has been permanently ended. The code is now in a self-contained "ended"
state: `SITE_DISABLED = true` in `middleware.ts` makes every request return a
410 "This product has ended" page **before any app code runs** — so it needs no
database and no API keys and keeps working after everything below is deleted.

`.env.local` has been scrubbed of all secrets. **Scrubbing the file does not
revoke the live keys** — you still have to revoke/delete each one at its
provider (below).

---

## Done
- [x] **Stripe** — subscriptions canceled (no more customer charges)
- [x] **Code** — site set to permanent "ended" page
- [x] **`.env.local`** — secrets removed from disk

---

## What I can't do for you (no API/tools for these — do in the dashboards)

### 1. Vercel — delete or keep a free "ended" page
Two choices:
- **Keep the ended page live (recommended if you want visitors to see it):**
  Deploy this repo on the **Hobby (free)** tier. Remove all the project's
  Environment Variables (Settings → Environment Variables) — they're no longer
  needed since the 410 page uses none. Costs $0.
- **Delete it entirely:** Vercel → Project → Settings → scroll to bottom →
  **Delete Project**. The domain then stops resolving (no "ended" page shown).

### 2. Supabase — delete the project
- https://supabase.com/dashboard → project `zeoboiwanlbcnbaaqdjp` → Settings →
  General → **Delete project**. Irreversible — exports all reports/leads gone.
  (Export anything you want to keep first.)

### 3. Revoke every API key (do this even after deleting projects)
- **Anthropic** — console.anthropic.com → API Keys → revoke `ANTHROPIC_API_KEY`
  and `LISTAI_CLAUDE_API_KEY`.
- **Google Cloud** — console.cloud.google.com → Credentials → delete the Places
  key; disable the Places API.
- **Rentcast** — app.rentcast.io → revoke key / cancel any paid plan.
- **Resend** — resend.com → API Keys → revoke.
- **Decor8 AI** — revoke key / cancel any plan.
- **Stripe** — dashboard → Developers → API keys → roll/revoke the live secret
  key (subs already canceled).

### 4. Domain — listwithai.io
- Turn off auto-renew at GoDaddy if you're fully done, or keep it pointed at the
  free Vercel "ended" page.

---

## Deploy the current state

```bash
git add middleware.ts .env.local WIND_DOWN.md
git commit -m "Shut down ListAI: permanent ended page, scrub secrets"
git push        # Vercel auto-deploys (if you keep the project)
```

> Note: `.env.local` is gitignored, so the commit won't include it — the scrub
> only affects your local copy. That's fine; the real secrets live at the
> providers and must be revoked there.
