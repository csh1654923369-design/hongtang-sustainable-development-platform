from __future__ import annotations

import hashlib
import json
import ssl
import tempfile
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit

from PIL import Image, ImageOps


SOURCE_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = SOURCE_ROOT.parent
DATA_FILE = SOURCE_ROOT / "public" / "data" / "hongtang-real-map-features.json"
WEB_ROOT = PROJECT_ROOT / "平台素材" / "现场照片" / "web"
TEMP_ROOT = Path(tempfile.gettempdir()) / "hongtang-large-photo-segments"
SEGMENTS_PER_FILE = 8
MAX_EDGE = 1600
WEBP_QUALITY = 80
RETRIES = 4


@dataclass(frozen=True)
class MissingPhoto:
    url: str
    destination: Path
    size: int


@dataclass(frozen=True)
class Segment:
    photo_index: int
    index: int
    start: int
    end: int
    url: str
    path: Path


def local_name(url: str) -> str:
    return f"{hashlib.sha256(url.encode('utf-8')).hexdigest()[:24]}.webp"


def request_headers(extra: dict[str, str] | None = None) -> dict[str, str]:
    headers = {
        "User-Agent": "Mozilla/5.0 (Hongtang segmented photo archive)",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Referer": "https://sannongdata.cn/",
    }
    if extra:
        headers.update(extra)
    return headers


def remote_size(url: str) -> int:
    request = urllib.request.Request(url, headers=request_headers(), method="HEAD")
    with urllib.request.urlopen(request, timeout=60, context=ssl.create_default_context()) as response:
        size = int(response.headers["Content-Length"])
        if response.headers.get("Accept-Ranges", "").lower() != "bytes":
            raise RuntimeError(f"Server does not support byte ranges: {url}")
        return size


def download_segment(segment: Segment) -> None:
    expected = segment.end - segment.start + 1
    for attempt in range(1, RETRIES + 1):
        try:
            request = urllib.request.Request(
                segment.url,
                headers=request_headers({"Range": f"bytes={segment.start}-{segment.end}"}),
            )
            with urllib.request.urlopen(request, timeout=180, context=ssl.create_default_context()) as response:
                data = response.read()
            if len(data) != expected:
                raise RuntimeError(f"Expected {expected} bytes, received {len(data)}")
            segment.path.write_bytes(data)
            return
        except Exception:
            segment.path.unlink(missing_ok=True)
            if attempt == RETRIES:
                raise
            time.sleep(attempt * 2)


payload = json.loads(DATA_FILE.read_text(encoding="utf-8"))
missing: list[MissingPhoto] = []
for feature in payload["features"]:
    category = "poi" if feature["id"].startswith("real-poi-") else "village"
    for url in feature.get("imageUrls", []):
        suffix = Path(urlsplit(url).path).suffix.lower()
        if suffix in {".mp4", ".mov", ".m4v", ".webm"}:
            continue
        destination = WEB_ROOT / category / local_name(url)
        if not destination.is_file():
            missing.append(MissingPhoto(url=url, destination=destination, size=remote_size(url)))

if not missing:
    print({"status": "ready", "downloaded": 0})
    raise SystemExit(0)

TEMP_ROOT.mkdir(parents=True, exist_ok=True)
segments: list[Segment] = []
for photo_index, photo in enumerate(missing):
    chunk = (photo.size + SEGMENTS_PER_FILE - 1) // SEGMENTS_PER_FILE
    for index in range(SEGMENTS_PER_FILE):
        start = index * chunk
        if start >= photo.size:
            break
        end = min(photo.size - 1, start + chunk - 1)
        segments.append(
            Segment(
                photo_index=photo_index,
                index=index,
                start=start,
                end=end,
                url=photo.url,
                path=TEMP_ROOT / f"{photo_index:02d}-{index:02d}.segment",
            )
        )

print(f"Downloading {len(missing)} photos in {len(segments)} byte ranges...", flush=True)
with ThreadPoolExecutor(max_workers=len(segments)) as executor:
    futures = [executor.submit(download_segment, segment) for segment in segments]
    for completed, future in enumerate(as_completed(futures), start=1):
        future.result()
        print(f"Segment {completed}/{len(segments)}", flush=True)

for photo_index, photo in enumerate(missing):
    original = TEMP_ROOT / f"{photo_index:02d}.original"
    with original.open("wb") as output:
        for segment in sorted((item for item in segments if item.photo_index == photo_index), key=lambda item: item.index):
            output.write(segment.path.read_bytes())
    if original.stat().st_size != photo.size:
        raise RuntimeError(f"Combined file size mismatch: {photo.url}")
    with Image.open(original) as raw:
        image = ImageOps.exif_transpose(raw)
        image.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
        rgb = image.convert("RGB")
        photo.destination.parent.mkdir(parents=True, exist_ok=True)
        rgb.save(photo.destination, "WEBP", quality=WEBP_QUALITY, method=4)
    print(photo.destination, flush=True)

for path in TEMP_ROOT.iterdir():
    try:
        path.unlink()
    except PermissionError:
        pass
try:
    TEMP_ROOT.rmdir()
except OSError:
    pass
print({"status": "ready", "downloaded": len(missing)})
