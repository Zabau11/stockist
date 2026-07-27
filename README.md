# Stockist

Stockist analyzes a manufacturer's website and distribution goal, finds relevant physical retailers, enriches their public business contacts, and ranks the strongest leads.

## Product flow

1. Context.dev extracts a structured product and retail-fit profile from the manufacturer's website.
2. A provider-neutral, OpenAI-compatible LLM adapter creates targeted Google Places searches.
3. Google Places Text Search finds stores and returns business details.
4. The backend checks each store's public website and contact page for published email addresses and phone numbers.
5. Leads are ranked using category fit, reputation, and contactability.
6. Firebase optionally stores the product analysis, strategy, public contact-source data, and Google Place IDs. Full Google Places responses are not persisted.

Without API keys, the app runs in an explicitly labeled sample mode so the full interaction can still be tested.

## Vercel-only structure

```text
apps/
  marketing/   domain.com landing page (Next.js + shadcn/ui)
  web/         app.domain.com dashboard and API routes (Next.js + shadcn/ui)
packages/
  discovery/   server-only product analysis, store discovery, enrichment, and storage
```

The dashboard's Next.js Route Handlers are the Node.js backend. There is no
separate Express server, CORS layer, or Railway service.

## Run locally

```bash
npm install
cp apps/marketing/.env.example apps/marketing/.env.local
cp apps/web/.env.example apps/web/.env.local
npm run dev
```

Open the landing page at `http://localhost:3000` and the dashboard at
`http://localhost:3001`. The landing form sends the website and prompt to the
dashboard, which starts the discovery automatically.

## Environment variables

Dashboard variables are documented in `apps/web/.env.example`:

- `CONTEXT_DEV_API_KEY` — structured website extraction
- `GOOGLE_PLACES_API_KEY` — Places API (New), with Text Search enabled
- `GEMINI_KEY` — Gemini API key; defaults to the free-tier `gemini-3.5-flash-lite` model
- `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` — optional overrides for another OpenAI-compatible provider or model
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — optional Firestore persistence
- `NEXT_PUBLIC_MARKETING_URL` — the landing-page origin

The marketing app only needs `NEXT_PUBLIC_DASHBOARD_URL`.

## Deploy

Import this repository into Vercel twice:

1. Create a `stockist-marketing` project with `apps/marketing` as its Root
   Directory. Set `NEXT_PUBLIC_DASHBOARD_URL=https://app.domain.com` and attach
   `domain.com`.
2. Create a `stockist-dashboard` project with `apps/web` as its Root Directory.
   Add the dashboard variables above, set
   `NEXT_PUBLIC_MARKETING_URL=https://domain.com`, and attach
   `app.domain.com`.

Before public launch with live Places data, add public Terms and Privacy pages that incorporate Google Maps' required terms, and retain the `Google Maps` attribution beside live results. Restrict the Google API key to the Places API and the dashboard deployment.

The dashboard exposes `GET /api/health` for a lightweight integration check and
`POST /api/discover` for product-to-store discovery. Both run on Vercel; the
discovery route uses the Node.js runtime and Fluid Compute.

## Validation

```bash
npm run typecheck
npm run build
```
