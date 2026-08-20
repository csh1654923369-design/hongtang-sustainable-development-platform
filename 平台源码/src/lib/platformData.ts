import { createClient } from "@/lib/supabase/client";
import { sitePath } from "@/lib/sitePath";
import { normalizeTopicSpatialData, type TopicSpatialData } from "@/lib/topicSpatialData";

type PlatformDatasetRow = {
  payload: unknown;
};

const datasetRequests = new Map<string, Promise<unknown>>();

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
      const { data, error } = await createClient()
        .from("platform_datasets")
        .select("payload")
        .eq("slug", slug)
        .eq("is_public", true)
        .maybeSingle();

      if (!error && data) {
        return normalizePlatformDataset(slug, (data as PlatformDatasetRow).payload as T);
      }
    } catch {
      // The packaged JSON remains available when Supabase or the network is temporarily unavailable.
    }
  }

  const response = await fetch(sitePath(fallbackPath), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load platform dataset ${slug}: ${response.status}`);
  }
  return response.json().then((payload) => normalizePlatformDataset(slug, payload as T));
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
