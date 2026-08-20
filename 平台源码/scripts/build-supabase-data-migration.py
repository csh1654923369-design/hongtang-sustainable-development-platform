from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path


SOURCE_ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = SOURCE_ROOT / "public" / "data"
VERSION = os.environ.get("SUPABASE_DATA_MIGRATION_VERSION") or datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
OUTPUT = SOURCE_ROOT / "supabase" / "migrations" / f"{VERSION}_seed_platform_datasets.sql"
PROJECT_REF = "devxrszyvoocerobdfhz"
BUCKET = "hongtang-photos"
SOURCE_VERSION = "supabase-v2"
PUBLIC_BASE = f"https://{PROJECT_REF}.supabase.co/storage/v1/object/public/{BUCKET}/"


def read_json(name: str) -> dict:
    return json.loads((DATA_ROOT / name).read_text(encoding="utf-8"))


def cloud_map_payload() -> dict:
    payload = read_json("hongtang-real-map-features.json")
    for feature in payload["features"]:
        urls = []
        for image_url in feature.get("imageUrls", []):
            prefix = "/local-photos/"
            if not image_url.startswith(prefix):
                raise RuntimeError(f"Unexpected local photo URL: {image_url}")
            urls.append(PUBLIC_BASE + image_url[len(prefix):])
        feature["imageUrls"] = urls
    payload["meta"].update(
        {
            "dataSource": "supabase",
            "photoStorage": "supabase-storage",
            "supabaseBucket": BUCKET,
            "supabaseProjectRef": PROJECT_REF,
            "notice": "2D与3D地图共用Supabase数据库和Storage；本地JSON仅作为连接失败时的回退。",
        }
    )
    return payload


datasets = [
    ("hongtang-real-map-features", cloud_map_payload()),
    ("hongtang-water-system", read_json("hongtang-water-system.json")),
    ("hongtang-topic-records", read_json("hongtang-topic-records.json")),
]

values = []
for slug, payload in datasets:
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace("'", "''")
    values.append(f"('{slug}', '{body}'::jsonb, true, '{SOURCE_VERSION}')")

sql = """-- Generated from public/data. Re-run scripts/build-supabase-data-migration.py when the canonical datasets change.
insert into public.platform_datasets (slug, payload, is_public, source_version)
values
  """ + ",\n  ".join(values) + """
on conflict (slug) do update
set payload = excluded.payload,
    is_public = excluded.is_public,
    source_version = excluded.source_version,
    updated_at = now();
"""

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(sql, encoding="utf-8")
print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size} bytes)")
