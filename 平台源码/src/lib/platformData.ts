import { sitePath } from "@/lib/sitePath";
import { normalizeTopicSpatialData, type TopicSpatialData } from "@/lib/topicSpatialData";

type PlatformDatasetRow = {
  payload: unknown;
};

const DATASET_TIMEOUT_MS = 4500;
const datasetRequests = new Map<string, Promise<unknown>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidPlatformDataset(slug: string, payload: unknown) {
  if (!isRecord(payload)) return false;
  if (slug === "hongtang-real-map-features") return Array.isArray(payload.features);
  if (slug === "hongtang-water-system") {
    return Array.isArray(payload.nodes) && Array.isArray(payload.lines) && Array.isArray(payload.zones);
  }
  if (slug === "hongtang-topic-records") return Array.isArray(payload.records);
  if (slug === "hongtang-topic-spatial-demo") {
    return Array.isArray(payload.layers) && Array.isArray(payload.features);
  }
  return true;
}

async function loadSupabaseDataset(slug: string, supabaseUrl: string, publishableKey: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DATASET_TIMEOUT_MS);
  try {
    const endpoint = new URL("/rest/v1/platform_datasets", `${supabaseUrl.replace(/\/$/, "")}/`);
    endpoint.searchParams.set("select", "payload");
    endpoint.searchParams.set("slug", `eq.${slug}`);
    endpoint.searchParams.set("is_public", "eq.true");
    endpoint.searchParams.set("limit", "1");
    const response = await fetch(endpoint, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
      },
    });
    if (!response.ok) throw new Error(`Supabase dataset request failed: ${response.status}`);
    const rows = await response.json() as PlatformDatasetRow[];
    return rows[0]?.payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

function normalizePlatformDataset<T>(slug: string, payload: T): T {
  if (slug === "hongtang-topic-spatial-demo") {
    return normalizeTopicSpatialData(payload as TopicSpatialData) as T;
  }
  return payload;
}

async function loadPlatformDataset<T>(slug: string, fallbackPath: string): Promise<T> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (supabaseUrl && publishableKey) {
    try {
      const payload = await loadSupabaseDataset(slug, supabaseUrl, publishableKey);
      if (isValidPlatformDataset(slug, payload)) {
        return normalizePlatformDataset(slug, payload as T);
      }
    } catch {
      // The packaged JSON remains available when Supabase or the network is temporarily unavailable.
    }
  }

  const response = await fetch(sitePath(fallbackPath), { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Unable to load platform dataset ${slug}: ${response.status}`);
  }
  const payload = await response.json() as unknown;
  if (!isValidPlatformDataset(slug, payload)) {
    throw new Error(`Invalid platform dataset structure: ${slug}`);
  }
  return normalizePlatformDataset(slug, payload as T);
}

export function fetchPlatformDataset<T>(slug: string, fallbackPath: string): Promise<T> {
  const cacheKey = `${slug}:${fallbackPath}`;
  const cached = datasetRequests.get(cacheKey);
  if (cached) return cached as Promise<T>;

  const request = loadPlatformDataset<T>(slug, fallbackPath).catch((error) => {
    datasetRequests.delete(cacheKey);
    throw error;
  });
  datasetRequests.set(cacheKey, request);
  return request;
}
