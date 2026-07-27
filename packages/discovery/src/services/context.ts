import { readErrorResponse } from "../lib/errors";
import { assertPublicUrl, normalizeWebsite } from "../lib/url";
import type {
  BrandColor,
  BrandIdentity,
  ProductBrief,
  ProductProfile,
} from "../types";

type ContextLogo = {
  url?: string;
  mode?: string;
  type?: string;
  resolution?: {
    width?: number;
    height?: number;
  };
};

type ContextBrand = {
  slogan?: string;
  colors?: Array<{ hex?: string; name?: string }>;
  logos?: ContextLogo[];
  backdrops?: ContextLogo[];
};

type ContextStyleguide = {
  mode?: string;
  colors?: Record<string, unknown>;
  typography?: {
    headings?: {
      h1?: { fontFamily?: string };
    };
    p?: { fontFamily?: string };
  };
};

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
    differentiators: { type: "array", items: { type: "string" } },
    requirements: { type: "array", items: { type: "string" } },
    exclusions: { type: "array", items: { type: "string" } },
  },
  required: [
    "name",
    "summary",
    "categories",
    "idealRetailerTypes",
    "pricePositioning",
    "targetCustomer",
  "targetMarkets",
  "differentiators",
  "requirements",
  "exclusions",
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

export function emptyBrandIdentity(): BrandIdentity {
  return { source: "unavailable", colors: [] };
}

function normalizeHex(value: unknown) {
  if (typeof value !== "string") return undefined;
  const hex = value.trim();
  if (/^#[\da-f]{3}$/i.test(hex)) {
    return `#${hex.slice(1).split("").map((character) => `${character}${character}`).join("")}`.toUpperCase();
  }
  if (/^#[\da-f]{8}$/i.test(hex)) return hex.slice(0, 7).toUpperCase();
  return /^#[\da-f]{6}$/i.test(hex) ? hex.toUpperCase() : undefined;
}

function colorValue(value: unknown) {
  if (typeof value === "string") return normalizeHex(value);
  if (!value || typeof value !== "object") return undefined;
  const color = value as Record<string, unknown>;
  return normalizeHex(color.hex ?? color.value ?? color.color);
}

function isAssetUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function logoArea(logo: ContextLogo) {
  return (logo.resolution?.width ?? 0) * (logo.resolution?.height ?? 0);
}

function selectLogo(logos: ContextLogo[], type: "logo" | "icon") {
  return logos
    .filter((logo) => logo.type === type && isAssetUrl(logo.url))
    .sort((left, right) => logoArea(right) - logoArea(left))[0]?.url;
}

function combineColors(brand: ContextBrand | undefined, styleguide: ContextStyleguide | undefined) {
  const colors: BrandColor[] = [];
  const seen = new Set<string>();
  const add = (hexValue: unknown, role: BrandColor["role"], name?: string) => {
    const hex = normalizeHex(hexValue);
    if (!hex || seen.has(hex)) return;
    seen.add(hex);
    colors.push({ hex, role, ...(name ? { name } : {}) });
  };

  const brandColors = brand?.colors ?? [];
  brandColors.forEach((color, index) => {
    add(color.hex, index === 0 ? "primary" : index === 1 ? "secondary" : "other", color.name);
  });

  for (const [name, value] of Object.entries(styleguide?.colors ?? {})) {
    const role = ["accent", "background", "text"].includes(name.toLowerCase())
      ? name.toLowerCase() as BrandColor["role"]
      : "other";
    add(colorValue(value), role, name);
  }

  return colors.slice(0, 10);
}

async function readContextPayload<T>(response: Response, label: string) {
  if (!response.ok) {
    console.warn(`${label} failed: ${await readErrorResponse(response)}`);
    return undefined;
  }
  return await response.json() as T;
}

export async function retrieveBrandIdentity(website: string): Promise<BrandIdentity> {
  const apiKey = process.env.CONTEXT_DEV_API_KEY;
  if (!apiKey) return emptyBrandIdentity();

  const domain = new URL(website).hostname.replace(/^www\./, "");
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    const [brandResult, styleguideResult] = await Promise.allSettled([
      fetch("https://api.context.dev/v1/brand/retrieve", {
        method: "POST",
        headers,
        body: JSON.stringify({ type: "by_domain", domain, timeoutMS: 60_000 }),
        signal: AbortSignal.timeout(65_000),
      }).then((response) => readContextPayload<{ brand?: ContextBrand }>(response, "Brand retrieval")),
      fetch(`https://api.context.dev/v1/web/styleguide?domain=${encodeURIComponent(domain)}&timeoutMS=60000`, {
        headers,
        signal: AbortSignal.timeout(65_000),
      }).then((response) => readContextPayload<{ styleguide?: ContextStyleguide; data?: ContextStyleguide } & ContextStyleguide>(response, "Styleguide retrieval")),
    ]);

    const brandPayload = brandResult.status === "fulfilled" ? brandResult.value : undefined;
    const styleguidePayload = styleguideResult.status === "fulfilled" ? styleguideResult.value : undefined;
    const brand = brandPayload?.brand;
    const styleguide = styleguidePayload?.styleguide ?? styleguidePayload?.data ?? styleguidePayload;
    const logos = brand?.logos ?? [];
    const backdrops = brand?.backdrops ?? [];
    const colors = combineColors(brand, styleguide);
    const identity: BrandIdentity = {
      source: "context",
      colors,
      logoUrl: selectLogo(logos, "logo") ?? logos.find((logo) => isAssetUrl(logo.url))?.url,
      iconUrl: selectLogo(logos, "icon"),
      backdropUrl: backdrops.find((backdrop) => isAssetUrl(backdrop.url))?.url,
      slogan: brand?.slogan?.trim() || undefined,
      headingFont: styleguide?.typography?.headings?.h1?.fontFamily?.trim() || undefined,
      bodyFont: styleguide?.typography?.p?.fontFamily?.trim() || undefined,
      mode: styleguide?.mode,
    };
    const hasData = Boolean(
      identity.logoUrl ||
      identity.iconUrl ||
      identity.backdropUrl ||
      identity.slogan ||
      identity.colors.length ||
      identity.headingFont ||
      identity.bodyFont,
    );
    return hasData ? identity : emptyBrandIdentity();
  } catch (error) {
    console.warn("Brand identity retrieval failed:", error);
    return emptyBrandIdentity();
  }
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
    website,
    brandName: titleFromUrl(website),
    name: titleFromUrl(website),
    brandIdentity: emptyBrandIdentity(),
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
    differentiators: [],
    requirements: [],
    exclusions: [],
    distributionGoal: prompt,
    retailerPreference: "either",
  };
}

export function briefFromProfile(profile: ProductProfile): ProductBrief {
  const { name, ...brief } = profile;
  return { ...brief, brandName: name };
}

export function profileFromBrief(brief: ProductBrief): ProductProfile {
  return { ...brief, name: brief.brandName };
}

export async function analyzeProduct(
  website: string,
  prompt: string,
): Promise<{ profile: ProductProfile; live: boolean }> {
  const apiKey = process.env.CONTEXT_DEV_API_KEY;
  if (!apiKey) {
    return { profile: inferProductProfile(website, prompt), live: false };
  }

  try {
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
      console.warn(`Product analysis failed: ${await readErrorResponse(response)}`);
      return { profile: inferProductProfile(website, prompt), live: false };
    }

    const payload = (await response.json()) as { data: Partial<ProductProfile> };
    const fallback = inferProductProfile(website, prompt);
    const profile: ProductProfile = {
      ...fallback,
      ...payload.data,
      name: payload.data.name ?? fallback.name,
      brandName: payload.data.brandName ?? payload.data.name ?? fallback.brandName,
      brandIdentity: fallback.brandIdentity,
      distributionGoal: prompt,
      retailerPreference: payload.data.retailerPreference ?? "either",
      differentiators: payload.data.differentiators ?? [],
      requirements: payload.data.requirements ?? [],
      exclusions: payload.data.exclusions ?? [],
    };
    return { profile, live: true };
  } catch (error) {
    console.warn("Product analysis failed:", error);
    return { profile: inferProductProfile(website, prompt), live: false };
  }
}

export async function analyzeProductBrief(input: {
  website: string;
  distributionGoal: string;
  conversationId: string;
}) {
  const website = normalizeWebsite(input.website);
  await assertPublicUrl(website);
  const [{ profile, live }, brandIdentity] = await Promise.all([
    analyzeProduct(website, input.distributionGoal),
    retrieveBrandIdentity(website),
  ]);
  const enrichedProfile = { ...profile, brandIdentity };
  const now = new Date().toISOString();
  return {
    revision: {
      conversationId: input.conversationId,
      website,
      version: 1,
      status: "draft" as const,
      source: live ? "context" as const : "fallback" as const,
      createdAt: now,
      updatedAt: now,
      needsReview: !live,
      brief: briefFromProfile(enrichedProfile),
    },
    live,
  };
}
