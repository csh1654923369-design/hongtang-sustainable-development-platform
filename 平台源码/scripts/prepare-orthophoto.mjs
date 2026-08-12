import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const sourceRoot = resolve(import.meta.dirname, "..");
const workspaceRoot = resolve(sourceRoot, "..");
const source = resolve(
  workspaceRoot,
  "平台素材",
  "Production_1-tif",
  "重采样",
  "Production_1-tif_ortho_merge_0.3m.tif",
);
const worldFile = resolve(
  workspaceRoot,
  "平台素材",
  "Production_1-tif",
  "重采样",
  "Production_1-tif_ortho_merge_0.3m.tfw",
);
const outputDir = resolve(sourceRoot, "public", "data");
const outputImage = resolve(outputDir, "hongtang-orthophoto-0.3m.webp");
const outputMetadata = resolve(outputDir, "hongtang-orthophoto.json");

const metadata = await sharp(source, { limitInputPixels: false }).metadata();
if (!metadata.width || !metadata.height) throw new Error("无法读取正射影像尺寸");

const alpha = await sharp(source, { limitInputPixels: false })
  .greyscale()
  .threshold(3)
  .raw()
  .toBuffer();

await mkdir(outputDir, { recursive: true });
await sharp(source, { limitInputPixels: false })
  .joinChannel([alpha], {
    raw: { width: metadata.width, height: metadata.height, channels: 1 },
  })
  .webp({ quality: 82, alphaQuality: 100, effort: 6 })
  .toFile(outputImage);

const worldValues = (await readFile(worldFile, "utf8"))
  .trim()
  .split(/\s+/)
  .map(Number);
if (worldValues.length !== 6 || worldValues.some(Number.isNaN)) {
  throw new Error("无法解析正射影像世界文件");
}

const [pixelWidth, rotationY, rotationX, pixelHeight, centerX, centerY] = worldValues;
const west = centerX - pixelWidth / 2;
const north = centerY - pixelHeight / 2;
const east = west + pixelWidth * metadata.width;
const south = north + pixelHeight * metadata.height;
const sourceInfo = await stat(source);
const outputInfo = await stat(outputImage);

const webMetadata = {
  title: "红塘村无人机正射影像",
  displayAsset: "/data/hongtang-orthophoto-0.3m.webp",
  sourceAsset: "../平台素材/Production_1-tif/重采样/Production_1-tif_ortho_merge_0.3m.tif",
  sourceKeptOutsideRepository: true,
  acquisitionDate: null,
  coordinateReferenceSystem: "EPSG:32647",
  pixelSizeMeters: Math.abs(pixelWidth),
  width: metadata.width,
  height: metadata.height,
  utmBounds: { west, south, east, north },
  approximateWgs84Bounds: {
    west: 99.902144,
    south: 24.63173,
    east: 99.912024,
    north: 24.641417,
  },
  rotation: { x: rotationX, y: rotationY },
  sourceBytes: sourceInfo.size,
  displayBytes: outputInfo.size,
  pointCalibration: "pending",
  publicationNotice: "现有业务点位为演示位置，尚未与无人机影像完成真实位置校准；正式公开前还需确认影像授权和敏感内容处理范围。",
};

await writeFile(outputMetadata, `${JSON.stringify(webMetadata, null, 2)}\n`, "utf8");

console.log(`Generated ${outputImage}`);
console.log(`Generated ${outputMetadata}`);
console.log(`Display asset: ${(outputInfo.size / 1024 / 1024).toFixed(2)} MB`);
