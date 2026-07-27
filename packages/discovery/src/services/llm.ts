import { readErrorResponse } from "../lib/errors";
import type { ProductProfile } from "../types";

type SearchStrategy = {
  queries: string[];
  summary: string;
};

const defaultGeminiBaseUrl =
  "https://generativelanguage.googleapis.com/v1beta/openai";
const defaultGeminiModel = "gemini-3.5-flash-lite";

function fallbackStrategy(
  product: ProductProfile,
  prompt: string,
): SearchStrategy {
  const markets =
    product.targetMarkets.length > 0
      ? product.targetMarkets.slice(0, 2)
      : ["the target market"];
  const retailerTypes =
    product.idealRetailerTypes.length > 0
      ? product.idealRetailerTypes.slice(0, 3)
      : ["independent retailers"];

  const queries = retailerTypes.flatMap((retailer, index) => {
    const market = markets[index % markets.length];
    return `${retailer} ${product.categories[0] ?? "consumer goods"} in ${market}`;
  });

  return {
    queries: [...new Set(queries)].slice(0, 4),
    summary: `Prioritizing ${retailerTypes.join(", ")} that serve ${product.targetCustomer.toLowerCase()}. ${prompt}`.trim(),
  };
}

function extractJson(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  return JSON.parse(fenced ?? content) as SearchStrategy;
}

export async function createSearchStrategy(
  product: ProductProfile,
  prompt: string,
): Promise<{ strategy: SearchStrategy; live: boolean }> {
  const apiKey =
    process.env.GEMINI_KEY ??
    process.env.GEMINI_API_KEY ??
    process.env.LLM_API_KEY;

  if (!apiKey) {
    return { strategy: fallbackStrategy(product, prompt), live: false };
  }

  const baseUrl = (
    process.env.LLM_BASE_URL ?? defaultGeminiBaseUrl
  ).replace(/\/$/, "");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL ?? defaultGeminiModel,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a retail distribution strategist. Return strict JSON with: queries (an array of exactly 4 concise Google Places text searches, each containing a retailer category and a real geographic market) and summary (one sentence). Optimize for stores likely to buy wholesale, not consumers or generic places.",
        },
        {
          role: "user",
          content: JSON.stringify({ product, distributionGoal: prompt }),
        },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    console.warn(`LLM strategy failed: ${await readErrorResponse(response)}`);
    return { strategy: fallbackStrategy(product, prompt), live: false };
  }

  try {
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("No strategy returned");
    const strategy = extractJson(content);
    if (!Array.isArray(strategy.queries) || strategy.queries.length === 0) {
      throw new Error("No search queries returned");
    }
    return {
      strategy: { ...strategy, queries: strategy.queries.slice(0, 4) },
      live: true,
    };
  } catch {
    return { strategy: fallbackStrategy(product, prompt), live: false };
  }
}
