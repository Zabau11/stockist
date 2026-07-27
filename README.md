# Stockist

Stockist understands a manufacturer's free-form request, analyzes the supplied product website, finds relevant physical retailers, enriches their public business contacts, and ranks the strongest leads.

## Product flow

1. Gemini interprets the user's single free-form input into an explicit product website and distribution goal. If the website is missing, the conversation asks for it instead of guessing.
2. Context.dev extracts a structured product and retail-fit profile, plus the brand logo, palette, slogan, and typography from the manufacturer's website.
3. A provider-neutral, OpenAI-compatible LLM adapter creates targeted Google Places searches.
4. Google Places Text Search finds stores and returns business details.
5. The backend checks each store's public website and contact page for published email addresses and phone numbers.
6. Leads are ranked using category fit, reputation, and contactability.
7. Firebase optionally stores the product analysis, strategy, public contact-source data, and Google Place IDs. Full Google Places responses are not persisted.

Without API keys, the app runs in an explicitly labeled sample mode so the full interaction can still be tested.

## Structure

```text
apps/
  web/         landing page, dashboard, and API routes (Next.js + shadcn/ui)
packages/
  discovery/   server-only product analysis, store discovery, enrichment, and storage
```

Everything runs from one Vercel project and one domain:

- `domain.com/` — landing page
- `domain.com/dashboard` — dashboard and new discovery
- `domain.com/dashboard/{conversationId}` — saved local conversation
- `domain.com/api/*` — Node.js Route Handlers

The Next.js Route Handlers are the Node.js backend. There is no separate
Express server, CORS layer, Railway service, subdomain, or cross-origin setup.

## Run locally

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
npm run dev
```

Open the landing page at `http://localhost:3000` or the dashboard at
`http://localhost:3000/dashboard`. The landing form sends one natural-language
request to the dashboard. The LLM understands it first, then starts product
analysis when an explicit website is available.

## Environment variables

Dashboard variables are documented in `apps/web/.env.example`:

- `CONTEXT_DEV_API_KEY` — structured product extraction, brand assets, and website styleguide
- `GOOGLE_PLACES_API_KEY` — Places API (New), with Text Search enabled
- `GEMINI_KEY` — Gemini API key; defaults to the free-tier `gemini-3.5-flash-lite` model
- `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` — optional overrides for another OpenAI-compatible provider or model
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — optional Firestore persistence

## Deploy

Import this repository into Vercel once. Set `apps/web` as the Root Directory,
add the server environment variables above, and attach `domain.com`.

Before public launch with live Places data, add public Terms and Privacy pages
that incorporate Google Maps' required terms, and retain the `Google Maps`
attribution beside live results. Restrict the Google API key to the Places API
and the production deployment.

The dashboard exposes `GET /api/health` for a lightweight integration check and
`POST /api/discover` for product-to-store discovery. Both run on Vercel; the
discovery route uses the Node.js runtime and Fluid Compute.

## Validation

```bash
npm run typecheck
npm run build
```
