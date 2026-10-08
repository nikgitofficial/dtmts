CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refresh_user_idx ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS refresh_family_idx ON refresh_tokens(family_id);


CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  route_from text NOT NULL,
  route_to text NOT NULL,
  pin_code char(6) NOT NULL,
  plate_number text NOT NULL,
  vehicle_type text,
  capacity_kg numeric(10,2) NOT NULL CHECK (capacity_kg > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT drivers_pin_unique UNIQUE (pin_code),
  CONSTRAINT drivers_owner_email_unique UNIQUE (owner_id, email),
  CONSTRAINT drivers_owner_plate_unique UNIQUE (owner_id, plate_number)
);
CREATE INDEX IF NOT EXISTS drivers_owner_idx ON drivers(owner_id, created_at DESC);

-- Driver mobile app login: lockout tracking + lookup indexes
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS failed_attempts int NOT NULL DEFAULT 0;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS locked_until timestamptz;
CREATE INDEX IF NOT EXISTS drivers_email_idx ON drivers(email);
CREATE INDEX IF NOT EXISTS drivers_phone_idx ON drivers(phone);


-- A driver is "sharing" while sharing_since is not null
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS sharing_since timestamptz;

-- Latest known position per driver (one row, upserted)
CREATE TABLE IF NOT EXISTS driver_locations (
  driver_id uuid PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  accuracy double precision,
  speed double precision,     -- m/s
  heading double precision,   -- degrees from north
  recorded_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Breadcrumb history (trail on the map)
CREATE TABLE IF NOT EXISTS location_points (
  id bigserial PRIMARY KEY,
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy double precision,
  speed double precision,
  heading double precision,
  recorded_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT location_points_dedupe UNIQUE (driver_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS location_points_recorded_idx ON location_points(recorded_at);

-- NEW: Session logs. One row per "Start sharing" -> "Stop sharing"
CREATE TABLE IF NOT EXISTS tracking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  end_reason text CHECK (end_reason IN ('driver','replaced','timeout')),
  device_name text,
  device_brand text,
  device_model text,
  os_name text,
  os_version text,
  app_version text,
  ip_address text
);
CREATE INDEX IF NOT EXISTS tracking_sessions_driver_idx ON tracking_sessions(driver_id, started_at DESC);
CREATE INDEX IF NOT EXISTS tracking_sessions_started_idx ON tracking_sessions(started_at DESC);
-- a driver can have only one open session
CREATE UNIQUE INDEX IF NOT EXISTS tracking_sessions_one_open ON tracking_sessions(driver_id) WHERE ended_at IS NULL;