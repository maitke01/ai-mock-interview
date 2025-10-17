CREATE TABLE IF NOT EXISTS resume_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  template_type TEXT DEFAULT 'modern',
  account_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_resume_drafts_account_id ON resume_drafts(account_id);
CREATE INDEX IF NOT EXISTS idx_resume_drafts_updated_at ON resume_drafts(updated_at);