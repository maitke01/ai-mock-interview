-- Migration: create job_preferences table for storing user job preference embeddings
CREATE TABLE IF NOT EXISTS job_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT,
  pref_text TEXT,
  embedding TEXT, -- JSON-encoded array of floats
  metadata TEXT,  -- JSON-encoded metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_preferences_user_id ON job_preferences(user_id);
