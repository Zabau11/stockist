import { randomUUID } from "node:crypto";
import { assertPublicUrl, normalizeWebsite } from "../lib/url.js";
import type { DiscoveryResponse } from "../types.js";
import { analyzeProduct } from "./context.js";
import { enrichContacts } from "./contacts.js";
import { createDemoLeads } from "./demo.js";
import { createSearchStrategy } from "./llm.js";
import { findPlaces } from "./places.js";
import { rankPlaces } from "./ranking.js";
import { saveDiscovery } from "./storage.js";

export async function discoverStores(input: {
  website: string;
  prompt: string;
}): Promise<DiscoveryResponse> {
  const website = normalizeWebsite(input.website);
  await assertPublicUrl(website);
  const { profile, live: contextLive } = await analyzeProduct(
    website,
    input.prompt,
  );
  const { strategy, live: llmLive } = await createSearchStrategy(
    profile,
    input.prompt,
  );
  const { places, live: placesLive } = await findPlaces(strategy.queries);

  const leads =
    placesLive && places.length > 0
      ? rankPlaces(await enrichContacts(places), profile)
      : createDemoLeads(profile);

  const demo = !placesLive;
  const sources = [
    contextLive ? "Context.dev product analysis" : "Local product inference",
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
  };

  void saveDiscovery(response, { website, prompt: input.prompt });
  return response;
}
