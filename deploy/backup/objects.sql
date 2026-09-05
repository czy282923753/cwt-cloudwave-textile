-- Data selection only. This is not public-delivery or scan authority.
-- Keep every nondeleted Public original and retained Private Inquiry originals.
-- Unattached incomplete uploads are working files, not a completed Inquiry.
SELECT json_build_object('partition', storage_partition, 'key', object_key,
                         'size', byte_size, 'sha256', sha256)::text
FROM assets
WHERE deleted_at IS NULL AND status <> 'deleted'
  AND (storage_partition = 'public' OR (storage_partition = 'private' AND category = 'inquiry'
       AND (status = 'ready' OR EXISTS (SELECT 1 FROM inquiry_assets ia WHERE ia.asset_id = assets.id))))
ORDER BY storage_partition, object_key;
