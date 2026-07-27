export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      ok: true,
      integrations: {
        context: Boolean(process.env.CONTEXT_DEV_API_KEY),
        googlePlaces: Boolean(process.env.GOOGLE_PLACES_API_KEY),
        llm: Boolean(
          process.env.GEMINI_KEY ??
            process.env.GEMINI_API_KEY ??
            process.env.LLM_API_KEY,
        ),
        firebase: Boolean(process.env.FIREBASE_PROJECT_ID),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
