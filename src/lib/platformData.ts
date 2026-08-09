import { createClient } from "@/lib/supabase/client";

type PlatformDatasetRow = {
  payload: unknown;
};

export async function fetchPlatformDataset<T>(slug: string, fallbackPath: string): Promise<T> {
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
        return (data as PlatformDatasetRow).payload as T;
      }
    } catch {
      // The packaged JSON remains available when Supabase or the network is temporarily unavailable.
    }
  }

  const response = await fetch(fallbackPath, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load platform dataset ${slug}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}
