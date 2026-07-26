import * as cheerio from "cheerio";
import { assertPublicUrl } from "../lib/url.js";
import type { RawPlace } from "../types.js";

type ContactDetails = {
  email?: string;
  phone?: string;
  source?: string;
};

const emailPattern =
  /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/g;
const contactWords = ["contact", "wholesale", "about", "stockist", "retail"];

function cleanEmail(email: string) {
  return email.replace(/^mailto:/i, "").split("?")[0]?.toLowerCase();
}

function parseContacts(html: string, source: string): ContactDetails & { contactUrl?: string } {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();

  const mailto = $('a[href^="mailto:"]').first().attr("href");
  const bodyEmail = $.text().match(emailPattern)?.find(
    (email) => !email.endsWith(".png") && !email.endsWith(".jpg"),
  );
  const tel = $('a[href^="tel:"]').first().attr("href")?.replace(/^tel:/i, "");

  let contactUrl: string | undefined;
  $("a[href]").each((_, element) => {
    if (contactUrl) return;
    const label = $(element).text().trim().toLowerCase();
    const href = $(element).attr("href");
    if (href && contactWords.some((word) => label.includes(word))) {
      try {
        contactUrl = new URL(href, source).toString();
      } catch {
        contactUrl = undefined;
      }
    }
  });

  return {
    email: mailto ? cleanEmail(mailto) : bodyEmail?.toLowerCase(),
    phone: tel,
    source,
    contactUrl,
  };
}

async function fetchPage(url: string, redirectCount = 0): Promise<string | undefined> {
  await assertPublicUrl(url);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "StockistContactResearch/0.1 (+public-business-contact-enrichment)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "manual",
    signal: AbortSignal.timeout(7_000),
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location || redirectCount >= 3) return undefined;
    return fetchPage(new URL(location, url).toString(), redirectCount + 1);
  }

  if (!response.ok) return undefined;
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) return undefined;
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > 2_000_000) return undefined;
  return response.text();
}

async function enrichOne(place: RawPlace): Promise<ContactDetails> {
  if (!place.website) return {};

  try {
    const html = await fetchPage(place.website);
    if (!html) return {};
    const homepage = parseContacts(html, place.website);
    if (homepage.email || !homepage.contactUrl) return homepage;

    const homepageHost = new URL(place.website).hostname;
    const contactHost = new URL(homepage.contactUrl).hostname;
    if (homepageHost !== contactHost) return homepage;

    const contactHtml = await fetchPage(homepage.contactUrl);
    return contactHtml
      ? parseContacts(contactHtml, homepage.contactUrl)
      : homepage;
  } catch {
    return {};
  }
}

export async function enrichContacts(places: RawPlace[]) {
  const enriched = [...places];
  const batchSize = 4;

  for (let index = 0; index < enriched.length; index += batchSize) {
    const batch = enriched.slice(index, index + batchSize);
    const contacts = await Promise.all(batch.map(enrichOne));
    contacts.forEach((contact, offset) => {
      const place = enriched[index + offset];
      if (!place) return;
      enriched[index + offset] = {
        ...place,
        phone: place.phone ?? contact.phone,
        email: contact.email,
        source: contact.source,
      } as RawPlace & ContactDetails;
    });
  }

  return enriched as Array<RawPlace & ContactDetails>;
}
