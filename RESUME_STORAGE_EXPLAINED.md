# Resume Storage: Where Your Data is Saved

## Current Behavior (As of Now)

### ❌ **Resume Drafts (Template-based resumes)**
**Where:** Browser `localStorage` only (with user-specific keys)
**Not saved to backend:** NO backend storage

When you click "Save Draft":
```typescript
// Line 1087 in ResumeBuilder.tsx
await setUserItem(draftKey, JSON.stringify(draftData))
// Saves to: localStorage['user_1_resume-draft-modern']
```

**What's stored:**
- Template content (header, sidebar, mainContent)
- Template type (modern, classic, scratch)
- Last saved timestamp

**Limitations:**
- ❌ Only saved in your browser
- ❌ If you clear browser cache → **data is lost**
- ❌ Can't access from different browser/device
- ❌ Not synced to Cloudflare backend

---

### ❌ **PDF Uploads (When you upload a resume PDF)**
**Where:** Browser memory (React state) + sessionStorage
**Not saved to backend:** NO backend storage

When you upload a PDF:
```typescript
// Line 154-158 in ResumeBuilder.tsx
const addFiles = async (files: FileList | File[]) => {
  const newFiles = Array.from(files)
  setResumeFiles(prev => [...prev, ...newFiles])  // Only in React state
  // Extract text/images for display
  // NO API call to save to backend!
}
```

**What happens:**
1. PDF is read into browser memory
2. Text extracted using `unpdf` library
3. Stored in React state (`resumeFiles`, `pdfData`)
4. Optionally saved to sessionStorage for page refresh

**Limitations:**
- ❌ Only exists in browser tab
- ❌ Close tab → **file is lost**
- ❌ Refresh page → might be restored from sessionStorage
- ❌ Not uploaded to Cloudflare
- ❌ Can't access from different device

---

### ✅ **What DOES Get Saved to Backend**

Only these things currently save to Cloudflare:

1. **Uploaded Resumes via MyResumes Component** (if implemented)
   - Uses `/api/add-resume` endpoint
   - Saves to DurableAccount (per-user storage)

2. **ATS Scores, Readability Scores**
   - Calculated via `/api/ats-score` and `/api/readability`
   - Results stored in browser localStorage (user-specific)
   - NOT stored in backend (just calculated)

3. **Job Preferences**
   - Saved via `/api/preferences/upsert`
   - Stored in D1 database with `user_id` filtering
   - ✅ Synced to backend
   - ✅ Accessible from any device

4. **Mock Interview Sessions**
   - Saved via `/api/mock-interview-session/*`
   - Stored in DurableMockInterview (per-user)
   - ✅ Synced to backend

---

## The Problem

```
┌────────────────────────────────────────────────────────┐
│ User "aditya" on Chrome                                │
│                                                        │
│ localStorage['user_1_resume-draft-modern'] = {...}   │
│ sessionStorage['persistedResumeFiles'] = [pdf1.pdf]  │
│                                                        │
│ Cloudflare Backend: NOTHING SAVED                    │
└────────────────────────────────────────────────────────┘

User closes browser → ALL DATA LOST ❌
User opens on Firefox → NO DATA FOUND ❌
User clears cache → ALL DATA LOST ❌
```

---

## What You Need: Backend Resume Storage

### Option 1: Save Drafts to Backend (Recommended)

**Add API endpoint to save drafts:**

```typescript
// New route: /api/save-resume-draft
POST /api/save-resume-draft
{
  "templateId": "modern",
  "content": {
    "header": "...",
    "sidebar": "...",
    "mainContent": "..."
  }
}

// Saves to DurableAccount:
CREATE TABLE resume_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT,
  content TEXT,
  created_at INTEGER,
  updated_at INTEGER
);
```

**Benefits:**
- ✅ Accessible from any device
- ✅ Survives browser cache clears
- ✅ Can have multiple drafts
- ✅ Proper user isolation (already in DurableAccount)

---

### Option 2: Save PDF Uploads to Backend

**Add API endpoint to upload PDFs:**

```typescript
// Use existing /api/add-resume
POST /api/add-resume
FormData: { file: pdfFile }

// Already exists! Just need to call it from ResumeBuilder
```

**Current backend code already supports this:**
```typescript
// packages/app/server/lib/routes/resume/addResumeRoute.ts
export const addResumeRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(cookie)
  const durableAccount = ctx.env.DURABLE_ACCOUNT.get(
    ctx.env.DURABLE_ACCOUNT.idFromName(account.accountId.toString())
  )

  // Saves to DurableAccount's uploaded_resumes table
  await durableAccount.addResume({ filename, fileData })
}
```

**You just need to call it from the frontend!**

---

## How to Fix: Add Backend Saving

### For PDF Uploads

**Update `addFiles` function in ResumeBuilder.tsx:**

```typescript
const addFiles = async (files: FileList | File[]) => {
  const newFiles = Array.from(files)
  setResumeFiles(prev => [...prev, ...newFiles])

  // NEW: Upload to backend
  for (const file of newFiles) {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/add-resume', {
        method: 'POST',
        body: formData,
        credentials: 'include'  // Send JWT cookie
      })

      if (response.ok) {
        console.log(`Uploaded ${file.name} to backend`)
      }
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error)
    }
  }

  // Continue with existing extraction logic...
}
```

---

### For Draft Saving

**Create new backend route:**

```typescript
// packages/app/server/lib/routes/resume/saveResumeDraftRoute.ts
export const saveResumeDraftRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie'))
  if (!account) return ctx.json({ error: 'Unauthorized' }, 401)

  const { templateId, content } = await ctx.req.json()

  const durableId = ctx.env.DURABLE_ACCOUNT.idFromName(
    account.accountId.toString()
  )
  const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableId)

  await durableAccount.saveResumeDraft({ templateId, content })

  return ctx.json({ success: true })
}
```

**Update `saveDraft` in ResumeBuilder.tsx:**

```typescript
const saveDraft = async () => {
  // ... validation ...

  const draftData = {
    header: resumeTemplate.header,
    sidebar: resumeTemplate.sidebar,
    mainContent: resumeTemplate.mainContent,
    savedAt: new Date().toISOString(),
    mode: resumeMode,
    template: selectedTemplate
  }

  // Save to localStorage (for immediate access)
  await setUserItem(draftKey, JSON.stringify(draftData))

  // NEW: Also save to backend
  try {
    await fetch('/api/save-resume-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        templateId: selectedTemplate,
        content: draftData
      })
    })
    console.log('Draft saved to backend')
  } catch (error) {
    console.error('Failed to save draft to backend:', error)
    // Still saved locally, so don't fail completely
  }

  setPopupMessage('Draft saved successfully!')
  setShowPopup(true)
}
```

---

## Summary

### Current State:
| Data Type | Storage Location | Synced to Backend? | Survives Browser Clear? |
|-----------|------------------|-------------------|------------------------|
| Resume Drafts | localStorage | ❌ NO | ❌ NO |
| PDF Uploads | sessionStorage | ❌ NO | ❌ NO |
| ATS Scores | localStorage (user-specific) | ❌ NO | ❌ NO |
| Job Preferences | D1 Database | ✅ YES | ✅ YES |
| Mock Interviews | Durable Objects | ✅ YES | ✅ YES |

### What You Need to Do:

1. **For PDF Uploads:**
   - Call `/api/add-resume` endpoint (already exists!)
   - Add to `addFiles()` function in ResumeBuilder

2. **For Drafts:**
   - Create `/api/save-resume-draft` endpoint
   - Update DurableAccount to store drafts
   - Call from `saveDraft()` function

3. **Benefits:**
   - ✅ Data survives browser clears
   - ✅ Access from any device
   - ✅ Proper per-user isolation
   - ✅ Professional user experience

---

## Quick Answer

**Currently:** Resume drafts and PDF uploads are **NOT saved to backend**. They only exist in your browser's memory/storage.

**To fix:** Add backend API calls to save them to your Cloudflare Durable Objects (which you already have configured and working for other features!).

Would you like me to implement these backend saving features for you?
