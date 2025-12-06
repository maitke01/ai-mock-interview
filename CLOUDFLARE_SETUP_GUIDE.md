# Cloudflare Backend Setup Guide

## Your Current Cloudflare Configuration

**Account ID:** `fbc1a98f43043f48604bf34d88625d91`
**Worker Name:** `ai-mock-interview`

---

## What You Already Have Configured ✅

Based on your `wrangler.jsonc`, you already have:

### 1. **D1 Database** (Shared Database with User Filtering)
```json
{
  "binding": "DB",
  "database_name": "ai-mock-interview",
  "database_id": "9cae5d70-e81c-482a-81aa-3ac1821fae7f"
}
```

**Location in Cloudflare Dashboard:**
- Go to: https://dash.cloudflare.com/fbc1a98f43043f48604bf34d88625d91
- Navigate to: **Workers & Pages** → **D1 SQL Database**
- You should see database: **ai-mock-interview**

**What's Stored Here:**
- `job_preferences` table (with `user_id` column for filtering)
- `accounts` table (usernames, password hashes)

**This is where the fixes were applied** - the backend now properly filters by `user_id`!

---

### 2. **Durable Objects** (Per-User Isolated Storage)
```json
{
  "durable_objects": {
    "bindings": [
      { "class_name": "DurableAccount", "name": "DURABLE_ACCOUNT" },
      { "class_name": "DurableMockInterview", "name": "DURABLE_MOCK_INTERVIEW" }
    ]
  }
}
```

**Location in Cloudflare Dashboard:**
- Go to: https://dash.cloudflare.com/fbc1a98f43043f48604bf34d88625d91
- Navigate to: **Workers & Pages** → Your Worker → **Settings** → **Durable Objects**

**What Happens Automatically:**
When a user creates an account:
1. User gets `accountId` (e.g., `1`, `2`, `3`, etc.)
2. Cloudflare **automatically creates** a `DurableAccount#1` instance for user 1
3. Cloudflare **automatically creates** a `DurableMockInterview#1` instance for user 1
4. Each user gets their own isolated Durable Object instances

**No manual setup needed** - Cloudflare creates these automatically!

---

### 3. **R2 Bucket** (File Storage for Videos)
```json
{
  "binding": "MOCK_INTERVIEW_BUCKET",
  "bucket_name": "mock-interview-videos"
}
```

**Location in Cloudflare Dashboard:**
- Go to: https://dash.cloudflare.com/fbc1a98f43043f48604bf34d88625d91
- Navigate to: **R2** → **Buckets**
- You should see bucket: **mock-interview-videos**

**What's Stored Here:**
- AI-generated interview videos

---

### 4. **Workers AI** (AI Processing)
```json
{
  "ai": { "binding": "AI" }
}
```

**What This Does:**
- Gives your Worker access to Cloudflare's AI models
- Used for resume optimization, ATS scoring, etc.

---

### 5. **Auth Service** (Separate Worker for Authentication)
```json
{
  "services": [
    { "binding": "AUTH", "service": "auth" }
  ]
}
```

**Location:**
- This is the separate `packages/auth/` worker you have
- Handles JWT signing/verification, password hashing with argon2

---

## How User Data is Stored (Per Account)

### When User "aditya" Creates Account:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. D1 Database (Shared - Account Creation)                      │
│    Table: accounts                                               │
│    INSERT INTO accounts (username, password_hash)                │
│    VALUES ('aditya', '$argon2...')                              │
│    → Returns accountId: 1                                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. JWT Token Created                                             │
│    { sub: 1 } → Signed with private key                        │
│    → Stored in HttpOnly cookie                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. First Resume Upload                                           │
│    Backend: ctx.env.DURABLE_ACCOUNT.idFromName("1")            │
│    Cloudflare: Creates DurableAccount#1 instance                │
│    Location: Cloudflare automatically picks datacenter          │
│    Storage: User 1's private SQL database inside DO             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. First Mock Interview                                          │
│    Backend: ctx.env.DURABLE_MOCK_INTERVIEW.idFromName("1")     │
│    Cloudflare: Creates DurableMockInterview#1 instance          │
│    Storage: User 1's interview data inside DO                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Job Preference Saved                                          │
│    D1 Database (Shared)                                          │
│    Table: job_preferences                                        │
│    INSERT (id, user_id, name, pref_text, ...)                  │
│    VALUES ('uuid', '1', 'Software Engineer', ...)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Where to Find Your Data in Cloudflare Dashboard

### 1. **D1 Database** (Shared Tables)

**URL:** https://dash.cloudflare.com/fbc1a98f43043f48604bf34d88625d91/workers/d1/databases

**To View/Query:**
1. Go to D1 → `ai-mock-interview`
2. Click **Console** tab
3. Run queries:

```sql
-- See all accounts
SELECT id, username FROM accounts;

-- See all job preferences with user ownership
SELECT id, user_id, name, pref_text
FROM job_preferences
ORDER BY user_id, created_at;

-- See preferences for specific user
SELECT * FROM job_preferences WHERE user_id = '1';
```

**To Create Missing Tables:**
If you don't have these tables yet, create them:

```sql
-- Accounts table (if not exists)
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Job preferences table
CREATE TABLE IF NOT EXISTS job_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT,
  pref_text TEXT NOT NULL,
  embedding TEXT,
  metadata TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_user_id ON job_preferences(user_id);
```

---

### 2. **Durable Objects** (Per-User Storage)

**URL:** https://dash.cloudflare.com/fbc1a98f43043f48604bf34d88625d91/workers/durable-objects

**To View:**
1. Go to Workers & Pages → `ai-mock-interview`
2. Click **Durable Objects** tab
3. You'll see instances like:
   - `DurableAccount#1` (for user accountId=1)
   - `DurableAccount#2` (for user accountId=2)
   - `DurableMockInterview#1`
   - etc.

**Note:** Cloudflare creates these automatically when first accessed. You don't manually create them!

**To Inspect Data:**
- Durable Objects don't have a built-in UI to view SQL data
- You'd need to add admin routes to your Worker to query them
- Each DO has its own isolated SQL database

---

### 3. **R2 Bucket** (Video Storage)

**URL:** https://dash.cloudflare.com/fbc1a98f43043f48604bf34d88625d91/r2/buckets

**To View:**
1. Go to R2 → `mock-interview-videos`
2. Browse files (AI-generated videos)

---

### 4. **Worker Logs** (Debugging)

**URL:** https://dash.cloudflare.com/fbc1a98f43043f48604bf34d88625d91/workers/services/view/ai-mock-interview/production/logs

**To See Live Logs:**
```bash
cd /Users/gauravtadia/ai-mock-interview/packages/app
npx wrangler tail
```

This shows real-time logs including:
- `console.log()` statements
- Errors
- Request/response info

---

## How to Set Up Backend for New Users

### **You DON'T need to do anything manually!**

When a new user creates an account:

1. ✅ **Accounts table** - Automatically created in D1
2. ✅ **DurableAccount** - Cloudflare creates on first use
3. ✅ **DurableMockInterview** - Cloudflare creates on first use
4. ✅ **Job preferences** - Filtered by `user_id` in D1
5. ✅ **Frontend storage** - Namespaced by `user_${accountId}_`

**The backend isolation happens automatically through:**
- JWT authentication extracting `accountId`
- Durable Object ID generation: `idFromName(accountId.toString())`
- D1 queries filtering: `WHERE user_id = ?` bound to `accountId`

---

## Testing Your Setup

### 1. **Check D1 Database**
```bash
cd /Users/gauravtadia/ai-mock-interview/packages/app
npx wrangler d1 execute ai-mock-interview --remote --command "SELECT * FROM accounts"
npx wrangler d1 execute ai-mock-interview --remote --command "SELECT * FROM job_preferences"
```

### 2. **Deploy Your Changes**
```bash
cd /Users/gauravtadia/ai-mock-interview/packages/app
npm run deploy
```

This will deploy:
- Your updated backend routes (with user isolation fixes)
- The new `/api/current-user` endpoint
- All frontend changes

### 3. **Test with Multiple Users**

**Create User 1:**
```bash
# In browser: Go to /signup
# Username: aditya
# Password: test123
```

**Upload resume, save job preferences**

**Logout and Create User 2:**
```bash
# In browser: Go to /signup
# Username: testuser
# Password: test456
```

**Verify User 2 sees empty dashboard**

**Check D1 to see data separation:**
```sql
SELECT user_id, COUNT(*) as pref_count
FROM job_preferences
GROUP BY user_id;
```

Should show:
```
user_id | pref_count
--------|----------
1       | 5
2       | 0
```

---

## Environment Variables / Secrets

If you need to add secrets (like `OPENAI_API_KEY`):

```bash
cd /Users/gauravtadia/ai-mock-interview/packages/app

# Set secret
npx wrangler secret put OPENAI_API_KEY
# Paste your key when prompted

# List secrets
npx wrangler secret list
```

Then use in your code:
```typescript
const apiKey = ctx.env.OPENAI_API_KEY
```

---

## Architecture Summary

```
YOUR CLOUDFLARE ACCOUNT (fbc1a98f43043f48604bf34d88625d91)
│
├── Workers
│   ├── ai-mock-interview (main app)
│   │   └── Bound to: D1, Durable Objects, R2, AUTH service, AI
│   ├── auth (authentication service)
│   │   └── Bound to: argon2 service
│   └── argon2 (password hashing)
│
├── D1 Databases
│   └── ai-mock-interview (9cae5d70-e81c-482a-81aa-3ac1821fae7f)
│       ├── accounts table
│       └── job_preferences table (filtered by user_id)
│
├── Durable Objects (Auto-created per user)
│   ├── DurableAccount#1 → User accountId=1
│   ├── DurableAccount#2 → User accountId=2
│   ├── DurableMockInterview#1 → User accountId=1
│   └── DurableMockInterview#2 → User accountId=2
│
└── R2 Buckets
    └── mock-interview-videos
```

---

## Next Steps

1. **Deploy the fixes:**
   ```bash
   cd packages/app
   npm run deploy
   ```

2. **Create test accounts and verify isolation:**
   - Create account "aditya"
   - Upload resume, save job preferences
   - Logout
   - Create account "testuser"
   - Verify empty dashboard ✅

3. **Monitor logs:**
   ```bash
   npx wrangler tail
   ```

4. **Check D1 data:**
   ```bash
   npx wrangler d1 execute ai-mock-interview --remote \
     --command "SELECT user_id, COUNT(*) FROM job_preferences GROUP BY user_id"
   ```

---

## Where Your Code Runs

- **Development:** `npm run dev` → Local Vite dev server + Cloudflare bindings
- **Production:** `npm run deploy` → Deployed to Cloudflare Workers globally
- **Data:** Stored in Cloudflare's edge network (closest to users)

**Your Cloudflare Worker URL:**
- Probably: `https://ai-mock-interview.{your-subdomain}.workers.dev`
- Or custom domain if configured

Check deployment URL:
```bash
npx wrangler deployments list
```

---

## Summary

✅ **You already have everything configured!**

The backend structure exists in your Cloudflare account:
- D1 database for shared data (accounts, job preferences)
- Durable Objects configured for per-user storage
- R2 bucket for video files
- Auth service for JWT/password handling

**The fixes we made:**
- ✅ Backend routes now enforce user isolation
- ✅ Frontend uses user-specific localStorage keys
- ✅ New `/api/current-user` endpoint for user ID

**All you need to do:**
1. Deploy: `npm run deploy`
2. Test with multiple accounts
3. Verify data isolation works!

No manual backend setup needed - Cloudflare handles it automatically! 🎉
