import { AppError, readErrorResponse } from "../lib/errors.js";
import type { RawPlace } from "../types.js";

type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
};

const fieldMask = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
  "places.types",
].join(",");

async function searchOne(query: string, apiKey: string) {
  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify({
        textQuery: query,
        pageSize: 10,
        rankPreference: "RELEVANCE",
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!response.ok) {
    throw new AppError(
      `Store search failed: ${await readErrorResponse(response)}`,
      502,
    );
  }

  const payload = (await response.json()) as { places?: GooglePlace[] };
  return payload.places ?? [];
}

function mapPlace(place: GooglePlace): RawPlace {
  return {
    id: place.id,
    name: place.displayName?.text ?? "Unnamed store",
    address: place.formattedAddress ?? "Address unavailable",
    phone:
      place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? undefined,
    website: place.websiteUri,
    mapsUrl: place.googleMapsUri,
    rating: place.rating,
    ratingCount: place.userRatingCount,
    types: place.types ?? [],
  };
}

export async function findPlaces(queries: string[]) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return { places: [] as RawPlace[], live: false };

  const resultGroups = await Promise.all(
    queries.slice(0, 4).map((query) => searchOne(query, apiKey)),
  );
  const unique = new Map<string, GooglePlace>();
  for (const place of resultGroups.flat()) {
    unique.set(place.id, place);
  }

  return {
    places: [...unique.values()].map(mapPlace).slice(0, 24),
    live: true,
  };
}
