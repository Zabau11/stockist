import { AppError, readErrorResponse } from "../lib/errors";
import type { ProductProfile } from "../types";

const productSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "The product or brand name.",
    },
    summary: {
      type: "string",
      description: "A concise summary of what the product is and why customers buy it.",
    },
    categories: {
      type: "array",
      items: { type: "string" },
      description: "Two to four clear retail product categories.",
    },
    idealRetailerTypes: {
      type: "array",
      items: { type: "string" },
      description: "Three to six specific kinds of physical stores likely to stock this product.",
    },
    pricePositioning: {
      type: "string",
      description: "One of value, mid-market, premium, or luxury, with a short explanation.",
    },
    targetCustomer: {
      type: "string",
      description: "A concise description of the primary end customer.",
    },
    targetMarkets: {
      type: "array",
      items: { type: "string" },
      description: "Cities, regions, or countries explicitly suggested by the site.",
    },
  },
  required: [
    "name",
    "summary",
    "categories",
    "idealRetailerTypes",
    "pricePositioning",
    "targetCustomer",
    "targetMarkets",
  ],
  additionalProperties: false,
} as const;

function titleFromUrl(website: string) {
  const hostname = new URL(website).hostname.replace(/^www\./, "");
  const name = hostname.split(".")[0] ?? "Your product";
  return name
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function inferProductProfile(
  website: string,
  prompt: string,
): ProductProfile {
  const lower = prompt.toLowerCase();
  const matchedCategory =
    [
      "skincare",
      "beauty",
      "coffee",
      "food",
      "beverage",
      "fashion",
      "jewelry",
      "homeware",
      "supplement",
      "pet",
    ].find((category) => lower.includes(category)) ?? "consumer product";

  const marketMatch = prompt.match(
    /(?:in|around|across|near)\s+([A-Z][A-Za-z\s,.-]{2,40})/,
  );
  const targetMarket = marketMatch?.[1]?.trim() || "the target market";

  return {
    name: titleFromUrl(website),
    summary: prompt
      ? `A ${matchedCategory} brand looking for retail distribution. ${prompt}`
      : `A ${matchedCategory} brand looking for retail distribution.`,
    categories: [matchedCategory],
    idealRetailerTypes: [
      "independent specialty stores",
      "curated lifestyle boutiques",
      "regional retailers",
    ],
    pricePositioning: "To be confirmed from the product website",
    targetCustomer: "Customers who actively shop this product category",
    targetMarkets: [targetMarket],
  };
}

export async function analyzeProduct(
  website: string,
  prompt: string,
): Promise<{ profile: ProductProfile; live: boolean }> {
  const apiKey = process.env.CONTEXT_DEV_API_KEY;
  if (!apiKey) {
    return { profile: inferProductProfile(website, prompt), live: false };
  }

  const response = await fetch("https://api.context.dev/v1/web/extract", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: website,
      schema: productSchema,
      instructions: [
        "Analyze the manufacturer's product and its retail fit.",
        "Use the user's distribution goal as additional context:",
        prompt || "No additional distribution instructions were supplied.",
        "Only include target markets supported by the website or user instruction.",
      ].join(" "),
      factCheck: false,
      maxPages: 5,
      maxDepth: 2,
      stopAfterMs: 60000,
      timeoutMS: 90000,
      tags: ["stockist", "product-analysis"],
    }),
    signal: AbortSignal.timeout(95_000),
  });

  if (!response.ok) {
    throw new AppError(
      `Product analysis failed: ${await readErrorResponse(response)}`,
      502,
    );
  }

  const payload = (await response.json()) as { data: ProductProfile };
  return { profile: payload.data, live: true };
}
