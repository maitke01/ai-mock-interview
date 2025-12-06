# Entity Relationship Diagram - AI Mock Interview Resume Builder

## Overview

This ERD shows the data entities and their relationships in the Resume Builder system. Since this is a **client-side application** using **LocalStorage**, there's no traditional database, but we model the data structures as entities.

## Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER                                     │
│  (Implicit - no actual user entity, browser-based)               │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ owns
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        │                    │                    │
        ↓                    ↓                    ↓
┌───────────────┐   ┌──────────────────┐   ┌────────────────┐
│  DRAFT        │   │  UPLOADED_RESUME │   │  TEMPLATE      │
│  RESUME       │   │                  │   │                │
├───────────────┤   ├──────────────────┤   ├────────────────┤
│ PK: draftId   │   │ PK: resumeId     │   │ PK: templateId │
│ templateId FK │   │ fileName         │   │ name           │
│ content       │   │ pdfData          │   │ description    │
│ savedAt       │   │ extractedText    │   │ content        │
│ lastModified  │   │ uploadedAt       │   │ category       │
└───────┬───────┘   └────────┬─────────┘   └────────┬───────┘
        │                    │                       │
        │ has                │ has                   │ provides
        │                    │                       │
        ↓                    ↓                       ↓
┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐
│  AI_SUGGESTION   │  │  PDF_METADATA    │  │  TEMPLATE_     │
│                  │  │                  │  │  SECTION       │
├──────────────────┤  ├──────────────────┤  ├────────────────┤
│ PK: suggestionId │  │ PK: metadataId   │  │ PK: sectionId  │
│ resumeId FK      │  │ resumeId FK      │  │ templateId FK  │
│ type             │  │ pageCount        │  │ name           │
│ originalText     │  │ hasText          │  │ content        │
│ suggestedText    │  │ usedOCR          │  │ order          │
│ reason           │  │ fileSize         │  │                │
│ applied          │  │ dimensions       │  │                │
│ createdAt        │  │                  │  │                │
└──────────────────┘  └──────────────────┘  └────────────────┘
```

## Entity Definitions

### 1. DRAFT_RESUME

**Description:** Represents resumes created from templates that are being edited and saved as drafts.

**Attributes:**
| Attribute | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| draftId | string | Unique identifier | PK, UUID |
| templateId | string | Reference to template used | FK → TEMPLATE |
| content | JSON | Resume content (header, sidebar, mainContent) | NOT NULL |
| savedAt | timestamp | When draft was last saved | NOT NULL |
| lastModified | timestamp | Last modification time | Auto-update |
| templateName | string | Name of template used | |
| wordCount | number | Number of words in resume | Calculated |
| status | enum | 'draft', 'completed' | Default: 'draft' |

**Storage Key:** `resume-draft-{draftId}`

**Example Data:**
```json
{
  "draftId": "uuid-12345",
  "templateId": "iiitv-template",
  "content": {
    "header": "<p>John Doe</p>",
    "sidebar": "<ul><li>Skills</li></ul>",
    "mainContent": "<p>Experience...</p>"
  },
  "savedAt": "2025-12-05T10:30:00Z",
  "lastModified": "2025-12-05T10:35:00Z",
  "templateName": "IIITV Academic Template",
  "wordCount": 450,
  "status": "draft"
}
```

### 2. UPLOADED_RESUME

**Description:** Represents PDF resumes uploaded by the user for editing.

**Attributes:**
| Attribute | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| resumeId | string | Unique identifier | PK, UUID |
| fileName | string | Original PDF filename | NOT NULL |
| pdfData | string | Base64 encoded PDF | NOT NULL |
| extractedText | string | Text extracted from PDF | |
| uploadedAt | timestamp | Upload time | NOT NULL |
| lastEdited | timestamp | Last edit time | Auto-update |
| extractionMethod | enum | 'pdfjs', 'ocr', 'manual' | NOT NULL |

**Storage Key:** `uploaded-resume-{resumeId}`

**Relationships:**
- One-to-One with PDF_METADATA
- One-to-Many with AI_SUGGESTION

**Example Data:**
```json
{
  "resumeId": "uuid-67890",
  "fileName": "john_doe_resume.pdf",
  "pdfData": "JVBERi0xLjQKJeLj...",
  "extractedText": "John Doe\nSoftware Engineer...",
  "uploadedAt": "2025-12-05T09:00:00Z",
  "lastEdited": "2025-12-05T10:00:00Z",
  "extractionMethod": "pdfjs"
}
```

### 3. TEMPLATE

**Description:** Predefined resume templates with formatting and structure.

**Attributes:**
| Attribute | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| templateId | string | Unique identifier | PK |
| name | string | Template display name | NOT NULL |
| description | string | Template description | |
| content | string | HTML content with inline styles | NOT NULL |
| category | enum | 'academic', 'professional', 'creative' | |
| thumbnail | string | Preview image URL | |
| createdAt | timestamp | Creation time | |
| popularity | number | Usage count | Default: 0 |

**Storage:** Hardcoded in `latexTemplates.ts` (not in LocalStorage)

**Relationships:**
- One-to-Many with DRAFT_RESUME
- One-to-Many with TEMPLATE_SECTION

**Example Data:**
```json
{
  "templateId": "iiitv-template",
  "name": "IIITV Academic Template",
  "description": "Professional academic template for IIIT Vadodara students",
  "content": "<p style='text-align: center;'><strong style='font-size: 28px;'>Your Name</strong></p>...",
  "category": "academic",
  "thumbnail": "/assets/templates/iiitv-preview.png",
  "createdAt": "2025-01-01T00:00:00Z",
  "popularity": 150
}
```

### 4. AI_SUGGESTION

**Description:** AI-generated suggestions for improving resume content.

**Attributes:**
| Attribute | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| suggestionId | string | Unique identifier | PK, UUID |
| resumeId | string | Resume being analyzed | FK → UPLOADED_RESUME or DRAFT_RESUME |
| type | enum | 'addition', 'removal', 'improvement' | NOT NULL |
| originalText | string | Original text (for improvements/removals) | |
| suggestedText | string | Suggested replacement/addition | |
| reason | string | Explanation for suggestion | |
| position | number | Character position in document | |
| applied | boolean | Whether user accepted | Default: false |
| createdAt | timestamp | When suggestion was made | NOT NULL |
| confidence | number | AI confidence score (0-1) | |

**Storage Key:** `ai-suggestion-{suggestionId}`

**Relationships:**
- Many-to-One with DRAFT_RESUME or UPLOADED_RESUME

**Example Data:**
```json
{
  "suggestionId": "uuid-ai-001",
  "resumeId": "uuid-12345",
  "type": "addition",
  "originalText": null,
  "suggestedText": "Led team of 5 developers",
  "reason": "Quantify leadership experience for ATS",
  "position": 450,
  "applied": false,
  "createdAt": "2025-12-05T10:45:00Z",
  "confidence": 0.85
}
```

### 5. PDF_METADATA

**Description:** Metadata extracted from uploaded PDFs.

**Attributes:**
| Attribute | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| metadataId | string | Unique identifier | PK, UUID |
| resumeId | string | Associated resume | FK → UPLOADED_RESUME |
| pageCount | number | Number of pages | NOT NULL |
| hasText | boolean | Contains extractable text | NOT NULL |
| usedOCR | boolean | Whether OCR was used | Default: false |
| fileSize | number | File size in bytes | |
| dimensions | JSON | Page dimensions | {width, height} |
| createdDate | timestamp | PDF creation date | |
| modifiedDate | timestamp | PDF last modified | |
| author | string | PDF author metadata | |
| title | string | PDF title metadata | |

**Storage:** Embedded in UPLOADED_RESUME object

**Relationships:**
- One-to-One with UPLOADED_RESUME

**Example Data:**
```json
{
  "metadataId": "uuid-meta-001",
  "resumeId": "uuid-67890",
  "pageCount": 2,
  "hasText": true,
  "usedOCR": false,
  "fileSize": 245760,
  "dimensions": { "width": 612, "height": 792 },
  "createdDate": "2025-11-20T08:00:00Z",
  "modifiedDate": "2025-12-01T14:30:00Z",
  "author": "John Doe",
  "title": "John_Doe_Resume"
}
```

### 6. TEMPLATE_SECTION

**Description:** Individual sections within a template (optional, for future use).

**Attributes:**
| Attribute | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| sectionId | string | Unique identifier | PK, UUID |
| templateId | string | Parent template | FK → TEMPLATE |
| name | string | Section name | 'Education', 'Experience', etc. |
| content | string | HTML content | |
| order | number | Display order | |
| required | boolean | Whether section is required | Default: false |
| placeholder | string | Placeholder text | |

**Storage:** Not currently implemented (future feature)

**Relationships:**
- Many-to-One with TEMPLATE

## Relationships

### 1. USER → DRAFT_RESUME (1:N)
- **Type:** One-to-Many
- **Description:** A user can create multiple draft resumes
- **Cardinality:** One user has zero or more drafts
- **Implementation:** All drafts in LocalStorage belong to browser session

### 2. USER → UPLOADED_RESUME (1:N)
- **Type:** One-to-Many
- **Description:** A user can upload multiple PDF resumes
- **Cardinality:** One user has zero or more uploaded resumes
- **Implementation:** All uploads in LocalStorage belong to browser session

### 3. TEMPLATE → DRAFT_RESUME (1:N)
- **Type:** One-to-Many
- **Description:** One template can be used by multiple drafts
- **Cardinality:** One template generates zero or more drafts
- **Implementation:** `draftResume.templateId` references `template.templateId`

### 4. DRAFT_RESUME → AI_SUGGESTION (1:N)
- **Type:** One-to-Many
- **Description:** One draft can have multiple AI suggestions
- **Cardinality:** One draft has zero or more suggestions
- **Implementation:** `aiSuggestion.resumeId` references `draftResume.draftId`

### 5. UPLOADED_RESUME → PDF_METADATA (1:1)
- **Type:** One-to-One
- **Description:** Each uploaded PDF has exactly one metadata record
- **Cardinality:** One upload has one metadata
- **Implementation:** Embedded in UPLOADED_RESUME JSON

### 6. UPLOADED_RESUME → AI_SUGGESTION (1:N)
- **Type:** One-to-Many
- **Description:** One uploaded resume can have multiple AI suggestions
- **Cardinality:** One upload has zero or more suggestions
- **Implementation:** `aiSuggestion.resumeId` references `uploadedResume.resumeId`

## Entity Lifecycle Diagrams

### DRAFT_RESUME Lifecycle

```
[User selects template]
         ↓
    CREATE DRAFT
    (status: 'draft')
         ↓
 ┌───────┴────────┐
 │                │
 ↓                ↓
EDIT         AUTO-SAVE
 ↓         (every 5s)
 │                │
 └───────┬────────┘
         ↓
    [User saves]
         ↓
  UPDATE DRAFT
  (savedAt, lastModified)
         ↓
   ┌─────┴─────┐
   │           │
   ↓           ↓
DOWNLOAD   MARK AS COMPLETED
           (status: 'completed')
```

### UPLOADED_RESUME Lifecycle

```
[User uploads PDF]
         ↓
 VALIDATE FILE
 (.pdf, <10MB)
         ↓
  EXTRACT TEXT
  (PDF.js first)
         ↓
    Has text? ─── No ───> RUN OCR
         │              (Tesseract)
         ↓ Yes              │
         └─────┬────────────┘
               ↓
      CREATE UPLOADED_RESUME
      (extractionMethod set)
               ↓
       CREATE PDF_METADATA
               ↓
        [User edits]
               ↓
      UPDATE extractedText
      (lastEdited timestamp)
               ↓
         ┌─────┴─────┐
         │           │
         ↓           ↓
    DOWNLOAD    REQUEST AI
               (AI_SUGGESTION)
```

### AI_SUGGESTION Lifecycle

```
[User clicks "AI Format"]
          ↓
  SEND TO CLOUDFLARE AI
  (resume content)
          ↓
   RECEIVE SUGGESTIONS
          ↓
    CREATE AI_SUGGESTION
    (applied: false)
          ↓
    DISPLAY IN MODAL
          ↓
   ┌──────┴──────┐
   │             │
   ↓             ↓
ACCEPT      REJECT
   │             │
   ↓             └──> DELETE
applied: true
   ↓
APPLY TO CONTENT
   ↓
UPDATE RESUME
```

## LocalStorage Schema

### Key Naming Convention

```
Pattern: {entity-type}-{entity-id}

Examples:
- resume-draft-iiitv-template
- resume-draft-uuid-12345
- uploaded-resume-uuid-67890
- ai-suggestion-uuid-ai-001
- user-settings
```

### Size Constraints

| Entity | Typical Size | Max Size |
|--------|-------------|----------|
| DRAFT_RESUME | 5-20 KB | 100 KB |
| UPLOADED_RESUME | 500 KB - 2 MB | 10 MB |
| AI_SUGGESTION | 1-5 KB | 10 KB |
| PDF_METADATA | 1-2 KB | 5 KB |
| **Total per user** | ~5 MB | 10 MB |

## Data Access Patterns

### Query 1: Get all user's resumes
```typescript
function getAllResumes(): { drafts: Draft[], uploads: Upload[] } {
  const drafts = [];
  const uploads = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('resume-draft-')) {
      drafts.push(JSON.parse(localStorage.getItem(key)));
    } else if (key?.startsWith('uploaded-resume-')) {
      uploads.push(JSON.parse(localStorage.getItem(key)));
    }
  }

  return { drafts, uploads };
}
```

### Query 2: Get resume by ID
```typescript
function getResumeById(id: string, type: 'draft' | 'upload'): Resume | null {
  const key = type === 'draft' ? `resume-draft-${id}` : `uploaded-resume-${id}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}
```

### Query 3: Get AI suggestions for resume
```typescript
function getAISuggestions(resumeId: string): AISuggestion[] {
  const suggestions = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('ai-suggestion-')) {
      const suggestion = JSON.parse(localStorage.getItem(key));
      if (suggestion.resumeId === resumeId) {
        suggestions.push(suggestion);
      }
    }
  }

  return suggestions;
}
```

### Mutation 1: Save/Update draft
```typescript
function saveDraft(draft: DraftResume): void {
  const key = `resume-draft-${draft.draftId}`;
  draft.lastModified = new Date().toISOString();
  localStorage.setItem(key, JSON.stringify(draft));
}
```

### Mutation 2: Apply AI suggestion
```typescript
function applyAISuggestion(suggestionId: string): void {
  const key = `ai-suggestion-${suggestionId}`;
  const suggestion = JSON.parse(localStorage.getItem(key));

  suggestion.applied = true;
  localStorage.setItem(key, JSON.stringify(suggestion));

  // Update the resume content
  const resume = getResumeById(suggestion.resumeId, 'draft' or 'upload');
  // ... apply the suggestion to resume content
  saveDraft(resume);
}
```

## Data Constraints & Validation

### DRAFT_RESUME
- `content` must contain at least one of: header, sidebar, mainContent
- `wordCount` calculated automatically on save
- `savedAt` must be <= `lastModified`

### UPLOADED_RESUME
- `fileName` must end with `.pdf`
- `pdfData` must be valid base64
- `extractionMethod` must be set based on actual method used

### AI_SUGGESTION
- `type` must be one of: 'addition', 'removal', 'improvement'
- If `type === 'addition'`, `originalText` should be null
- If `type === 'removal'` or `'improvement'`, `originalText` required

### PDF_METADATA
- `pageCount` must be > 0
- `fileSize` must be > 0 and < 10MB
- `dimensions.width` and `dimensions.height` must be > 0

## Future Enhancements (Optional Backend)

If a backend is added in the future, this schema can be migrated to:

**Database:** PostgreSQL / MongoDB / Supabase

**Additional Entities:**
- USER (with authentication)
- TEAM (for collaborative editing)
- VERSION_HISTORY (resume versions)
- ANALYTICS (usage tracking)

**Additional Relationships:**
- USER ↔ TEAM (Many-to-Many)
- RESUME ↔ VERSION_HISTORY (One-to-Many)
- USER ↔ ANALYTICS (One-to-Many)

---

## Summary

This ERD defines:
1. **Core Entities:** DRAFT_RESUME, UPLOADED_RESUME, TEMPLATE, AI_SUGGESTION, PDF_METADATA
2. **Relationships:** User ownership, template usage, AI suggestions
3. **Storage Strategy:** LocalStorage with key conventions
4. **Lifecycle:** Creation, editing, saving, AI enhancement, downloading
5. **Data Access:** Query and mutation patterns for CRUD operations

All entities are stored client-side with proper validation and constraints.
