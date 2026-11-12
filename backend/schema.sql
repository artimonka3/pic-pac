CREATE TABLE IF NOT EXISTS sessions (
    id uuid PRIMARY KEY,
    token_hash bytea NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS drafts (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES sessions(id),
    service text NOT NULL CHECK (service IN ('book', 'print'))
);

CREATE TABLE IF NOT EXISTS media (
    id uuid PRIMARY KEY,
    draft_id uuid NOT NULL REFERENCES drafts(id),
    digest bytea NOT NULL,
    image_format text NOT NULL CHECK (image_format IN ('JPEG', 'PNG')),
    width integer NOT NULL CHECK (width > 0),
    height integer NOT NULL CHECK (height > 0),
    status text NOT NULL CHECK (status IN ('pending', 'passed', 'needs_replacement', 'failed')),
    reason_code text,
    warning_code text,
    rules_version text NOT NULL,
    attempts integer NOT NULL DEFAULT 0,
    retry_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    checked_at timestamptz,
    metrics jsonb
);

CREATE INDEX IF NOT EXISTS media_pending ON media (retry_at, created_at) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS orders (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES sessions(id),
    idempotency_key uuid NOT NULL,
    request_hash bytea NOT NULL,
    details jsonb NOT NULL,
    total bigint NOT NULL CHECK (total >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (owner_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS order_media (
    order_id uuid NOT NULL REFERENCES orders(id),
    media_id uuid NOT NULL REFERENCES media(id),
    PRIMARY KEY (order_id, media_id)
);
