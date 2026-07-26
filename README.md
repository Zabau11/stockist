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

## Structure

```text
apps/
  web/   Next.js 16 App Router + shadcn/ui frontend (Vercel)
  api/   Node.js + Express API (Railway)
```

## Run locally

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
npm run dev
```

Open `http://localhost:3000`. The API runs on `http://localhost:4000`.

## Environment variables

Backend variables are documented in `apps/api/.env.example`:

- `CONTEXT_DEV_API_KEY` — structured website extraction
- `GOOGLE_PLACES_API_KEY` — Places API (New), with Text Search enabled
- `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` — any OpenAI-compatible model provider
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — optional Firestore persistence
- `FRONTEND_URL` — comma-separated allowed frontend origins

The frontend only needs `NEXT_PUBLIC_API_URL`, set to the public Railway API URL in production.

## Deploy

For Railway, create a service with `apps/api` as its root directory, add the backend variables, and deploy. The included `railway.json` builds the TypeScript API, starts it, and checks `/health`.

For Vercel, import the same repository with `apps/web` as the root directory and set `NEXT_PUBLIC_API_URL` to the Railway service URL.

Before public launch with live Places data, add public Terms and Privacy pages that incorporate Google Maps' required terms, and retain the `Google Maps` attribution beside live results. Restrict the Google API key to the Places API and the Railway service.

## Validation

```bash
npm run typecheck
npm run build
```
