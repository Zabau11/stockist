import type { UIMessage } from "ai";
import type { DiscoveryResponse, ProductBrief, ProductBriefRevision, StoreLead } from "@/lib/types";

export type ProgressStage =
  | "analyzing_product"
  | "awaiting_brief_confirmation"
  | "planning_search"
  | "searching_places"
  | "enriching_contacts"
  | "scoring_retailers"
  | "complete"
  | "partial"
  | "failed"
  | "cancelled";

export type DiscoveryProgress = {
  stage: ProgressStage;
  label: string;
  queriesCompleted?: number;
  candidatesFound?: number;
  contactsChecked?: number;
  emailsFound?: number;
  storesRetained?: number;
  runId?: string;
};

export type RetailerResults = {
  leadIds: string[];
  leads: StoreLead[];
  resultSetId: string;
  demo: boolean;
  sources: string[];
  strategy?: DiscoveryResponse["strategy"];
  briefVersion: number;
  createdAt: string;
};

export type ChatDataParts = {
  "product-brief": ProductBriefRevision;
  "discovery-progress": DiscoveryProgress;
  "retailer-results": RetailerResults;
  "export-ready": { scope: "all" | "shortlist"; filename: string };
  warning: { message: string };
  "run-error": { message: string; retryable: boolean };
};

export type StockistMessage = UIMessage<
  { createdAt: string },
  ChatDataParts
>;

export type Conversation = {
  id: string;
  title: string;
  website: string;
  createdAt: string;
  updatedAt: string;
  activeBriefVersion?: number;
  briefRevisions?: ProductBriefRevision[];
  activeResultSetId?: string;
  shortlistIds: string[];
  status: "draft" | "running" | "awaiting_brief_confirmation" | "ready" | "interrupted" | "error";
};
