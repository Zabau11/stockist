import type { ProductProfile, RawPlace, StoreLead } from "../types";

type EnrichedPlace = RawPlace & {
  email?: string;
  source?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function rankPlaces(
  places: EnrichedPlace[],
  product: ProductProfile,
): StoreLead[] {
  const categoryTerms = [
    ...product.categories,
    ...product.idealRetailerTypes,
  ]
    .flatMap((value) => value.toLowerCase().split(/\W+/))
    .filter((value) => value.length > 3);

  return places
    .map((place) => {
      const searchable = `${place.name} ${place.types.join(" ")}`.toLowerCase();
      const termMatches = categoryTerms.filter((term) =>
        searchable.includes(term),
      ).length;
      const contactPoints =
        (place.email ? 10 : 0) + (place.phone ? 7 : 0) + (place.website ? 5 : 0);
      const reputation =
        (place.rating ?? 3.5) * 8 +
        Math.min(Math.log10((place.ratingCount ?? 0) + 1) * 5, 12);
      const relevance = Math.min(termMatches * 7, 21);
      const score = Math.round(clamp(28 + contactPoints + reputation + relevance, 0, 98));

      const reasonParts = [
        termMatches > 0
          ? `Matches ${product.categories[0] ?? "the product"} retail signals`
          : `Fits the ${product.idealRetailerTypes[0] ?? "specialty retail"} profile`,
        place.rating
          ? `${place.rating.toFixed(1)} rating${place.ratingCount ? ` from ${place.ratingCount.toLocaleString()} reviews` : ""}`
          : undefined,
        place.email || place.phone ? "direct contact available" : undefined,
      ].filter(Boolean);

      return {
        ...place,
        contactSource: place.source,
        score,
        reason: reasonParts.join(" · "),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}
