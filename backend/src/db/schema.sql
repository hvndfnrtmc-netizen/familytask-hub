CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT CHECK(role IN ('parent','child')) DEFAULT 'child',
  avatar TEXT DEFAULT '👤',
  points INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  priority TEXT CHECK(priority IN ('low','medium','high')) DEFAULT 'medium',
  status TEXT CHECK(status IN ('pending','done','approved')) DEFAULT 'pending',
  assigned_to INTEGER REFERENCES members(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
  points_value INTEGER DEFAULT 10,
  recurrence TEXT DEFAULT 'none',
  recurrence_days TEXT,
  recurrence_end_date TEXT,
  category TEXT DEFAULT 'other',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  icon TEXT DEFAULT '🎁',
  created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reward_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reward_id INTEGER REFERENCES rewards(id) ON DELETE CASCADE,
  member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
  status TEXT CHECK(status IN ('pending','approved')) DEFAULT 'pending',
  claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
