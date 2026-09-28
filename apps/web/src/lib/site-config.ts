/**
 * Server-side helper to load site config values from DB.
 * Caches in-memory for 60 seconds to avoid DB spam on every page load.
 */
import { prisma } from "./prisma";

let cache: Map<string, string> = new Map();
let cacheTime = 0;
const CACHE_TTL = 60_000; // 60 seconds

export async function getSiteConfig(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cache.size > 0 && now - cacheTime < CACHE_TTL) {
    return cache;
  }

  try {
    const rows = await prisma.siteConfig.findMany();
    cache = new Map(rows.map((r) => [r.key, r.value]));
    cacheTime = now;
  } catch {
    // If table doesn't exist yet, return empty
    if (cache.size === 0) cache = new Map();
  }

  return cache;
}

export async function getConfigValue(key: string, fallback = ""): Promise<string> {
  const cfg = await getSiteConfig();
  return cfg.get(key) ?? fallback;
}

/** Helper to check if ads are enabled */
export async function isAdsEnabled(): Promise<boolean> {
  const val = await getConfigValue("ads_enabled", "false");
  return val === "true";
}

/** Get AdSense publisher ID */
export async function getAdSensePubId(): Promise<string> {
  return getConfigValue("adsense_pub_id", "");
}

/** Invalidate cache (call after admin updates) */
export function invalidateConfigCache() {
  cache = new Map();
  cacheTime = 0;
}

/** Get WhatsApp Channel URL */
export async function getWhatsAppUrl(): Promise<string> {
  return getConfigValue("whatsapp_url", "#");
}

/** Get Telegram Group URL */
export async function getTelegramUrl(): Promise<string> {
  return getConfigValue("telegram_url", "#");
}
