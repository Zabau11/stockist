import type { UIMessage } from "ai";
import type { DiscoveryResponse, ProductProfile, StoreLead } from "@/lib/types";

export type ProgressStage =
  | "analyzing_product"
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
};

export type ChatDataParts = {
  "product-profile": ProductProfile;
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
  productProfile?: ProductProfile;
  activeResultSetId?: string;
  shortlistIds: string[];
  status: "draft" | "running" | "ready" | "interrupted" | "error";
};
