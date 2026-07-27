import { randomUUID } from "node:crypto";
import { assertPublicUrl, normalizeWebsite } from "../lib/url";
import type { DiscoveryResponse, ProductBrief } from "../types";
import { analyzeProduct, profileFromBrief, retrieveBrandIdentity } from "./context";
import { enrichContacts } from "./contacts";
import { createDemoLeads } from "./demo";
import { createSearchStrategy } from "./llm";
import { findPlaces } from "./places";
import { rankPlaces } from "./ranking";

export async function discoverStores(input: { brief: ProductBrief; briefVersion?: number }): Promise<DiscoveryResponse>;
export async function discoverStores(input: { website: string; prompt: string }): Promise<DiscoveryResponse>;
export async function discoverStores(input: { brief: ProductBrief; briefVersion?: number } | { website: string; prompt: string }): Promise<DiscoveryResponse> {
  let brief: ProductBrief;
  let website: string;
  let contextLive = true;
  let briefVersion: number | undefined;
  if ("brief" in input) {
    brief = input.brief;
    website = normalizeWebsite(brief.website ?? "");
    briefVersion = input.briefVersion;
  } else {
    website = normalizeWebsite(input.website);
    const [analyzed, brandIdentity] = await Promise.all([
      analyzeProduct(website, input.prompt),
      retrieveBrandIdentity(website),
    ]);
    brief = {
      ...analyzed.profile,
      brandName: analyzed.profile.name,
      brandIdentity,
    };
    contextLive = analyzed.live;
  }
  await assertPublicUrl(website);
  const profile = profileFromBrief(brief);
  const { strategy, live: llmLive } = await createSearchStrategy(
    profile,
    brief.distributionGoal,
  );
  const { places, live: placesLive } = await findPlaces(strategy.queries);

  const leads =
    placesLive && places.length > 0
      ? rankPlaces(await enrichContacts(places), profile)
      : createDemoLeads(profile);

  const demo = !placesLive;
  const sources = [
    contextLive ? "Context.dev product analysis" : "Local product inference",
    brief.brandIdentity.source === "context" ? "Context.dev brand and styleguide" : undefined,
    llmLive ? "LLM retail strategy" : "Rule-based retail strategy",
    placesLive ? "Google Places store discovery" : "Sample retailer dataset",
    placesLive ? "Public store websites for contact enrichment" : undefined,
  ].filter((source): source is string => Boolean(source));

  const response: DiscoveryResponse = {
    runId: randomUUID(),
    demo,
    product: profile,
    strategy,
    leads,
    sources,
    completedAt: new Date().toISOString(),
    brief,
    briefVersion,
  };

  return response;
}
