import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const key = process.env.AMAP_WEB_KEY?.trim() ?? "";
  const proxyEnabled = Boolean(process.env.AMAP_SECURITY_JS_CODE?.trim());

  return NextResponse.json(
    { key, proxyEnabled },
    { headers: { "Cache-Control": "no-store" } },
  );
}
