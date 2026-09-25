-- WHO Control API initial schema
CREATE TABLE IF NOT EXISTS app_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  config_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS announcement_versions (
  revision INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  button_text TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS announcement_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  revision INTEGER NOT NULL,
  response TEXT NOT NULL,
  device_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone_masked TEXT,
  platform TEXT,
  app_version TEXT,
  last_seen INTEGER,
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  platform TEXT,
  app_version TEXT,
  last_seen INTEGER,
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS number_identity_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lookup_key TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  contribution_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_identity_lookup ON number_identity_candidates(lookup_key);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  phone_masked TEXT,
  reason TEXT NOT NULL,
  report_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);

CREATE TABLE IF NOT EXISTS crashes (
  id TEXT PRIMARY KEY,
  received_at INTEGER NOT NULL,
  app_version TEXT,
  platform TEXT,
  fatal INTEGER NOT NULL DEFAULT 0,
  error TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  fixed_at INTEGER
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  category TEXT,
  title TEXT,
  message TEXT,
  version TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT,
  action TEXT NOT NULL,
  target TEXT,
  before_json TEXT,
  after_json TEXT,
  result TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

