# Backend Architecture - AI Mock Interview

## Overview
The backend uses **Cloudflare Workers** with a hybrid storage approach:
- **Durable Objects** for per-user stateful data (resumes, interviews)
- **D1 SQLite Database** for shared searchable data (job preferences)
- **JWT authentication** with HttpOnly cookies

---

## Directory Structure

```
packages/app/server/
├── index.ts                          # Main Hono app with route definitions
├── lib/
│   ├── account/
│   │   └── DurableAccount.ts         # Per-user durable object for resumes
│   ├── interview/
│   │   └── DurableMockInterview.ts   # Per-user durable object for interviews
│   └── routes/
│       ├── login/
│       │   ├── loginRoute.ts         # POST /login - authenticate user
│       │   └── registerRoute.ts      # POST /register - create account
│       ├── user/
│       │   └── currentUserRoute.ts   # GET /api/current-user - get user info
│       ├── resume/
│       │   ├── addResumeRoute.ts     # POST /api/add-resume
│       │   ├── listResumesRoute.ts   # GET /api/list-resumes
│       │   ├── getResumeRoute.ts     # GET /api/get-resume/:id
│       │   ├── deleteResumeRoute.ts  # DELETE /api/delete-resume
│       │   ├── optimizeResumeRoute.ts
│       │   ├── atsScoreRoute.ts
│       │   ├── extractKeywordsRoute.ts
│       │   ├── formatResumeRoute.ts
│       │   └── readabilityRoute.ts
│       ├── preferences/
│       │   ├── upsertPreferenceRoute.ts   # POST /api/preferences/upsert
│       │   ├── listPreferencesRoute.ts    # GET /api/preferences/list
│       │   ├── searchPreferencesRoute.ts  # POST /api/preferences/search
│       │   └── deletePreferenceRoute.ts   # DELETE /api/preferences/delete/:id
│       └── interview/
│           ├── scheduleMockInterviewRoute.ts
│           ├── listMockInterviewsRoute.ts
│           ├── getMockInterviewRoute.ts
│           ├── updateMockInterviewRoute.ts
│           ├── cancelMockInterviewRoute.ts
│           ├── deleteMockInterviewRoute.ts
│           ├── startMockInterviewSessionRoute.ts
│           ├── getMockInterviewSessionRoute.ts
│           ├── submitMockInterviewResponseRoute.ts
│           ├── endMockInterviewSessionRoute.ts
│           └── listMockInterviewSessionsRoute.ts
```

---

## User Data Storage Architecture

### Per-User Storage (Isolated by Design)

Each user gets their own **Durable Object** instances:

```
User: aditya (accountId: 1)
├─ DurableAccount#1
│  ├─ uploaded_resumes table
│  ├─ resume_sections table
│  └─ ai_results table
└─ DurableMockInterview#1
   ├─ interview_sessions table
   └─ conversation_turns table

User: testuser (accountId: 2)
├─ DurableAccount#2
│  ├─ uploaded_resumes table (separate!)
│  ├─ resume_sections table
│  └─ ai_results table
└─ DurableMockInterview#2
   ├─ interview_sessions table
   └─ conversation_turns table
```

---

## Storage Systems

### 1. **Durable Objects** (Per-User Isolated Storage)

#### DurableAccount
**Location:** `server/lib/account/DurableAccount.ts`

**Purpose:** Stores user's resume data in per-user SQL storage

**Tables:**
```sql
CREATE TABLE uploaded_resumes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  file_data BLOB NOT NULL,
  upload_date INTEGER NOT NULL
);

CREATE TABLE resume_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resume_id INTEGER NOT NULL,
  section_type TEXT NOT NULL,
  content TEXT,
  FOREIGN KEY (resume_id) REFERENCES uploaded_resumes(id)
);

CREATE TABLE ai_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resume_id INTEGER NOT NULL,
  result_type TEXT NOT NULL,
  result_data TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (resume_id) REFERENCES uploaded_resumes(id)
);
```

**How it's accessed:**
```typescript
const account = await ctx.env.AUTH.getAccount(cookie)
const durableId = ctx.env.DURABLE_ACCOUNT.idFromName(account.accountId.toString())
const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableId)
await durableAccount.addResume(...)
```

**Routes using DurableAccount:**
- `/api/add-resume` - Store resume PDF
- `/api/list-resumes` - List user's resumes
- `/api/get-resume/:id` - Retrieve specific resume
- `/api/delete-resume` - Delete user's resume

---

#### DurableMockInterview
**Location:** `server/lib/interview/DurableMockInterview.ts`

**Purpose:** Stores user's interview sessions and conversation history

**Tables:**
```sql
CREATE TABLE interview_sessions (
  id TEXT PRIMARY KEY,
  mock_interview_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  ended_at INTEGER
);

CREATE TABLE conversation_turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  feedback TEXT,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
);

CREATE TABLE generated_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  video_url TEXT,
  FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
);
```

**How it's accessed:**
```typescript
const account = await ctx.env.AUTH.getAccount(cookie)
const durableId = ctx.env.DURABLE_MOCK_INTERVIEW.idFromName(account.accountId.toString())
const durableInterview = ctx.env.DURABLE_MOCK_INTERVIEW.get(durableId)
await durableInterview.startSession(...)
```

**Routes using DurableMockInterview:**
- `/api/mock-interview-session/start` - Start interview
- `/api/mock-interview-session/:sessionId` - Get session
- `/api/mock-interview-session/:sessionId/respond` - Submit answer
- `/api/mock-interview-session/:sessionId/end` - End session
- `/api/mock-interview-session/list` - List all sessions

---

### 2. **D1 Database** (Shared with User Filtering)

#### Job Preferences
**Table:** `job_preferences`

**Schema:**
```sql
CREATE TABLE job_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,  -- Links to account.accountId
  name TEXT,
  pref_text TEXT NOT NULL,
  embedding TEXT,         -- JSON array of embedding vector
  metadata TEXT,          -- JSON metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_id ON job_preferences(user_id);
```

**Why D1 instead of Durable Object?**
- Needs vector similarity search across preferences
- Embedding-based matching requires querying all user's preferences
- D1 supports complex SQL queries for filtering and sorting

**Security:**
- ✅ **NOW ENFORCED:** All queries filter by `user_id = account.accountId`
- ✅ **NOW ENFORCED:** Authentication required for all operations
- ✅ **NOW ENFORCED:** Client-provided userId ignored

---

## Authentication Flow

### Registration
**Route:** `POST /register`
**File:** `server/lib/routes/login/registerRoute.ts`

```typescript
1. Receive username + password
2. Hash password with argon2
3. Insert into accounts table → get accountId
4. Sign JWT with { sub: accountId }
5. Set HttpOnly cookie with JWT (1 year expiration)
6. Return success
```

### Login
**Route:** `POST /login`
**File:** `server/lib/routes/login/loginRoute.ts`

```typescript
1. Receive username + password
2. Look up account by username
3. Verify password with argon2
4. Sign JWT with { sub: accountId }
5. Set HttpOnly cookie with JWT
6. Return success
```

### Authentication Check
**Route:** `GET /api/current-user`
**File:** `server/lib/routes/user/currentUserRoute.ts`

```typescript
1. Extract JWT from Cookie header
2. Verify and decode JWT
3. Return { accountId, username }
```

**Used by:** Frontend `userStorage.ts` to get user ID for localStorage namespacing

---

## Data Flow: User Creates Account → Uploads Resume

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Registration                                        │
│    POST /register { username: "aditya", password: "..." }  │
│    → Creates account (accountId: 1)                        │
│    → Sets JWT cookie                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend Gets User ID                                    │
│    GET /api/current-user                                    │
│    ← Returns { accountId: 1, username: "aditya" }         │
│    → Cached in userStorage.ts                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Upload Resume                                            │
│    POST /api/add-resume                                     │
│    → Backend extracts accountId from JWT cookie            │
│    → Gets DurableAccount instance for user 1               │
│    → Stores in user's private SQL table                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Save Dashboard Metrics (Frontend)                        │
│    → Calls setUserItem('atsScore', '85')                   │
│    → Saves to localStorage as 'user_1_atsScore'            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Save Job Preference                                      │
│    POST /api/preferences/upsert                             │
│    → Backend extracts accountId from JWT cookie            │
│    → INSERT INTO job_preferences (user_id='1', ...)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Model

### Before Fixes (VULNERABLE)
```typescript
// Job preferences could leak!
const userId = resolvedUserId || incomingUserId || 'public'  // ❌ Bad!

// Could return ALL users' data
const sql = userId
  ? `WHERE user_id = ?`
  : `SELECT * FROM job_preferences`  // ❌ Returns everything!
```

### After Fixes (SECURE)
```typescript
// Always enforce authentication
const account = await ctx.env.AUTH.getAccount(cookie)
if (!account || !account.accountId) {
  return ctx.json({ error: 'Unauthorized' }, 401)  // ✅ Reject
}

// ALWAYS use server-side accountId
const userId = String(account.accountId)  // ✅ From JWT only

// ALWAYS filter by user
const sql = `WHERE user_id = ?`  // ✅ Always filters
stmt.bind(userId)
```

---

## API Routes Summary

### Authentication
| Method | Route | Auth Required | Purpose |
|--------|-------|---------------|---------|
| POST | `/register` | No | Create account |
| POST | `/login` | No | Login |
| GET | `/api/current-user` | Yes | Get user info |

### Resumes (Durable Objects)
| Method | Route | Auth Required | Isolation |
|--------|-------|---------------|-----------|
| POST | `/api/add-resume` | Yes | Per-user DO |
| GET | `/api/list-resumes` | Yes | Per-user DO |
| GET | `/api/get-resume/:id` | Yes | Per-user DO |
| DELETE | `/api/delete-resume` | Yes | Per-user DO |
| POST | `/api/optimize-resume` | No* | Stateless |
| POST | `/api/ats-score` | No* | Stateless |
| POST | `/api/extract-keywords` | No* | Stateless |
| POST | `/api/readability` | No* | Stateless |

*AI processing routes don't store data, just process input

### Job Preferences (D1 Database)
| Method | Route | Auth Required | Filtering |
|--------|-------|---------------|-----------|
| POST | `/api/preferences/upsert` | Yes | By user_id |
| GET | `/api/preferences/list` | Yes | By user_id |
| POST | `/api/preferences/search` | Yes | By user_id |
| DELETE | `/api/preferences/delete/:id` | Yes | Owner check |

### Mock Interviews (Durable Objects)
| Method | Route | Auth Required | Isolation |
|--------|-------|---------------|-----------|
| POST | `/api/schedule-mock-interview` | Yes | Per-user DO |
| GET | `/api/list-mock-interviews` | Yes | Per-user DO |
| GET | `/api/get-mock-interview/:id` | Yes | Per-user DO |
| PATCH | `/api/update-mock-interview/:id` | Yes | Per-user DO |
| POST | `/api/cancel-mock-interview/:id` | Yes | Per-user DO |
| DELETE | `/api/delete-mock-interview/:id` | Yes | Per-user DO |

### Interview Sessions (Durable Objects)
| Method | Route | Auth Required | Isolation |
|--------|-------|---------------|-----------|
| POST | `/api/mock-interview-session/start` | Yes | Per-user DO |
| GET | `/api/mock-interview-session/:id` | Yes | Per-user DO |
| POST | `/api/mock-interview-session/:id/respond` | Yes | Per-user DO |
| POST | `/api/mock-interview-session/:id/end` | Yes | Per-user DO |
| GET | `/api/mock-interview-session/list` | Yes | Per-user DO |

---

## Example: How Resume Upload Works

### 1. Frontend Call
```typescript
const formData = new FormData()
formData.append('file', pdfFile)

await fetch('/api/add-resume', {
  method: 'POST',
  body: formData,
  credentials: 'include'  // Sends JWT cookie
})
```

### 2. Backend Route (`addResumeRoute.ts`)
```typescript
export const addResumeRoute: Route = async (ctx) => {
  // 1. Get authenticated user from JWT cookie
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie'))
  if (!account) return ctx.json({ error: 'Unauthorized' }, 401)

  // 2. Get user's unique Durable Object instance
  const durableId = ctx.env.DURABLE_ACCOUNT.idFromName(
    account.accountId.toString()  // "1" → unique DO for user 1
  )
  const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableId)

  // 3. Store in user's private storage
  const result = await durableAccount.addResume({
    filename: file.name,
    fileData: await file.arrayBuffer()
  })

  return ctx.json({ success: true, resumeId: result.id })
}
```

### 3. Inside DurableAccount (`DurableAccount.ts`)
```typescript
class DurableAccount {
  async addResume({ filename, fileData }) {
    // Each Durable Object has its own SQL database
    const stmt = `INSERT INTO uploaded_resumes (filename, file_data, upload_date)
                  VALUES (?, ?, ?)`

    await this.sql.exec(stmt, [filename, fileData, Date.now()])

    return { id: lastInsertRowid }
  }
}
```

---

## Data Isolation Guarantees

### ✅ What's Isolated Per User

1. **Resumes** → Each user has their own `DurableAccount` instance
2. **Interview Sessions** → Each user has their own `DurableMockInterview` instance
3. **Job Preferences** → Filtered by `user_id` in shared D1 database
4. **Dashboard Metrics** → Namespaced by `user_${accountId}_` in localStorage
5. **Resume Drafts** → Namespaced by `user_${accountId}_` in localStorage

### ❌ What's NOT Isolated (Intentionally Shared)

1. **AI Processing** → Stateless routes (ats-score, optimize-resume, etc.)
   - Don't store data, just process input
   - Multiple users can use same AI models

---

## Environment Bindings (wrangler.toml)

```toml
[env.production]
# Durable Objects
[[env.production.durable_objects.bindings]]
name = "DURABLE_ACCOUNT"
class_name = "DurableAccount"

[[env.production.durable_objects.bindings]]
name = "DURABLE_MOCK_INTERVIEW"
class_name = "DurableMockInterview"

# D1 Database
[[env.production.d1_databases]]
binding = "DB"
database_name = "ai-mock-interview-db"

# Auth Service
[[env.production.services]]
binding = "AUTH"
service = "auth-service"

# AI Models (optional)
[env.production.ai]
binding = "AI"
```

---

## Summary

Your backend is designed with **per-user data isolation** in mind:

- **Authentication:** JWT in HttpOnly cookies
- **User-specific data:** Stored in per-user Durable Objects
- **Searchable data:** Stored in D1 with user_id filtering
- **Frontend cache:** Namespaced by user ID in localStorage

Each user has completely separate:
- Resume storage
- Interview sessions
- Job preferences
- Dashboard metrics
- Resume drafts

The fixes we made ensure that the D1 database (job preferences) now properly enforces user filtering, closing the security vulnerability.
