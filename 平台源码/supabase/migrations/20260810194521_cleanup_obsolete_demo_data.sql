-- Remove the obsolete ecology test point and all explicitly marked demo topic records.
-- Dataset containers remain in place so the application never falls back to stale demo content.
do $$
declare
  affected_rows integer;
begin
  with cleaned_map as (
    select
      slug,
      jsonb_set(
        payload,
        '{features}',
        coalesce(
          (
            select jsonb_agg(feature order by position)
            from jsonb_array_elements(payload -> 'features') with ordinality
              as items(feature, position)
            where feature ->> 'id' <> 'real-poi-13'
          ),
          '[]'::jsonb
        ),
        true
      ) as payload
    from public.platform_datasets
    where slug = 'hongtang-real-map-features'
  )
  update public.platform_datasets as datasets
  set
    payload = jsonb_set(
      cleaned_map.payload,
      '{meta,poiCount}',
      to_jsonb(
        (
          select count(*)
          from jsonb_array_elements(cleaned_map.payload -> 'features') as remaining(feature)
          where feature ->> 'featureType' <> 'research-photo'
        )
      ),
      true
    ),
    source_version = 'supabase-v2',
    updated_at = now()
  from cleaned_map
  where datasets.slug = cleaned_map.slug;

  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'Expected one hongtang-real-map-features row, updated %', affected_rows;
  end if;

  with cleaned_topics as (
    select
      slug,
      jsonb_set(
        payload,
        '{records}',
        coalesce(
          (
            select jsonb_agg(topic_record order by position)
            from jsonb_array_elements(payload -> 'records') with ordinality
              as items(topic_record, position)
            where not coalesce((topic_record ->> 'isDemo')::boolean, false)
          ),
          '[]'::jsonb
        ),
        true
      ) as payload
    from public.platform_datasets
    where slug = 'hongtang-topic-records'
  )
  update public.platform_datasets as datasets
  set
    payload = jsonb_set(
      jsonb_set(
        jsonb_set(
          cleaned_topics.payload,
          '{meta,title}',
          to_jsonb('红塘村专题调研记录'::text),
          true
        ),
        '{meta,updatedAt}',
        to_jsonb('2026-08-11'::text),
        true
      ),
      '{meta,notice}',
      to_jsonb('已移除界面演示数据；后续记录须来自现场核实资料。'::text),
      true
    ),
    source_version = 'supabase-v2',
    updated_at = now()
  from cleaned_topics
  where datasets.slug = cleaned_topics.slug;

  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'Expected one hongtang-topic-records row, updated %', affected_rows;
  end if;
end
$$;
