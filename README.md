# MPG OS — Media Payments Group Sales Dashboard

A React SPA that gives a payment-processing sales rep an AI-assisted workflow:
find leads, score them, run statement audits, build proposals, write follow-up
emails, and coach the week. Backend is Supabase; AI is Claude; lead data comes
from Google Places. Deployed to Netlify.

## Stack

- React 18 + Vite + Tailwind CSS
- Supabase (Postgres + email/password auth)
- Claude API (`claude-sonnet-4-6`) via a Netlify Function proxy (streaming)
- Google Places (Text Search) via a Netlify Function proxy
- Netlify hosting + Functions

API keys for Claude and Google Places never reach the browser. They live in
Netlify environment variables and are used only inside `netlify/functions`.

## The 8 tabs

1. **Today** — pipeline counts, who to call, demos booked, quick-add, closer tip.
2. **Lead Scraper** — Google Places search, Claude scores each prospect 1-10, add to pipeline. Includes a "New LLC Blitz" toggle.
3. **Call Center** — talk-track generator (streaming), objection handler (Soft / Direct / Hard Close), and a call logger that updates lead status.
4. **Statement Audit** — enter a merchant statement, get an interchange-plus comparison, monthly/annual savings, junk-fee flags, package recommendation, and a copyable summary. Saves to `statement_audits`.
5. **Proposal Builder** — discovery notes in, structured proposal + draft email out.
6. **Email Drip** — a 4-touch follow-up sequence in a human voice.
7. **Referral Partners** — partner table, add/edit, history, and a per-type outreach script generator.
8. **Weekly Review** — auto scoreboard from your data plus an AI coaching plan.

## Local setup

```bash
npm install
cp .env.example .env   # fill in the VITE_ values
```

`.env` (client, safe to expose):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Run the database migration

In the Supabase dashboard: **SQL Editor → New query**, paste the contents of
[`migrations/schema.sql`](migrations/schema.sql), and run it. It creates the
four tables, indexes, an `updated_at` trigger, and RLS policies that give any
signed-in user full access.

### Run locally with functions

The Netlify Functions (Claude + Google Places proxies) only run under the
Netlify CLI, which also injects the server-side secrets:

```bash
npm i -g netlify-cli      # once
ANTHROPIC_API_KEY=... GOOGLE_PLACES_KEY=... netlify dev
```

Plain `npm run dev` serves the UI but the AI and scraper calls will fail
because the functions are not running.

## Deploy to Netlify

1. Connect the repo. Build settings come from `netlify.toml`
   (`npm run build` → `dist`, functions in `netlify/functions`).
2. Set environment variables in **Site settings → Environment variables**:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (build-time, client)
   - `ANTHROPIC_API_KEY`, `GOOGLE_PLACES_KEY` (runtime, server only)
3. Deploy.

### Google Places API

The proxy uses the **Places API (New)** Text Search endpoint
(`places:searchText`). Enable "Places API (New)" in Google Cloud and restrict
the key to that API. The browser never sees this key.

## Notes

- All forms autosave drafts to `localStorage`, so a refresh never loses work.
- AI responses stream where the UI shows free text; structured outputs (audit,
  proposal, scoring) are returned as JSON and rendered into cards.
- Every API call has user-friendly error handling.
- The two `npm audit` advisories are dev-server-only (esbuild/Vite) and do not
  affect the production bundle.
