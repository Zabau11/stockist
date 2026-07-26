export type ProductProfile = {
  name: string;
  summary: string;
  categories: string[];
  idealRetailerTypes: string[];
  pricePositioning: string;
  targetCustomer: string;
  targetMarkets: string[];
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
};
