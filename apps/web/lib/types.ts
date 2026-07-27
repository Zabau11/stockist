export type ProductProfile = {
  name: string;
  summary: string;
  categories: string[];
  idealRetailerTypes: string[];
  pricePositioning: string;
  targetCustomer: string;
  targetMarkets: string[];
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
