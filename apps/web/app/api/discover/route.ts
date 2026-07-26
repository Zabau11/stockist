import { after } from "next/server";
import { z } from "zod";
import {
  AppError,
  discoverStores,
  normalizeWebsite,
  saveDiscovery,
} from "@stockist/discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const discoverySchema = z.object({
  website: z.string().trim().min(3).max(2048),
  prompt: z.string().trim().max(2000).default(""),
});

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const input = discoverySchema.parse(await request.json());
    const response = await discoverStores(input);
    const website = normalizeWebsite(input.website);

    after(async () => {
      try {
        await saveDiscovery(response, { website, prompt: input.prompt });
      } catch (error) {
        console.error("Could not persist discovery run.", {
          runId: response.runId,
          error,
        });
      }
    });

    console.info("Discovery completed.", {
      runId: response.runId,
      leadCount: response.leads.length,
      demo: response.demo,
      durationMs: Date.now() - startedAt,
    });

    return Response.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Check the website and prompt, then try again.",
          details: error.issues,
        },
        { status: 400 },
      );
    }

    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message =
      error instanceof Error ? error.message : "Something went wrong.";

    console.error("Discovery failed.", {
      statusCode,
      durationMs: Date.now() - startedAt,
      error,
    });

    return Response.json(
      { error: message },
      {
        status: statusCode,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
