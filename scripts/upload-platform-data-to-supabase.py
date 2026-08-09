from __future__ import annotations

import json
import mimetypes
import os
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path


SOURCE_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = SOURCE_ROOT.parent
PHOTO_ROOT = PROJECT_ROOT / "平台素材" / "现场照片" / "web"
MANIFEST_PATH = PROJECT_ROOT / "平台素材" / "现场照片" / "supabase-upload-manifest.json"
DATA_ROOT = SOURCE_ROOT / "public" / "data"
BUCKET = "hongtang-photos"
WORKERS = 8
RETRIES = 5
CHECK_REMOTE = os.environ.get("SUPABASE_CHECK_REMOTE", "0") == "1"


@dataclass(frozen=True)
class UploadResult:
    object_path: str
    local_bytes: int
    public_url: str
    status: str
    reused: bool


def required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value.rstrip("/")


SUPABASE_URL = required_env("SUPABASE_URL")
SERVICE_KEY = required_env("SUPABASE_SERVICE_KEY")
PROJECT_REF = urllib.parse.urlsplit(SUPABASE_URL).hostname.split(".")[0]


def public_url(object_path: str) -> str:
    quoted = "/".join(urllib.parse.quote(part) for part in object_path.split("/"))
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{quoted}"


def authenticated_request(url: str, *, method: str, data: bytes | None = None, headers: dict[str, str] | None = None):
    request_headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
    }
    if headers:
        request_headers.update(headers)
    request = urllib.request.Request(url, data=data, headers=request_headers, method=method)
    return urllib.request.urlopen(request, timeout=180, context=ssl.create_default_context())


def remote_matches(path: Path, object_path: str) -> bool:
    if not CHECK_REMOTE:
        return False
    try:
        request = urllib.request.Request(public_url(object_path), method="HEAD")
        with urllib.request.urlopen(request, timeout=5, context=ssl.create_default_context()) as response:
            return response.status == 200 and int(response.headers.get("Content-Length", "-1")) == path.stat().st_size
    except Exception:
        return False


def upload_file(path: Path) -> UploadResult:
    object_path = path.relative_to(PHOTO_ROOT).as_posix()
    destination = public_url(object_path)
    if remote_matches(path, object_path):
        return UploadResult(object_path, path.stat().st_size, destination, "ready", True)

    content_type = "image/webp" if path.suffix.lower() == ".webp" else (mimetypes.guess_type(path.name)[0] or "application/octet-stream")
    endpoint = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{object_path}"
    last_error = "unknown error"
    for attempt in range(1, RETRIES + 1):
        try:
            with path.open("rb") as source:
                payload = source.read()
            with authenticated_request(
                endpoint,
                method="POST",
                data=payload,
                headers={
                    "Content-Type": content_type,

                    "x-upsert": "true",
                },
            ) as response:
                if response.status not in {200, 201}:
                    raise RuntimeError(f"Unexpected upload status: {response.status}")
            return UploadResult(object_path, path.stat().st_size, destination, "ready", False)
        except urllib.error.HTTPError as error:
            last_error = f"HTTP {error.code}: {error.read().decode('utf-8', errors='replace')[:500]}"
        except Exception as error:
            last_error = f"{type(error).__name__}: {error}"
        if attempt < RETRIES:
            time.sleep(min(10, attempt * 2))
    raise RuntimeError(f"Upload failed for {object_path}: {last_error}")


def cloud_map_payload() -> dict:
    payload = json.loads((DATA_ROOT / "hongtang-real-map-features.json").read_text(encoding="utf-8"))
    for feature in payload["features"]:
        next_urls = []
        for image_url in feature.get("imageUrls", []):
            prefix = "/local-photos/"
            if not image_url.startswith(prefix):
                raise RuntimeError(f"Unexpected local photo URL: {image_url}")
            next_urls.append(public_url(image_url[len(prefix):]))
        feature["imageUrls"] = next_urls
    payload["meta"]["dataSource"] = "supabase"
    payload["meta"]["photoStorage"] = "supabase-storage"
    payload["meta"]["supabaseBucket"] = BUCKET
    payload["meta"]["supabaseProjectRef"] = PROJECT_REF
    payload["meta"]["notice"] = "2D与3D地图共用Supabase数据库和Storage；本地JSON仅作为连接失败时的回退。"
    return payload


def upsert_datasets() -> list[dict]:
    datasets = [
        {
            "slug": "hongtang-real-map-features",
            "payload": cloud_map_payload(),
            "is_public": True,
            "source_version": "supabase-v1",
        },
        {
            "slug": "hongtang-water-system",
            "payload": json.loads((DATA_ROOT / "hongtang-water-system.json").read_text(encoding="utf-8")),
            "is_public": True,
            "source_version": "supabase-v1",
        },
        {
            "slug": "hongtang-topic-records",
            "payload": json.loads((DATA_ROOT / "hongtang-topic-records.json").read_text(encoding="utf-8")),
            "is_public": True,
            "source_version": "supabase-v1",
        },
    ]
    endpoint = f"{SUPABASE_URL}/rest/v1/platform_datasets?on_conflict=slug"
    body = json.dumps(datasets, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    with authenticated_request(
        endpoint,
        method="POST",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=representation",
        },
    ) as response:
        returned = json.loads(response.read().decode("utf-8"))
    if len(returned) != len(datasets):
        raise RuntimeError(f"Expected {len(datasets)} datasets, received {len(returned)}")
    return returned


photos = sorted(PHOTO_ROOT.rglob("*.webp"))
if len(photos) != 586:
    raise RuntimeError(f"Expected 586 local photos, found {len(photos)}")

print(
    f"Uploading {len(photos)} photos to Supabase Storage with {WORKERS} workers; "
    f"remote check={'on' if CHECK_REMOTE else 'off'}...",
    flush=True,
)
results: list[UploadResult] = []
with ThreadPoolExecutor(max_workers=WORKERS) as executor:
    futures = [executor.submit(upload_file, photo) for photo in photos]
    for completed, future in enumerate(as_completed(futures), start=1):
        results.append(future.result())
        if completed % 20 == 0 or completed == len(futures):
            reused = sum(result.reused for result in results)
            print(f"Progress {completed}/{len(futures)}; reused {reused}", flush=True)

results.sort(key=lambda result: result.object_path)
datasets = upsert_datasets()
manifest = {
    "version": 1,
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "projectRef": PROJECT_REF,
    "bucket": BUCKET,
    "photos": [asdict(result) for result in results],
    "datasets": [item["slug"] for item in datasets],
}
MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

print(
    json.dumps(
        {
            "status": "ready",
            "projectRef": PROJECT_REF,
            "bucket": BUCKET,
            "photos": len(results),
            "uploadedMB": round(sum(result.local_bytes for result in results if not result.reused) / 1024 / 1024, 1),
            "reused": sum(result.reused for result in results),
            "datasets": [item["slug"] for item in datasets],
        },
        ensure_ascii=False,
    ),
    flush=True,
)
