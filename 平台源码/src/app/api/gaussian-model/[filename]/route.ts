import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

const MODEL_BASENAME = "hongtang-recovered-sh0-lod";
const configuredModelDirectory = process.env.GAUSSIAN_MODEL_DIR?.trim();
const MODEL_DIRECTORY =
  configuredModelDirectory
  || path.join("..", "平台素材", "3D高斯展示", "轻量化模型");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAllowedModelFile(filename: string) {
  return (
    filename === `${MODEL_BASENAME}.rad`
    || new RegExp(`^${MODEL_BASENAME}-\\d+\\.radc$`).test(filename)
  );
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

export async function GET(
  request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  if (!isAllowedModelFile(filename)) {
    return new Response("Model file not found.", { status: 404 });
  }

  const filePath = path.join(
    /*turbopackIgnore: true*/ MODEL_DIRECTORY,
    filename,
  );
  let fileSize: number;
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("Not a file");
    fileSize = fileStat.size;
  } catch {
    return new Response(
      "Spark model files are unavailable. Check GAUSSIAN_MODEL_DIR.",
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
  const nodeStream = createReadStream(filePath, {
    start: range.start,
    end: range.end,
  });
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Length": String(length),
    "Content-Type": "application/octet-stream",
  });
  if (range.partial) {
    headers.set(
      "Content-Range",
      `bytes ${range.start}-${range.end}/${fileSize}`,
    );
  }

  return new Response(
    Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>,
    { status: range.partial ? 206 : 200, headers },
  );
}
