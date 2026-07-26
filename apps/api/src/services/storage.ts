import { createSign } from "node:crypto";
import type { DiscoveryResponse } from "../types.js";

type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { timestampValue: string }
  | { arrayValue: { values: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

let cachedToken: { value: string; expiresAt: number } | undefined;

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken(clientEmail: string, privateKey: string) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsignedToken = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const assertion = `${unsignedToken}.${base64Url(signer.sign(privateKey))}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error("Firebase service account authentication failed.");
  const payload = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };
  return cachedToken.value;
}

function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, nested]) => [
            key,
            toFirestoreValue(nested),
          ]),
        ),
      },
    };
  }
  return { stringValue: String(value) };
}

function documentFields(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)]),
  );
}

export async function saveDiscovery(
  response: DiscoveryResponse,
  input: { website: string; prompt: string },
) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return;

  const storedResponse = response.demo
    ? response
    : {
        runId: response.runId,
        demo: false,
        product: response.product,
        strategy: response.strategy,
        completedAt: response.completedAt,
        sources: response.sources,
        storeRefs: response.leads.map((lead) => ({
          placeId: lead.id,
          email: lead.email ?? null,
          contactSource: lead.contactSource ?? null,
        })),
      };

  try {
    const accessToken = await getAccessToken(clientEmail, privateKey);
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/discovery_runs`,
    );
    url.searchParams.set("documentId", response.runId);

    const firebaseResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: documentFields({
          ...storedResponse,
          input,
          createdAt: new Date(),
        }),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!firebaseResponse.ok) {
      throw new Error(`Firestore returned ${firebaseResponse.status}.`);
    }
  } catch (error) {
    console.warn("Could not persist discovery run to Firebase.", error);
  }
}
