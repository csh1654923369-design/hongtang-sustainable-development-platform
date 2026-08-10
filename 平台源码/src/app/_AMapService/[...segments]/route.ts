import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function destinationFor(segments: string[]) {
  const safeSegments = segments.filter((segment) => segment && segment !== "." && segment !== "..");
  const pathname = safeSegments.map(encodeURIComponent).join("/");
  const origin = safeSegments[0] === "v4" && safeSegments[1] === "map" && safeSegments[2] === "styles"
    ? "https://webapi.amap.com"
    : "https://restapi.amap.com";
  return new URL(`/${pathname}`, origin);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ segments: string[] }> },
) {
  const securityJsCode = process.env.AMAP_SECURITY_JS_CODE?.trim();
  if (!securityJsCode) {
    return Response.json(
      { error: "AMAP_SECURITY_JS_CODE is not configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { segments } = await context.params;
  const destination = destinationFor(segments);
  request.nextUrl.searchParams.forEach((value, key) => destination.searchParams.append(key, value));
  destination.searchParams.set("jscode", securityJsCode);

  const upstream = await fetch(destination, {
    headers: {
      Accept: request.headers.get("accept") ?? "*/*",
      "User-Agent": "Hongtang-Sustainable-Development-Platform/1.0",
    },
    cache: "no-store",
  });

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "no-store");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
