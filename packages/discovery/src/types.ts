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

export type ProductProfile = ProductBrief & {
  name: string;
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

export type RawPlace = {
  id: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  mapsUrl?: string;
  rating?: number;
  ratingCount?: number;
  types: string[];
};

export type StoreLead = RawPlace & {
  email?: string;
  score: number;
  reason: string;
  contactSource?: string;
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
  brief?: ProductBrief;
  briefVersion?: number;
};
