CREATE TABLE IF NOT EXISTS imagio_images (
    id TEXT PRIMARY KEY,
    object_key TEXT NOT NULL UNIQUE,
    uploaded_at_ms INTEGER NOT NULL,
    taken_at_ms INTEGER,
    created_at_ms INTEGER,
    meta_json TEXT NOT NULL CHECK (json_valid(meta_json)),
    updated_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_imagio_images_category_uploaded
ON imagio_images (
    json_extract(meta_json, '$.category'),
    uploaded_at_ms DESC,
    id DESC
);

CREATE INDEX IF NOT EXISTS idx_imagio_images_category_taken
ON imagio_images (
    json_extract(meta_json, '$.category'),
    (taken_at_ms IS NULL),
    taken_at_ms DESC,
    COALESCE(created_at_ms, uploaded_at_ms) DESC,
    uploaded_at_ms DESC,
    id DESC
);
