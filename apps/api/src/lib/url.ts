import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { AppError } from "./errors.js";

const blockedHosts = new Set(["localhost", "metadata.google.internal"]);

function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase();

  if (isIP(normalized) === 4) {
    const [a = 0, b = 0] = normalized.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 0
    );
  }

  if (isIP(normalized) === 6) {
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    );
  }

  return false;
}

export function normalizeWebsite(input: string) {
  const withProtocol = /^https?:\/\//i.test(input.trim())
    ? input.trim()
    : `https://${input.trim()}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new AppError("Enter a valid product website.", 400);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new AppError("Only http and https websites are supported.", 400);
  }

  url.hash = "";
  return url.toString();
}

export async function assertPublicUrl(input: string) {
  const url = new URL(input);
  if (blockedHosts.has(url.hostname) || url.hostname.endsWith(".local")) {
    throw new AppError("Private network addresses are not supported.", 400);
  }

  const addresses = await lookup(url.hostname, { all: true });
  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new AppError("Private network addresses are not supported.", 400);
  }

  return url;
}
