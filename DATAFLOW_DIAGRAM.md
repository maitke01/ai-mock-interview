# Data Flow Diagram - AI Mock Interview Resume Builder

## Level 0: Context Diagram

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       ├─── Upload PDF
       ├─── Select Template
       ├─── Edit Resume
       ├─── Request AI Suggestions
       ├─── Download PDF
       │
       ↓
┌──────────────────────────────────┐
│  AI Mock Interview System        │
│  (Resume Builder)                │
└──────────────────────────────────┘
       │
       ├─── Cloudflare Workers AI
       ├─── Browser LocalStorage
       └─── PDF.js / Tesseract.js
```

## Level 1: Main Process Flow

```
                    ┌─────────────────────┐
                    │       USER          │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ↓                      ↓                      ↓
┌───────────────┐    ┌──────────────────┐   ┌─────────────────┐
│ 1. UPLOAD PDF │    │ 2. USE TEMPLATE  │   │ 3. MY RESUMES   │
└───────┬───────┘    └────────┬─────────┘   └────────┬────────┘
        │                     │                       │
        ↓                     ↓                       ↓
┌───────────────┐    ┌──────────────────┐   ┌─────────────────┐
│ PDF Processor │    │ Template Loader  │   │ Resume Manager  │
└───────┬───────┘    └────────┬─────────┘   └────────┬────────┘
        │                     │                       │
        ↓                     ↓                       ↓
┌───────────────────────────────────────────────────────────────┐
│                    RESUME EDITOR                              │
│                 (Quill + Overlay Tools)                       │
└───────────────────────────┬───────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ↓                   ↓                   ↓
┌───────────────┐  ┌──────────────┐  ┌──────────────────┐
│ 4. AI FORMAT  │  │ 5. SAVE DRAFT│  │ 6. DOWNLOAD PDF  │
└───────┬───────┘  └──────┬───────┘  └────────┬─────────┘
        │                 │                    │
        ↓                 ↓                    ↓
┌───────────────┐  ┌──────────────┐  ┌──────────────────┐
│ Cloudflare AI │  │ LocalStorage │  │  PDF Generator   │
└───────────────┘  └──────────────┘  └──────────────────┘
```

## Level 2: Detailed Data Flow

### Process 1: PDF Upload & Extraction

```
┌─────────┐
│  User   │
│ uploads │
│  PDF    │
└────┬────┘
     │
     ↓
┌──────────────────────────────────────────────────────┐
│           PDFUploader Component                      │
│  1. Validate file (.pdf, <10MB)                     │
│  2. Read file → ArrayBuffer                         │
└────────────────┬─────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ↓                 ↓
┌───────────────┐  ┌──────────────────────┐
│  PDFViewer    │  │  TextExtractor       │
│               │  │                      │
│  PDF.js       │  │  1. getTextContent() │
│  Render       │  │  2. Check if empty   │
│  to Canvas    │  │  3. If empty:        │
│               │  │     Run Tesseract    │
└───────────────┘  └──────────┬───────────┘
                              │
                              ↓
                    ┌─────────────────┐
                    │  Extracted Text │
                    └────────┬────────┘
                             │
                             ↓
                    ┌─────────────────┐
                    │  QuillEditor    │
                    │  (Editable)     │
                    └─────────────────┘
```

**Data Flow Details:**
```
Input:  File (PDF)
↓
Process:
  - ArrayBuffer conversion
  - PDF.js rendering
  - Text extraction (PDF.js)
  - OCR fallback (Tesseract)
↓
Output: Extracted text string + Page metadata
↓
Storage: LocalStorage (uploaded-resume-{id})
```

### Process 2: Template Selection & Editing

```
┌─────────┐
│  User   │
│ selects │
│template │
└────┬────┘
     │
     ↓
┌──────────────────────────────────────────────────────┐
│        TemplateSelector Component                    │
│  Show template cards from latexTemplates[]          │
└────────────────┬─────────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│        ResumeBuilder.loadTemplateIntoEditor()        │
│  1. Get template.content (HTML with inline styles)  │
│  2. setTimeout(100ms) for Quill init               │
│  3. dangerouslyPasteHTML(0, content)               │
│  4. Renders as FORMATTED TEXT (not code)           │
└────────────────┬─────────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│            Quill Editor                              │
│  - User sees: "Your Name" (bold, 28px)             │
│  - NOT: "<strong style="font-size:28px">Your..."   │
│  - Toolbar works: bold, italic, lists, etc.        │
└────────────────┬─────────────────────────────────────┘
                 │
                 ↓
        Auto-save on change
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│         LocalStorage                                 │
│  Key: resume-draft-${templateId}                   │
│  Value: { content, savedAt, templateId }           │
└──────────────────────────────────────────────────────┘
```

**Data Flow Details:**
```
Input:  Template ID
↓
Fetch: latexTemplates.find(t => t.id === templateId)
↓
Extract: template.content (HTML string)
↓
Transform: Quill HTML parser → Document Object Model
↓
Render: Formatted rich text (NOT code)
↓
Edit: User modifies via toolbar
↓
Output: HTML string (resumeTemplate.mainContent)
↓
Storage: LocalStorage (resume-draft-{templateId})
```

### Process 3: AI Format Suggestions

```
┌─────────┐
│  User   │
│ clicks  │
│AI Format│
└────┬────┘
     │
     ↓
┌──────────────────────────────────────────────────────┐
│        AIFormatModal.tsx                             │
│  1. Get editor content                              │
│  2. Show loading spinner                            │
└────────────────┬─────────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│        CloudflareAI.ts                               │
│  POST /ai/run/@cf/meta/llama-2-7b-chat-int8        │
│                                                      │
│  Prompt:                                             │
│    "Analyze this resume. Return JSON with:          │
│     - additions: [{ text, reason, position }]       │
│     - removals: [{ text, reason, position }]        │
│     - improvements: [{ old, new, reason }]"         │
└────────────────┬─────────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│        AI Response (JSON)                            │
│  {                                                   │
│    additions: [                                      │
│      { text: "Led team of 5", reason: "Quantify",   │
│        position: 45, color: "green" }               │
│    ],                                                │
│    removals: [                                       │
│      { text: "Responsibilities include",            │
│        reason: "Weak phrase", position: 120,        │
│        color: "red" }                                │
│    ]                                                 │
│  }                                                   │
└────────────────┬─────────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│        AIFormatModal UI                              │
│  Split View:                                         │
│  ┌──────────────────┬──────────────────┐           │
│  │ Original Content │ AI Suggestions   │           │
│  │                  │                  │           │
│  │ Your Name        │ 🟢 Add:         │           │
│  │ Software Engineer│ "Led team of 5"  │           │
│  │                  │                  │           │
│  │ Responsibilities │ 🔴 Remove:      │           │
│  │ include...       │ "Responsibilities│           │
│  │                  │  include"        │           │
│  └──────────────────┴──────────────────┘           │
│                                                      │
│  [Accept All] [Accept Selected] [Reject All]       │
└────────────────┬─────────────────────────────────────┘
                 │
                 ↓
          User accepts changes
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│        Apply Changes to Editor                       │
│  1. For each accepted suggestion                    │
│  2. Find position in Quill content                  │
│  3. Apply formatting:                               │
│     - Green background for additions                │
│     - Red strikethrough for removals                │
│  4. Update Quill content                            │
└────────────────┬─────────────────────────────────────┘
                 │
                 ↓
        Updated resume content
                 │
                 ↓
         Auto-save to LocalStorage
```

**Data Flow Details:**
```
Input:  Resume content (HTML string)
↓
API Call:
  POST https://api.cloudflare.com/...
  Body: { messages: [{ role: "user", content: resumeHTML }] }
↓
AI Processing: (Cloudflare Workers AI)
  - Analyze grammar
  - Check ATS keywords
  - Suggest improvements
  - Structure optimization
↓
Response: JSON with additions/removals/improvements
↓
Parse: Extract suggestions array
↓
UI: Display with color coding
↓
User Action: Accept/Reject
↓
Apply: Modify Quill content
↓
Output: Updated HTML string
↓
Storage: LocalStorage (ai-format-history-{id})
```

### Process 4: My Resumes Panel

```
┌─────────┐
│  User   │
│ opens   │
│My Resumes│
└────┬────┘
     │
     ↓
┌──────────────────────────────────────────────────────┐
│        MyResumesPanel Component                      │
│  Embedded in Resume Builder (NOT separate page)     │
│                                                      │
│  ┌──────────────────────────────────┐              │
│  │ [Saved Drafts] [Uploaded Resumes]│              │
│  └──────────────────────────────────┘              │
│                                                      │
│  1. Load from LocalStorage                          │
│  2. Parse all keys matching:                        │
│     - resume-draft-*                                │
│     - uploaded-resume-*                             │
└────────────────┬─────────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│        LocalStorage Query                            │
│  for (let i = 0; i < localStorage.length; i++) {    │
│    const key = localStorage.key(i);                 │
│    if (key.startsWith('resume-draft-')) {           │
│      drafts.push(JSON.parse(localStorage.getItem)); │
│    }                                                 │
│  }                                                   │
└────────────────┬─────────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│        Display Resume Cards                          │
│  ┌────────────────┐  ┌────────────────┐            │
│  │  📝 Draft 1    │  │  📄 Uploaded 1 │            │
│  │  Saved: 2h ago │  │  Uploaded: 1d  │            │
│  │  [Edit] [Del]  │  │  [Edit] [Del]  │            │
│  └────────────────┘  └────────────────┘            │
└────────────────┬─────────────────────────────────────┘
                 │
         User clicks [Edit]
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│        Load Resume into Editor                       │
│  1. Get resume data from LocalStorage               │
│  2. If draft: Load HTML into Quill                  │
│  3. If uploaded: Load extracted text                │
│  4. Set editor mode and state                       │
└──────────────────────────────────────────────────────┘
```

**Data Flow Details:**
```
Trigger: User clicks "My Resumes" button
↓
Query: LocalStorage.keys()
↓
Filter:
  - Drafts: resume-draft-*
  - Uploads: uploaded-resume-*
↓
Parse: JSON.parse(value) for each key
↓
Display: Resume cards with metadata
↓
User Action: Click "Edit"
↓
Load: Resume content → QuillEditor
↓
Edit Mode: User continues editing
```

### Process 5: PDF Download with Filename

```
┌─────────┐
│  User   │
│ clicks  │
│Download │
└────┬────┘
     │
     ↓
┌──────────────────────────────────────────────────────┐
│        Show Filename Modal                           │
│  ┌────────────────────────────────────┐             │
│  │  Enter filename:                   │             │
│  │  [MyResume___________________]     │             │
│  │                                    │             │
│  │  [Cancel]  [Download]              │             │
│  └────────────────────────────────────┘             │
└────────────────┬─────────────────────────────────────┘
                 │
          User enters name + clicks Download
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│        ExportPDF.tsx                                 │
│  Method 1: HTML to PDF (jspdf + html2canvas)        │
│    1. html2canvas(editor element)                   │
│    2. canvas → image data URL                       │
│    3. jspdf.addImage(imageData)                     │
│    4. Generate PDF blob                             │
│                                                      │
│  Method 2: Modify Original PDF (pdf-lib)            │
│    1. Load original PDF ArrayBuffer                 │
│    2. Get page dimensions                           │
│    3. Draw overlay elements                         │
│    4. Add edited text                               │
│    5. Save modified PDF                             │
└────────────────┬─────────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│        Generate PDF Blob                             │
│  const blob = pdf.save() or jspdf.output('blob')   │
└────────────────┬─────────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│        Trigger Browser Download                      │
│  const url = URL.createObjectURL(blob);             │
│  const a = document.createElement('a');             │
│  a.href = url;                                       │
│  a.download = `${userFilename}.pdf`;                │
│  a.click();                                          │
└──────────────────────────────────────────────────────┘
```

**Data Flow Details:**
```
Input:  User clicks "Download PDF"
↓
Modal: Show filename input
↓
Input:  User enters "My_Resume_2025"
↓
Process:
  Option A: HTML → Canvas → PDF
    - html2canvas(editorElement)
    - jsPDF.addImage(canvas)

  Option B: Modify original PDF
    - pdf-lib.load(originalPDF)
    - drawText/drawImage on pages
    - pdf.save()
↓
Output: Blob (PDF file data)
↓
Download:
  - Create object URL
  - Trigger <a> click
  - Filename: "My_Resume_2025.pdf"
↓
Browser: Save file dialog
```

## Data Storage Schema

### LocalStorage Keys

```
1. resume-draft-{templateId}
   {
     header: string,
     sidebar: string,
     mainContent: string,
     savedAt: ISO timestamp,
     templateId: string
   }

2. uploaded-resume-{fileId}
   {
     name: string,
     uploadedAt: ISO timestamp,
     extractedText: string,
     pdfData: base64 string,
     metadata: {
       pageCount: number,
       hasText: boolean,
       usedOCR: boolean,
       fileSize: number
     }
   }

3. ai-format-history-{resumeId}
   {
     originalContent: string,
     suggestions: Array<{
       type: 'add' | 'remove' | 'improve',
       text: string,
       reason: string,
       position: number,
       applied: boolean
     }>,
     appliedAt: ISO timestamp
   }

4. user-settings
   {
     autoSave: boolean,
     defaultTemplate: string,
     aiEnabled: boolean
   }
```

## External API Interactions

### Cloudflare Workers AI API

```
Request:
POST https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/@cf/meta/llama-2-7b-chat-int8

Headers:
  Authorization: Bearer {API_KEY}
  Content-Type: application/json

Body:
{
  "messages": [
    {
      "role": "system",
      "content": "You are a professional resume writer..."
    },
    {
      "role": "user",
      "content": "Resume content here..."
    }
  ]
}

Response:
{
  "result": {
    "response": "{ \"additions\": [...], \"removals\": [...] }"
  },
  "success": true
}
```

## Error Handling Flow

```
User Action
    ↓
Try Operation
    ↓
    ├─ Success → Continue
    │
    └─ Error
        ↓
   Check Error Type
        │
        ├─ Network Error
        │   ↓
        │   Retry 3x
        │   ↓
        │   Show "Offline" message
        │
        ├─ PDF Parsing Error
        │   ↓
        │   Try OCR fallback
        │   ↓
        │   If fail: Manual entry
        │
        ├─ AI API Error
        │   ↓
        │   Fallback to basic suggestions
        │   ↓
        │   Log error for debugging
        │
        └─ Storage Error
            ↓
            Export as JSON backup
            ↓
            Notify user
```

---

## Summary

This dataflow diagram shows:
1. **PDF Upload → Extraction → Editing** pipeline
2. **Template Selection → Formatting → Saving** workflow
3. **AI Suggestions → Review → Apply** process
4. **My Resumes → Load → Continue Editing** cycle
5. **Download PDF with custom filename** flow

All data flows are **client-side only** with LocalStorage persistence and Cloudflare AI for suggestions.
