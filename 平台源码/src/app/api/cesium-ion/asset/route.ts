import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL_ASSET_ID = 4_908_525;
const TERRAIN_ASSET_ID = 1;
const IMAGERY_ASSET_ID = 2;

export async function GET() {
  const token = process.env.CESIUM_ION_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "尚未配置 CESIUM_ION_TOKEN" },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      mode: "client-ion",
      accessToken: token,
      assetId: MODEL_ASSET_ID,
      environment: {
        terrainAssetId: TERRAIN_ASSET_ID,
        imageryAssetId: IMAGERY_ASSET_ID,
      },
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
