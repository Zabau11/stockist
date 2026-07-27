export { AppError } from "./lib/errors";
export { normalizeWebsite } from "./lib/url";
export { discoverStores } from "./services/discovery";
export { analyzeProductBrief } from "./services/context";
export { saveDiscovery } from "./services/storage";
export type {
  BrandColor,
  BrandIdentity,
  DiscoveryResponse,
  ProductBrief,
  ProductBriefRevision,
  ProductProfile,
  StoreLead,
} from "./types";
