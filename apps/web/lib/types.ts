export type BrandColor = {
  hex: string;
  name?: string;
  role?: "primary" | "secondary" | "accent" | "background" | "text" | "other";
};

export type BrandIdentity = {
  source: "context" | "unavailable";
  logoUrl?: string;
  iconUrl?: string;
  backdropUrl?: string;
  slogan?: string;
  colors: BrandColor[];
  headingFont?: string;
  bodyFont?: string;
  mode?: string;
};

export type ProductProfile = {
  website?: string;
  name: string;
  brandIdentity: BrandIdentity;
  summary: string;
  categories: string[];
  idealRetailerTypes: string[];
  pricePositioning: string;
  targetCustomer: string;
  targetMarkets: string[];
  distributionGoal?: string;
  retailerPreference?: "independent" | "chain" | "either";
  differentiators?: string[];
  requirements?: string[];
  exclusions?: string[];
};

export type ProductBrief = {
  website: string;
  brandName: string;
  brandIdentity: BrandIdentity;
  summary: string;
  categories: string[];
  targetCustomer: string;
  pricePositioning: string;
  distributionGoal: string;
  targetMarkets: string[];
  idealRetailerTypes: string[];
  retailerPreference: "independent" | "chain" | "either";
  differentiators: string[];
  requirements: string[];
  exclusions: string[];
};

export type ProductBriefRevision = {
  conversationId: string;
  website: string;
  version: number;
  status: "draft" | "confirmed";
  source: "context" | "fallback";
  createdAt: string;
  updatedAt: string;
  needsReview: boolean;
  brief: ProductBrief;
};

export type StoreLead = {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  mapsUrl?: string;
  rating?: number;
  ratingCount?: number;
  types: string[];
  score: number;
  reason: string;
  contactSource?: string;
  scoreBreakdown?: { fit: number; contactability: number; reputation: number };
  fitReasons?: string[];
  riskFlags?: string[];
  retailerKind?: "independent" | "regional chain" | "national chain" | "unknown";
  contactConfidence?: "publicly found" | "unavailable";
};

export type DiscoveryResponse = {
  runId: string;
  demo: boolean;
  product: ProductProfile;
  strategy: {
    queries: string[];
    summary: string;
  };
  leads: StoreLead[];
  sources: string[];
  completedAt: string;
};
