import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

const configuredModelDirectory = process.env.LOCAL_CESIUM_MODEL_DIR?.trim();
const MODEL_DIRECTORY = path.resolve(
  /* turbopackIgnore: true */
  configuredModelDirectory
    || path.join(
      "..",
      "平台素材",
      "3D高斯展示",
      "Cesium本地三维瓦片",
    ),
);
const ALLOWED_EXTENSIONS = new Set([".json", ".glb", ".geojson"]);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 13;

function contentTypeFor(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".json") return "application/json; charset=utf-8";
  if (extension === ".geojson") return "application/geo+json; charset=utf-8";
  if (extension === ".glb") return "model/gltf-binary";
  return "application/octet-stream";
}

function parseRange(rangeHeader: string | null, size: number) {
  if (!rangeHeader) return { start: 0, end: size - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return null;

  const rawStart = match[1];
  const rawEnd = match[2];
  if (!rawStart && !rawEnd) return null;

  let start: number;
  let end: number;
  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd ? Number(rawEnd) : size - 1;
  }

  if (
    !Number.isInteger(start)
    || !Number.isInteger(end)
    || start < 0
    || end < start
    || start >= size
  ) {
    return null;
  }
  return { start, end: Math.min(end, size - 1), partial: true };
}

function resolveAllowedPath(segments: string[]) {
  if (
    !segments.length
    || segments.some(
      (segment) => (
        !segment
        || segment === "."
        || segment === ".."
        || segment.includes("/")
        || segment.includes("\\")
      ),
    )
  ) {
    return null;
  }

  const filePath = path.resolve(
    /* turbopackIgnore: true */
    MODEL_DIRECTORY,
    ...segments,
  );
  const prefix = `${MODEL_DIRECTORY}${path.sep}`;
  if (!filePath.startsWith(prefix)) return null;
  if (!ALLOWED_EXTENSIONS.has(path.extname(filePath).toLowerCase())) return null;
  return filePath;
}

async function respond(
  request: Request,
  context: { params: Promise<{ segments: string[] }> },
  headOnly: boolean,
) {
  const { segments } = await context.params;
  const filePath = resolveAllowedPath(segments);
  if (!filePath) return new Response("Model file not found.", { status: 404 });

  let fileSize: number;
  try {
    const fileStat = await stat(
      /* turbopackIgnore: true */
      filePath,
    );
    if (!fileStat.isFile()) throw new Error("Not a file");
    fileSize = fileStat.size;
  } catch {
    return new Response(
      "Local Cesium model files are unavailable. Check LOCAL_CESIUM_MODEL_DIR.",
      { status: 404 },
    );
  }

  const range = parseRange(request.headers.get("range"), fileSize);
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${fileSize}` },
    });
  }

  const length = range.end - range.start + 1;
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Length": String(length),
    "Content-Type": contentTypeFor(filePath),
  });
  if (range.partial) {
    headers.set(
      "Content-Range",
      `bytes ${range.start}-${range.end}/${fileSize}`,
    );
  }

  if (headOnly) {
    return new Response(null, {
      status: range.partial ? 206 : 200,
      headers,
    });
  }

  const nodeStream = createReadStream(
    /* turbopackIgnore: true */
    filePath,
    {
    start: range.start,
    end: range.end,
    },
  );
  return new Response(
    Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>,
    { status: range.partial ? 206 : 200, headers },
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ segments: string[] }> },
) {
  return respond(request, context, false);
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ segments: string[] }> },
) {
  return respond(request, context, true);
}
