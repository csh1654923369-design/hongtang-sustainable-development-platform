from __future__ import annotations
import hashlib
import json
import os
import shutil
import ssl
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from PIL import Image, ImageOps


SOURCE_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = SOURCE_ROOT.parent
DATA_FILE = SOURCE_ROOT / "public" / "data" / "hongtang-real-map-features.json"
MATERIAL_ROOT = PROJECT_ROOT / "平台素材" / "现场照片"
WEB_ROOT = MATERIAL_ROOT / "web"
PUBLIC_ROOT = SOURCE_ROOT / "public" / "local-photos"
TEMP_ROOT = MATERIAL_ROOT / ".download-cache"
VIDEO_POSTER_ROOT = MATERIAL_ROOT / "video-posters"
MANIFEST_FILE = MATERIAL_ROOT / "photo-source-manifest.json"
PUBLIC_PREFIX = "/local-photos"
MAX_EDGE = 1600
WEBP_QUALITY = 80
WORKERS = 8
RETRIES = 4


@dataclass(frozen=True)
class PhotoTask:
    feature_id: str
    image_index: int
    source_kind: str
    remote_url: str
    local_path: str


def local_filename(remote_url: str) -> str:
    return f"{hashlib.sha256(remote_url.encode('utf-8')).hexdigest()[:24]}.webp"


def download_url(remote_url: str) -> str:
    parts = urlsplit(remote_url)
    if parts.netloc.lower() == "oss.sannongdata.cn":
        processor = "x-oss-process=image/resize,w_1600/quality,q_82/format,webp"
        return urlunsplit((parts.scheme, parts.netloc, parts.path, processor, ""))
    return remote_url


def valid_existing_file(path: Path) -> bool:
    if not path.is_file() or path.stat().st_size < 512:
        return False
    try:
        with Image.open(path) as image:
            image.verify()
        return True
    except Exception:
        return False


def safe_unlink(path: Path, retries: int = 8) -> None:
    for attempt in range(retries):
        try:
            path.unlink(missing_ok=True)
            return
        except PermissionError:
            if attempt + 1 < retries:
                time.sleep(0.5 * (attempt + 1))
    # 百度同步盘或防病毒程序可能短暂占用临时文件；这不应使已转换照片失败。


def flatten_for_webp(image: Image.Image) -> Image.Image:
    if image.mode in {"RGBA", "LA"} or "transparency" in image.info:
        rgba = image.convert("RGBA")
        background = Image.new("RGB", rgba.size, "white")
        background.paste(rgba, mask=rgba.getchannel("A"))
        return background
    return image.convert("RGB")


def process_photo(task: PhotoTask) -> dict[str, object]:
    destination = WEB_ROOT / task.local_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    if valid_existing_file(destination):
        with Image.open(destination) as existing:
            return {
                **asdict(task),
                "status": "ready",
                "width": existing.width,
                "height": existing.height,
                "downloadBytes": 0,
                "localBytes": destination.stat().st_size,
                "reused": True,
                "derivedFromVideo": Path(urlsplit(task.remote_url).path).suffix.lower() in {".mp4", ".mov", ".m4v", ".webm"},
            }

    remote_suffix = Path(urlsplit(task.remote_url).path).suffix.lower()
    if remote_suffix in {".mp4", ".mov", ".m4v", ".webm"}:
        poster_path = VIDEO_POSTER_ROOT / f"{Path(task.local_path).stem}.png"
        if not valid_existing_file(poster_path):
            return {**asdict(task), "status": "failed", "error": f"Missing local video poster: {poster_path}"}
        try:
            with Image.open(poster_path) as raw:
                image = ImageOps.exif_transpose(raw)
                image.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
                web_image = flatten_for_webp(image)
                width, height = web_image.size
                web_image.save(destination, "WEBP", quality=WEBP_QUALITY, method=4)
            return {
                **asdict(task),
                "status": "ready",
                "width": width,
                "height": height,
                "downloadBytes": 0,
                "localBytes": destination.stat().st_size,
                "reused": False,
                "derivedFromVideo": True,
            }
        except Exception as error:
            destination.unlink(missing_ok=True)
            return {**asdict(task), "status": "failed", "error": f"Video poster conversion failed: {error}"}

    temp_path = TEMP_ROOT / f"{Path(task.local_path).stem}.part"
    temp_path.parent.mkdir(parents=True, exist_ok=True)
    last_error = "unknown error"
    for attempt in range(1, RETRIES + 1):
        try:
            request = urllib.request.Request(
                download_url(task.remote_url),
                headers={
                    "User-Agent": "Mozilla/5.0 (Hongtang local photo archive)",
                    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
                },
            )
            with urllib.request.urlopen(request, timeout=120, context=ssl.create_default_context()) as response:
                with temp_path.open("wb") as output:
                    shutil.copyfileobj(response, output, length=1024 * 1024)
            downloaded_bytes = temp_path.stat().st_size
            with Image.open(temp_path) as raw:
                image = ImageOps.exif_transpose(raw)
                image.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
                web_image = flatten_for_webp(image)
                width, height = web_image.size
                web_image.save(destination, "WEBP", quality=WEBP_QUALITY, method=4)
            if not valid_existing_file(destination):
                raise RuntimeError("converted WebP failed validation")
            safe_unlink(temp_path)
            return {
                **asdict(task),
                "status": "ready",
                "width": width,
                "height": height,
                "downloadBytes": downloaded_bytes,
                "localBytes": destination.stat().st_size,
                "reused": False,
            }
        except Exception as error:
            last_error = f"{type(error).__name__}: {error}"
            safe_unlink(temp_path)
            if attempt < RETRIES:
                time.sleep(min(8, attempt * 2))
    destination.unlink(missing_ok=True)
    return {**asdict(task), "status": "failed", "error": last_error}


payload = json.loads(DATA_FILE.read_text(encoding="utf-8"))
previous_entries: dict[tuple[str, int], dict[str, object]] = {}
if MANIFEST_FILE.is_file():
    previous_manifest = json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
    previous_entries = {
        (entry["feature_id"], entry["image_index"]): entry
        for entry in previous_manifest.get("entries", [])
    }

tasks: list[PhotoTask] = []
for feature in payload["features"]:
    source_kind = "poi" if feature["id"].startswith("real-poi-") else "village"
    for image_index, current_url in enumerate(feature.get("imageUrls", [])):
        previous = previous_entries.get((feature["id"], image_index))
        remote_url = current_url if current_url.startswith(("http://", "https://")) else str(previous.get("remote_url", "") if previous else "")
        if not remote_url.startswith(("http://", "https://")):
            raise RuntimeError(f"Missing original photo URL for {feature['id']} image {image_index}")
        tasks.append(
            PhotoTask(
                feature_id=feature["id"],
                image_index=image_index,
                source_kind=source_kind,
                remote_url=remote_url,
                local_path=f"{source_kind}/{local_filename(remote_url)}",
            )
        )

WEB_ROOT.mkdir(parents=True, exist_ok=True)
TEMP_ROOT.mkdir(parents=True, exist_ok=True)
print(f"Localizing {len(tasks)} photos with {WORKERS} workers...", flush=True)
results: list[dict[str, object]] = []
with ThreadPoolExecutor(max_workers=WORKERS) as executor:
    futures = {executor.submit(process_photo, task): task for task in tasks}
    for completed, future in enumerate(as_completed(futures), start=1):
        result = future.result()
        results.append(result)
        if result["status"] == "failed":
            print(f"FAILED {result['feature_id']} #{result['image_index']}: {result['error']}", flush=True)
        if completed % 10 == 0 or completed == len(tasks):
            failed_count = sum(item["status"] == "failed" for item in results)
            print(f"Progress {completed}/{len(tasks)}; failed {failed_count}", flush=True)

result_lookup = {(item["feature_id"], item["image_index"]): item for item in results}
ordered_results = [result_lookup[(task.feature_id, task.image_index)] for task in tasks]
manifest = {
    "version": 1,
    "generatedAt": date.today().isoformat(),
    "description": "红塘村平台现场照片本地化清单；remote_url仅用于来源追溯和重新生成，本地网页不读取该地址。",
    "settings": {"maxEdge": MAX_EDGE, "webpQuality": WEBP_QUALITY},
    "entries": ordered_results,
}
MANIFEST_FILE.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
failures = [item for item in ordered_results if item["status"] == "failed"]
if failures:
    raise SystemExit(f"{len(failures)} photos failed. Re-run the script to retry without re-downloading completed files.")

for feature in payload["features"]:
    feature["imageUrls"] = [
        f"{PUBLIC_PREFIX}/{result_lookup[(feature['id'], image_index)]['local_path'].replace(os.sep, '/')}"
        for image_index, _ in enumerate(feature.get("imageUrls", []))
    ]
payload["meta"]["photoStorage"] = "local-webp"
payload["meta"]["photoMaterialPath"] = "../平台素材/现场照片/web"
payload["meta"]["photoMaxEdge"] = MAX_EDGE
payload["meta"]["photoWebpQuality"] = WEBP_QUALITY
payload["meta"]["notice"] = "点位名称、简介、坐标和照片来源来自用户提供的素材；网页使用本地压缩照片，不依赖原照片服务器。"
DATA_FILE.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

for task in tasks:
    source = WEB_ROOT / task.local_path
    destination = PUBLIC_ROOT / task.local_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    if not destination.is_file() or destination.stat().st_size != source.stat().st_size:
        shutil.copy2(source, destination)

downloaded = sum(int(item.get("downloadBytes", 0)) for item in ordered_results)
local_size = sum(int(item.get("localBytes", 0)) for item in ordered_results)
reused = sum(bool(item.get("reused")) for item in ordered_results)
if TEMP_ROOT.exists() and not any(TEMP_ROOT.iterdir()):
    TEMP_ROOT.rmdir()
print(
    json.dumps(
        {
            "status": "ready",
            "photos": len(ordered_results),
            "reused": reused,
            "downloadedMB": round(downloaded / 1024 / 1024, 1),
            "localMB": round(local_size / 1024 / 1024, 1),
            "dataFile": str(DATA_FILE),
            "materialRoot": str(WEB_ROOT),
            "publicRoot": str(PUBLIC_ROOT),
        },
        ensure_ascii=False,
    ),
    flush=True,
)
