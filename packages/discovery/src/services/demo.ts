import type { ProductProfile, StoreLead } from "../types";

const demoStores = [
  ["Field & Form", "12 Mercer Street, New York, NY", "buyers@fieldandform.example", "+1 212 555 0142", 4.8, 284],
  ["Kindred Goods", "48 Abbot Kinney Blvd, Venice, CA", "hello@kindredgoods.example", "+1 310 555 0188", 4.7, 191],
  ["The Common Shelf", "91 Newbury Street, Boston, MA", "wholesale@commonshelf.example", "+1 617 555 0136", 4.6, 148],
  ["North & Local", "205 NW 10th Ave, Portland, OR", "team@northandlocal.example", "+1 503 555 0174", 4.9, 327],
  ["Sunday Supply", "73 Elizabeth Street, Austin, TX", "stockists@sundaysupply.example", "+1 512 555 0165", 4.5, 96],
  ["Good Company Market", "3114 N Williams Ave, Chicago, IL", "shop@goodcompany.example", "+1 312 555 0121", 4.7, 213],
] as const;

export function createDemoLeads(product: ProductProfile): StoreLead[] {
  return demoStores.map((store, index) => ({
    id: `demo-${index + 1}`,
    name: store[0],
    address: store[1],
    email: store[2],
    phone: store[3],
    website: `https://${store[2].split("@")[1]}`,
    mapsUrl: undefined,
    rating: store[4],
    ratingCount: store[5],
    types: ["store", "specialty_store"],
    score: 94 - index * 3,
    reason: `Sample match for ${product.categories[0] ?? "your product"} · direct buyer contact available`,
    contactSource: "Sample data — connect Google Places for live sources",
  }));
}
