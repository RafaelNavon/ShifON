-- ShifON Database Schema

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bulls (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  bull_code VARCHAR(50) UNIQUE NOT NULL,
  breed VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5 fixed containers
CREATE TABLE containers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT
);

-- 6 slots per container, each slot has UP and DOWN position (60 total positions)
CREATE TABLE slots (
  id SERIAL PRIMARY KEY,
  container_id INTEGER REFERENCES containers(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 6),
  position VARCHAR(4) NOT NULL CHECK (position IN ('UP', 'DOWN')),
  UNIQUE (container_id, slot_number, position)
);

-- A batch of straws stored in one slot position
CREATE TABLE batches (
  id SERIAL PRIMARY KEY,
  bull_id INTEGER REFERENCES bulls(id) ON DELETE SET NULL,
  slot_id INTEGER REFERENCES slots(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  sio_batch_code VARCHAR(100),
  production_date DATE,
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('approved', 'rejected', 'skew')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shipments (
  id SERIAL PRIMARY KEY,
  destination VARCHAR(10) NOT NULL CHECK (destination IN ('north', 'south')),
  shipment_date DATE NOT NULL,
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shipment_items (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER REFERENCES shipments(id) ON DELETE CASCADE,
  batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL
);

CREATE TABLE daily_logs (
  id SERIAL PRIMARY KEY,
  bull_id INTEGER REFERENCES bulls(id) ON DELETE SET NULL,
  slot_id INTEGER REFERENCES slots(id) ON DELETE SET NULL,
  quantity_produced INTEGER NOT NULL,
  log_date DATE NOT NULL,
  recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed containers (always exactly 5)
INSERT INTO containers (name) VALUES
  ('Container 90'),
  ('Container 91'),
  ('Container 92'),
  ('Container 93'),
  ('Container 94');

-- Seed all 60 slot positions (5 containers × 6 slots × 2 positions)
INSERT INTO slots (container_id, slot_number, position)
SELECT c.id, s.slot_number, p.position
FROM containers c
CROSS JOIN (SELECT generate_series(1, 6) AS slot_number) s
CROSS JOIN (VALUES ('UP'), ('DOWN')) p(position);
