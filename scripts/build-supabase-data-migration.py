from __future__ import annotations

import json
from pathlib import Path


SOURCE_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = SOURCE_ROOT.parent
DATA_ROOT = SOURCE_ROOT / "public" / "data"
OUTPUT = SOURCE_ROOT / "supabase" / "migrations" / "20260809102000_seed_platform_datasets.sql"
PROJECT_REF = "devxrszyvoocerobdfhz"
BUCKET = "hongtang-photos"
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
    values.append(f"('{slug}', '{body}'::jsonb, true, 'supabase-v1')")

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

OUTPUT.write_text(sql, encoding="utf-8")
print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size} bytes)")
