import { createGoogle } from "@ai-sdk/google";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  Output,
  streamText,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { discoverStores, type DiscoveryResponse } from "@stockist/discovery";
import type { ChatDataParts, StockistMessage } from "@/lib/chat-types";
import type { StoreLead } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const requestSchema = z.object({
  messages: z.array(z.unknown()).max(50),
  website: z.string().trim().min(3).max(2048),
  conversationId: z.string().uuid(),
  leads: z.array(z.unknown()).max(100).optional(),
});

function latestPrompt(messages: UIMessage[]) {
  const message = [...messages].reverse().find((item) => item.role === "user");
  return message?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim() ?? "";
}

function classify(prompt: string) {
  const lower = prompt.toLowerCase();
  if (/\b(find more|more stores|expand|additional)\b/.test(lower)) return "find_more";
  if (/\b(shortlist|save|select)\b/.test(lower)) return "shortlist";
  if (/\b(why|explain|how did)\b/.test(lower)) return "explain";
  if (/\b(only|filter|show|sort)\b/.test(lower)) return "filter";
  return "discover";
}

async function classifyAction(prompt: string) {
  const key = process.env.GEMINI_KEY ?? process.env.GEMINI_API_KEY;
  if (!key) return classify(prompt);
  try {
    const google = createGoogle({ apiKey: key });
    const result = await generateText({
      model: google(process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite"),
      system: "Classify the user's follow-up into exactly one action. Use discover for a new search, filter for deterministic filtering of current results, find_more for additional Places searches, explain for evidence questions, shortlist for selection changes, or clarify when intent is missing.",
      prompt,
      output: Output.object({ schema: z.object({ action: z.enum(["discover", "filter", "find_more", "explain", "shortlist", "clarify"]) }) }),
    });
    return result.output.action;
  } catch {
    return classify(prompt);
  }
}

function summary(response: DiscoveryResponse, prompt: string) {
  const top = response.leads.slice(0, 3).map((lead) => lead.name).join(", ");
  return `${response.leads.length} retailer${response.leads.length === 1 ? "" : "s"} matched your goal${prompt ? `: “${prompt}”` : ""}. The strongest early signals are ${top || "still being evaluated"}. Use the follow-up box below to narrow the market, find more stores, or shortlist leads.`;
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid chat request." }, { status: 400 });

  const messages = parsed.data.messages as UIMessage[];
  const prompt = latestPrompt(messages);
  const runId = crypto.randomUUID();
  const progressId = `progress-${runId}`;

  const stream = createUIMessageStream<StockistMessage>({
    execute: async ({ writer }) => {
      const writeProgress = (data: ChatDataParts["discovery-progress"]) =>
        writer.write({ type: "data-discovery-progress", id: progressId, data: { ...data, runId } });

      try {
        const action = await classifyAction(prompt);
        const existingLeads = parsed.data.leads as StoreLead[] | undefined;
        if (action === "filter" && existingLeads?.length) {
          const lower = prompt.toLowerCase();
          const filtered = existingLeads.filter((lead) => {
            if (/email/.test(lower) && !lead.email) return false;
            const score = lower.match(/(?:above|over|at least)\s+(\d+)/)?.[1];
            if (score && lead.score < Number(score)) return false;
            return true;
          });
          writer.write({ type: "data-retailer-results", id: `results-${runId}`, data: { leadIds: filtered.map((lead) => lead.id), leads: filtered, resultSetId: runId, demo: false, sources: ["Existing conversation results"] } });
          writeProgress({ stage: "complete", label: "Filter applied locally", storesRetained: filtered.length });
          const textId = `summary-${runId}`;
          writer.write({ type: "text-start", id: textId });
          writer.write({ type: "text-delta", id: textId, delta: `I filtered the existing retailer pool and kept ${filtered.length} store${filtered.length === 1 ? "" : "s"}.` });
          writer.write({ type: "text-end", id: textId });
          return;
        }
        writeProgress({ stage: "analyzing_product", label: "Reading the product website" });
        const response = await discoverStores({ website: parsed.data.website, prompt });
        if (request.signal.aborted) throw new DOMException("Request cancelled", "AbortError");

        writer.write({ type: "data-product-profile", id: `profile-${runId}`, data: response.product });
        writeProgress({ stage: "planning_search", label: "Building a retail search strategy" });
        writeProgress({ stage: "searching_places", label: "Finding relevant stores", candidatesFound: response.leads.length, queriesCompleted: response.strategy.queries.length });
        writeProgress({ stage: "enriching_contacts", label: "Checking public contact pages", contactsChecked: response.leads.length, emailsFound: response.leads.filter((lead) => lead.email).length });
        writeProgress({ stage: "scoring_retailers", label: "Ranking retailer fit", storesRetained: response.leads.length });
        writer.write({
          type: "data-retailer-results",
          id: `results-${runId}`,
          data: {
            leadIds: response.leads.map((lead) => lead.id),
            leads: response.leads,
            resultSetId: response.runId,
            demo: response.demo,
            sources: response.sources,
            strategy: response.strategy,
          },
        });
        writeProgress({ stage: "complete", label: "Discovery complete", storesRetained: response.leads.length });

        const key = process.env.GEMINI_KEY ?? process.env.GEMINI_API_KEY;
        if (key) {
          const google = createGoogle({ apiKey: key });
          const result = streamText({
            model: google(process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite"),
            system: "You are the concise assistant in a retailer discovery app. Summarize the provided discovery result in two short sentences. Do not invent facts.",
            prompt: JSON.stringify({ product: response.product, leads: response.leads.slice(0, 8), userPrompt: prompt }),
          });
          writer.merge(result.toUIMessageStream());
        } else {
          const text = summary(response, prompt);
          const textId = `summary-${runId}`;
          writer.write({ type: "text-start", id: textId });
          writer.write({ type: "text-delta", id: textId, delta: text });
          writer.write({ type: "text-end", id: textId });
        }
      } catch (error) {
        const cancelled = error instanceof DOMException && error.name === "AbortError";
        writeProgress({ stage: cancelled ? "cancelled" : "failed", label: cancelled ? "Run cancelled" : "Discovery failed" });
        writer.write({ type: "data-run-error", data: { message: cancelled ? "This run was cancelled." : error instanceof Error ? error.message : "Discovery failed.", retryable: !cancelled } });
      }
    },
  });

  return createUIMessageStreamResponse({ stream, headers: { "Cache-Control": "no-store" } });
}
