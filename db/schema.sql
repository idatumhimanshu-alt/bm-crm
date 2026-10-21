-- BM CRM Database Schema
-- Run: npx wrangler d1 execute bm-crm-db --file=./db/schema.sql

-- ============================================================
-- Users table
-- ============================================================
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,                          -- UUID
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'sales', 'executive')),
  is_active INTEGER NOT NULL DEFAULT 1,         -- 0 = deactivated
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ============================================================
-- Property table
-- ============================================================
CREATE TABLE IF NOT EXISTS property (
  id TEXT PRIMARY KEY,                          -- UUID

  -- Location (PUBLIC)
  location_area TEXT NOT NULL,                  -- e.g. "Baner", "Kothrud"
  city TEXT NOT NULL DEFAULT 'Pune',

  -- Location (IDENTIFIABLE)
  exact_address TEXT,
  building_name TEXT,
  floor TEXT,
  unit_number TEXT,

  -- Configuration (PUBLIC)
  property_type TEXT NOT NULL CHECK (property_type IN ('residential', 'commercial', 'land')),
  configuration TEXT,                           -- e.g. "2BHK", "3BHK", "Shop", "Office"
  land_type TEXT,                               -- e.g. "NA", "Agricultural", "CTS"
  carpet_area_sqft REAL,
  builtup_area_sqft REAL,
  plot_area_sqft REAL,

  -- Pricing (PUBLIC)
  asking_price INTEGER,                         -- in INR
  price_per_sqft INTEGER,

  -- Details (PUBLIC)
  furnishing TEXT CHECK (furnishing IN ('furnished', 'semi-furnished', 'unfurnished') OR furnishing IS NULL),
  facing TEXT,                                  -- e.g. "East", "North-East"
  age_of_property TEXT,                         -- e.g. "New", "1-5 years", "5-10 years"
  amenities TEXT,                               -- comma-separated
  description TEXT,

  -- Owner info (IDENTIFIABLE)
  owner_name TEXT,
  owner_phone TEXT,
  owner_email TEXT,

  -- Source info (IDENTIFIABLE)
  source TEXT,                                  -- e.g. "Direct", "Broker", "Website"
  source_details TEXT,

  -- Internal (IDENTIFIABLE)
  internal_notes TEXT,

  -- Photos (stored in R2, paths here)
  interior_photos TEXT DEFAULT '[]',            -- JSON array of R2 keys
  exterior_photos TEXT DEFAULT '[]',            -- JSON array of R2 keys (IDENTIFIABLE)

  -- Status
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'under_negotiation', 'sold', 'withdrawn')),

  -- Metadata
  created_by TEXT NOT NULL REFERENCES user(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ============================================================
-- Activity Log table
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,                          -- UUID
  property_id TEXT NOT NULL REFERENCES property(id),
  user_id TEXT NOT NULL REFERENCES user(id),
  action TEXT NOT NULL,                         -- e.g. "created", "updated", "exported_pdf", "status_changed"
  details TEXT,                                 -- JSON with change details
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ============================================================
-- FTS5 Virtual Table for full-text search
-- ============================================================
CREATE VIRTUAL TABLE IF NOT EXISTS property_fts USING fts5(
  location_area,
  city,
  configuration,
  property_type,
  land_type,
  description,
  amenities,
  content='property',
  content_rowid='rowid'
);

-- ============================================================
-- Triggers to keep FTS5 in sync
-- ============================================================
CREATE TRIGGER IF NOT EXISTS property_fts_insert AFTER INSERT ON property BEGIN
  INSERT INTO property_fts(rowid, location_area, city, configuration, property_type, land_type, description, amenities)
  VALUES (new.rowid, new.location_area, new.city, new.configuration, new.property_type, new.land_type, new.description, new.amenities);
END;

CREATE TRIGGER IF NOT EXISTS property_fts_update AFTER UPDATE ON property BEGIN
  INSERT INTO property_fts(property_fts, rowid, location_area, city, configuration, property_type, land_type, description, amenities)
  VALUES ('delete', old.rowid, old.location_area, old.city, old.configuration, old.property_type, old.land_type, old.description, old.amenities);
  INSERT INTO property_fts(rowid, location_area, city, configuration, property_type, land_type, description, amenities)
  VALUES (new.rowid, new.location_area, new.city, new.configuration, new.property_type, new.land_type, new.description, new.amenities);
END;

CREATE TRIGGER IF NOT EXISTS property_fts_delete AFTER DELETE ON property BEGIN
  INSERT INTO property_fts(property_fts, rowid, location_area, city, configuration, property_type, land_type, description, amenities)
  VALUES ('delete', old.rowid, old.location_area, old.city, old.configuration, old.property_type, old.land_type, old.description, old.amenities);
END;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_property_status ON property(status);
CREATE INDEX IF NOT EXISTS idx_property_location ON property(location_area, city);
CREATE INDEX IF NOT EXISTS idx_property_type ON property(property_type);
CREATE INDEX IF NOT EXISTS idx_property_config ON property(configuration);
CREATE INDEX IF NOT EXISTS idx_property_price ON property(asking_price);
CREATE INDEX IF NOT EXISTS idx_property_created ON property(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_property ON activity_log(property_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
