import { createGoogle } from "@ai-sdk/google";
import { createUIMessageStream, createUIMessageStreamResponse, generateText, Output, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { analyzeProductBrief, discoverStores, type DiscoveryResponse, type ProductBrief, type ProductBriefRevision } from "@stockist/discovery";
import type { ChatDataParts, RetailerResults, StockistMessage } from "@/lib/chat-types";
import type { StoreLead } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const assetUrlSchema = z.string().trim().url().max(2048).refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "https:" || protocol === "http:";
}, "Use an HTTP or HTTPS URL.");

const brandIdentitySchema = z.object({
  source: z.enum(["context", "unavailable"]),
  logoUrl: assetUrlSchema.optional(),
  iconUrl: assetUrlSchema.optional(),
  backdropUrl: assetUrlSchema.optional(),
  slogan: z.string().trim().max(300).optional(),
  colors: z.array(z.object({
    hex: z.string().regex(/^#[\dA-F]{6}$/i),
    name: z.string().trim().max(80).optional(),
    role: z.enum(["primary", "secondary", "accent", "background", "text", "other"]).optional(),
  })).max(10),
  headingFont: z.string().trim().max(200).optional(),
  bodyFont: z.string().trim().max(200).optional(),
  mode: z.string().trim().max(40).optional(),
});

const briefSchema = z.object({
  website: z.string().trim().min(3).max(2048),
  brandName: z.string().trim().min(1).max(120),
  brandIdentity: brandIdentitySchema.default({ source: "unavailable", colors: [] }),
  summary: z.string().trim().min(1).max(1200),
  categories: z.array(z.string().trim().min(1).max(80)).min(1).max(6),
  targetCustomer: z.string().trim().min(1).max(500),
  pricePositioning: z.string().trim().min(1).max(240),
  distributionGoal: z.string().trim().max(1000),
  targetMarkets: z.array(z.string().trim().min(1).max(100)).min(1).max(8),
  idealRetailerTypes: z.array(z.string().trim().min(1).max(100)).min(1).max(8),
  retailerPreference: z.enum(["independent", "chain", "either"]),
  differentiators: z.array(z.string().trim().min(1).max(180)).max(8),
  requirements: z.array(z.string().trim().min(1).max(180)).max(8),
  exclusions: z.array(z.string().trim().min(1).max(180)).max(8),
});

const revisionSchema = z.object({
  conversationId: z.string().uuid(),
  website: z.string().trim().min(3).max(2048),
  version: z.number().int().positive(),
  status: z.enum(["draft", "confirmed"]),
  source: z.enum(["context", "fallback"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  needsReview: z.boolean(),
  brief: briefSchema,
});

const requestSchema = z.object({
  action: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("analyze_product"),
      conversationId: z.string().uuid(),
      query: z.string().trim().min(1).max(2000).optional(),
      website: z.string().trim().min(3).max(2048).optional(),
      distributionGoal: z.string().trim().max(1000).optional(),
      messages: z.array(z.unknown()).max(50),
    }),
    z.object({ type: z.literal("confirm_brief"), conversationId: z.string().uuid(), revision: revisionSchema, messages: z.array(z.unknown()).max(50) }),
    z.object({ type: z.literal("follow_up"), conversationId: z.string().uuid(), website: z.string().trim().min(3).max(2048), briefVersion: z.number().int().positive(), brief: briefSchema, leads: z.array(z.unknown()).max(100).default([]), messages: z.array(z.unknown()).max(50) }),
  ]),
});

const interpretedRequestSchema = z.object({
  website: z.string().max(2048).nullable().describe("The exact product website or domain explicitly supplied by the user. Never infer or guess one."),
  distributionGoal: z.string().max(1000).describe("A concise, complete statement of what retailers or markets the user wants."),
  clarification: z.string().max(300).nullable().describe("A short question only when the product website is missing."),
});

type InterpretedRequest = z.infer<typeof interpretedRequestSchema>;

function latestPrompt(messages: UIMessage[]) {
  const message = [...messages].reverse().find((item) => item.role === "user");
  return message?.parts.filter((part) => part.type === "text").map((part) => part.text).join(" ").trim() ?? "";
}

function userTranscript(messages: UIMessage[], query: string) {
  const entries = messages
    .filter((message) => message.role === "user")
    .map((message) => message.parts.filter((part) => part.type === "text").map((part) => part.text).join(" ").trim())
    .filter(Boolean);
  if (!entries.includes(query)) entries.push(query);
  return entries.join("\n");
}

function explicitWebsite(text: string) {
  const match = text.match(/\b(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<>"']*)?/i)?.[0];
  return match?.replace(/[),.;!?]+$/, "");
}

async function interpretRequest(query: string, messages: UIMessage[]): Promise<InterpretedRequest> {
  const transcript = userTranscript(messages, query);
  const fallbackWebsite = explicitWebsite(transcript) ?? null;
  const fallback: InterpretedRequest = {
    website: fallbackWebsite,
    distributionGoal: transcript.slice(0, 1000),
    clarification: fallbackWebsite ? null : "What is the product website? You can paste the domain or a full URL.",
  };
  const key = process.env.GEMINI_KEY ?? process.env.GEMINI_API_KEY;
  if (!key) return fallback;

  try {
    const google = createGoogle({ apiKey: key });
    const result = await generateText({
      model: google(process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite"),
      output: Output.object({ schema: interpretedRequestSchema }),
      system: [
        "Interpret a manufacturer's free-form retailer-discovery request.",
        "Extract the exact product website only if the user explicitly wrote a URL or domain.",
        "Never guess a domain from a brand name.",
        "Preserve useful product, retailer, location, price-positioning, and exclusion details in distributionGoal.",
        "If the website is missing, ask only for the website in clarification.",
      ].join(" "),
      prompt: transcript,
    });
    const interpreted = result.output;
    const suppliedWebsite = explicitWebsite(transcript);
    return {
      website: suppliedWebsite ?? null,
      distributionGoal: interpreted.distributionGoal.trim().slice(0, 1000) || transcript.slice(0, 1000),
      clarification: suppliedWebsite
        ? null
        : interpreted.clarification?.trim() || fallback.clarification,
    };
  } catch (error) {
    console.warn("Request interpretation failed:", error);
    return fallback;
  }
}

function hasRequiredBriefFields(brief: ProductBrief) {
  return Boolean(brief.distributionGoal.trim() && brief.categories.length && brief.targetMarkets.length && brief.idealRetailerTypes.length);
}

function writeText(writer: Parameters<NonNullable<Parameters<typeof createUIMessageStream<StockistMessage>>[0]["execute"]>>[0]["writer"], text: string, id: string) {
  writer.write({ type: "text-start", id });
  writer.write({ type: "text-delta", id, delta: text });
  writer.write({ type: "text-end", id });
}

function resultPart(response: DiscoveryResponse, briefVersion: number): RetailerResults {
  return {
    leadIds: response.leads.map((lead) => lead.id),
    leads: response.leads,
    resultSetId: response.runId,
    briefVersion,
    createdAt: response.completedAt,
    demo: response.demo,
    sources: response.sources,
    strategy: response.strategy,
  };
}

function responseSummary(response: DiscoveryResponse, prompt: string) {
  const top = response.leads.slice(0, 3).map((lead) => lead.name).join(", ");
  return `${response.leads.length} retailer${response.leads.length === 1 ? "" : "s"} matched the confirmed brief${prompt ? ` for “${prompt}”` : ""}. Strongest early signals: ${top || "none yet"}.`;
}

export async function POST(request: Request) {
  const raw = await request.json() as Record<string, unknown>;
  const nestedBody = raw.body && typeof raw.body === "object" ? raw.body as Record<string, unknown> : undefined;
  const requestMessages = Array.isArray(raw.messages) ? raw.messages : Array.isArray(nestedBody?.messages) ? nestedBody.messages : [];
  const actionCandidate = raw.action ?? nestedBody?.action;
  const action = actionCandidate && typeof actionCandidate === "object"
    ? { ...(actionCandidate as Record<string, unknown>), messages: Array.isArray((actionCandidate as Record<string, unknown>).messages) ? (actionCandidate as Record<string, unknown>).messages : requestMessages }
    : {
      type: "analyze_product",
      conversationId: raw.conversationId ?? nestedBody?.conversationId,
      query: raw.query ?? raw.prompt ?? nestedBody?.query ?? nestedBody?.prompt,
      website: raw.website ?? nestedBody?.website,
      distributionGoal: raw.distributionGoal ?? nestedBody?.distributionGoal,
      messages: requestMessages,
    };
  const parsed = requestSchema.safeParse({ ...raw, action });
  if (!parsed.success) return Response.json({ error: "Invalid chat action or product brief.", details: parsed.error.issues }, { status: 400 });
  const input = parsed.data.action;
  const runId = crypto.randomUUID();
  const progressId = `progress-${runId}`;

  const stream = createUIMessageStream<StockistMessage>({
    execute: async ({ writer }) => {
      const writeProgress = (data: ChatDataParts["discovery-progress"]) => writer.write({ type: "data-discovery-progress", id: progressId, data: { ...data, runId } });
      try {
        if (input.type === "analyze_product") {
          const query = input.query ?? [input.website, input.distributionGoal].filter(Boolean).join(" ");
          if (!query.trim()) throw new Error("Tell me about the product and the retailers you want to find.");
          writeProgress({ stage: "interpreting_request", label: "Understanding your request" });
          const interpreted = await interpretRequest(query, input.messages as UIMessage[]);
          if (!interpreted.website) {
            writeProgress({ stage: "awaiting_request_details", label: "Product website needed" });
            writeText(writer, interpreted.clarification ?? "What is the product website?", `clarification-${runId}`);
            return;
          }
          writer.write({
            type: "data-request-understanding",
            id: `understanding-${runId}`,
            data: {
              website: interpreted.website,
              distributionGoal: interpreted.distributionGoal,
            },
          });
          writeProgress({ stage: "analyzing_product", label: "Reading the product website" });
          const analyzed = await analyzeProductBrief({
            website: interpreted.website,
            distributionGoal: interpreted.distributionGoal,
            conversationId: input.conversationId,
          });
          writer.write({ type: "data-product-brief", id: `brief-${input.conversationId}-1`, data: analyzed.revision as ProductBriefRevision });
          writeProgress({ stage: "awaiting_brief_confirmation", label: "Review your product brief" });
          writeText(writer, "I extracted a product brief for you to review. Confirm it when the category, market, retailer type, and distribution goal look right.", `summary-${runId}`);
          return;
        }

        const brief = input.type === "confirm_brief" ? input.revision.brief : input.brief;
        const version = input.type === "confirm_brief" ? input.revision.version : input.briefVersion;
        if (input.type === "confirm_brief" && !hasRequiredBriefFields(brief)) {
          writer.write({ type: "data-warning", data: { message: "Add a distribution goal, category, target market, and retailer type before confirming." } });
          writeProgress({ stage: "awaiting_brief_confirmation", label: "Complete the required brief fields" });
          return;
        }

        const confirmedRevision: ProductBriefRevision = {
          conversationId: input.conversationId,
          website: brief.website,
          version,
          status: "confirmed",
          source: input.type === "confirm_brief" ? input.revision.source : "context",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          needsReview: false,
          brief,
        };
        if (input.type === "confirm_brief") writer.write({ type: "data-product-brief", id: `brief-${input.conversationId}-${version}`, data: confirmedRevision });
        writeProgress({ stage: "planning_search", label: "Building a retail search strategy" });

        if (input.type === "follow_up" && input.leads.length && /\b(only|filter|show)\b/i.test(latestPrompt(input.messages as UIMessage[]))) {
          const prompt = latestPrompt(input.messages as UIMessage[]).toLowerCase();
          const filtered = (input.leads as StoreLead[]).filter((lead) => !/email/.test(prompt) || Boolean(lead.email));
          const filteredResult: RetailerResults = { leadIds: filtered.map((lead) => lead.id), leads: filtered, resultSetId: runId, briefVersion: version, createdAt: new Date().toISOString(), demo: false, sources: ["Existing conversation results"] };
          writer.write({ type: "data-retailer-results", id: `results-${runId}`, data: filteredResult });
          writeProgress({ stage: "complete", label: "Filter applied locally", storesRetained: filtered.length });
          writeText(writer, `I filtered the existing result set and kept ${filtered.length} stores.`, `summary-${runId}`);
          return;
        }

        writeProgress({ stage: "searching_places", label: "Finding relevant stores" });
        const response = await discoverStores({ brief, briefVersion: version });
        if (request.signal.aborted) throw new DOMException("Request cancelled", "AbortError");
        const results = resultPart(response, version);
        writer.write({ type: "data-retailer-results", id: `results-${response.runId}`, data: results });
        writeProgress({ stage: "enriching_contacts", label: "Checking public contact pages", contactsChecked: response.leads.length, emailsFound: response.leads.filter((lead) => lead.email).length });
        writeProgress({ stage: "scoring_retailers", label: "Ranking retailer fit", storesRetained: response.leads.length });
        writeProgress({ stage: "complete", label: "Discovery complete", storesRetained: response.leads.length });

        const key = process.env.GEMINI_KEY ?? process.env.GEMINI_API_KEY;
        if (key) {
          const google = createGoogle({ apiKey: key });
          const generated = streamText({ model: google(process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite"), system: "Summarize only the confirmed retailer discovery result in two concise sentences. Never invent facts.", prompt: JSON.stringify({ brief, leads: response.leads.slice(0, 8) }) });
          writer.merge(generated.toUIMessageStream());
        } else writeText(writer, responseSummary(response, brief.distributionGoal), `summary-${runId}`);
      } catch (error) {
        const cancelled = error instanceof DOMException && error.name === "AbortError";
        writeProgress({ stage: cancelled ? "cancelled" : "failed", label: cancelled ? "Run cancelled" : "Discovery failed" });
        writer.write({ type: "data-run-error", data: { message: cancelled ? "This run was cancelled." : error instanceof Error ? error.message : "Discovery failed.", retryable: !cancelled } });
      }
    },
  });
  return createUIMessageStreamResponse({ stream, headers: { "Cache-Control": "no-store" } });
}
