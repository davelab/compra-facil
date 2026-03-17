-- Reference tables
CREATE TABLE supermarkets (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        TEXT    NOT NULL UNIQUE,
  unit        TEXT    NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id)
);

-- Price snapshots (one row per CSV upload / import event)
CREATE TABLE price_snapshots (
  id            SERIAL PRIMARY KEY,
  label         TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prices (one row per product × supermarket × snapshot)
-- NULL price = product not available in that store
CREATE TABLE prices (
  id               SERIAL PRIMARY KEY,
  snapshot_id      INTEGER        NOT NULL REFERENCES price_snapshots(id),
  product_id       INTEGER        NOT NULL REFERENCES products(id),
  supermarket_id   INTEGER        NOT NULL REFERENCES supermarkets(id),
  price            NUMERIC(8, 2)           -- NULL = not available
);

-- Indexes for query performance
CREATE INDEX ON prices (snapshot_id);
CREATE INDEX ON prices (product_id, supermarket_id);
CREATE INDEX ON price_snapshots (snapshot_date DESC);
