# AI Mock Interview - Resume Builder Architecture

## System Overview

This document describes the complete architecture of the Resume Builder system with PDF editing, AI formatting, and resume management capabilities.

## Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Quill** - Rich text editor for templates

### PDF Processing
- **pdfjs-dist** - PDF rendering and text extraction
- **pdf-lib** - PDF manipulation and generation
- **Tesseract.js** - OCR fallback for scanned PDFs
- **unpdf** - Additional PDF utilities
- **react-rnd** - Resizable/draggable overlay elements

### AI & Export
- **Cloudflare Workers AI** - Resume formatting suggestions
- **html2canvas** - HTML to image conversion
- **jspdf** - PDF generation from HTML

## Component Architecture

```
src/components/
├── ResumeBuilder.tsx          # Main container component
├── MyResumesPanel.tsx          # Embedded saved resumes panel
├── PDFEditor/
│   ├── PDFUploader.tsx         # Drag-drop PDF upload
│   ├── PDFViewer.tsx           # PDF.js canvas renderer
│   ├── TextExtractor.tsx       # PDF.js + OCR text extraction
│   ├── OverlayEditor.tsx       # react-rnd overlay tools
│   └── ExportPDF.tsx           # pdf-lib export handler
├── AIFormatter/
│   ├── AIFormatModal.tsx       # AI suggestions UI
│   └── CloudflareAI.ts         # AI API integration
└── TemplateEditor/
    ├── QuillEditor.tsx         # Template editing
    └── TemplateToolbar.tsx     # Rich text toolbar
```

## Data Flow

### 1. PDF Upload Flow
```
User uploads PDF
    ↓
PDFUploader receives file
    ↓
Convert to ArrayBuffer
    ↓
┌─────────────────┬────────────────────┐
│   PDFViewer     │   TextExtractor    │
│   (PDF.js)      │   (PDF.js)         │
│   Render canvas │   Extract text     │
└─────────────────┴────────────────────┘
         ↓                 ↓
    Display PDF       Has text? → No → Run Tesseract OCR
                          ↓ Yes
                     Show in editor
                          ↓
                   User edits text
                          ↓
                   Save to localStorage
```

### 2. Template Selection Flow
```
User picks template
    ↓
Load template.content (HTML with inline styles)
    ↓
Quill.clipboard.dangerouslyPasteHTML()
    ↓
Render as formatted text (NOT code)
    ↓
User edits with toolbar
    ↓
Auto-save draft to localStorage
```

### 3. AI Format Flow
```
User clicks "AI Format"
    ↓
Send resume content to Cloudflare AI
    ↓
AI analyzes: structure, grammar, keywords, ATS compliance
    ↓
Return suggestions:
  - Green highlights: additions/improvements
  - Red highlights: removals/issues
    ↓
Display in modal with accept/reject buttons
    ↓
User applies changes → update editor
```

### 4. PDF Export Flow
```
User clicks "Download PDF"
    ↓
Show file name input modal
    ↓
html2canvas(editor content)
    ↓
jspdf.addImage(canvas)
    ↓
OR: pdf-lib modify original PDF
    ↓
Trigger browser download
    ↓
Save as "[user-chosen-name].pdf"
```

## Data Models

### Resume Storage (LocalStorage)

#### Saved Drafts
```typescript
Key: `resume-draft-${templateId}`
Value: {
  header: string;
  sidebar: string;
  mainContent: string;
  savedAt: Date;
  templateId: string;
}
```

#### Uploaded Resumes
```typescript
Key: `uploaded-resume-${fileId}`
Value: {
  name: string;
  uploadedAt: Date;
  extractedText: string;
  pdfData: ArrayBuffer; // Base64 encoded
  metadata: {
    pageCount: number;
    hasText: boolean;
    usedOCR: boolean;
  }
}
```

#### AI Format History
```typescript
Key: `ai-format-history-${resumeId}`
Value: {
  originalContent: string;
  suggestions: Array<{
    type: 'add' | 'remove' | 'improve';
    text: string;
    reason: string;
    position: number;
  }>;
  appliedAt: Date;
}
```

## Component Responsibilities

### ResumeBuilder.tsx
- **Main orchestrator**
- Manages routing between modes: scratch, template, upload
- Handles navigation between sections
- Coordinates save/load operations

### MyResumesPanel.tsx (NEW)
- Embedded panel above "Upload Resume"
- Shows tabs: "Saved Drafts" | "Uploaded Resumes"
- Click to edit → loads into editor
- Delete, rename actions
- **No separate page** - integrated into Resume Builder

### PDFEditor/ Components

#### PDFUploader.tsx
- Drag-drop or file picker
- Accept only `.pdf`
- Validate file size (< 10MB)
- Convert to ArrayBuffer
- Trigger extraction pipeline

#### PDFViewer.tsx
- Use PDF.js to render pages
- Canvas-based rendering
- Zoom in/out controls
- Page navigation
- Smooth scrolling

#### TextExtractor.tsx
- Primary: PDF.js `getTextContent()`
- Fallback: Tesseract.js OCR if no text
- Progress indicators
- Error handling
- Return plain text + position data

#### OverlayEditor.tsx
- Transparent overlay on PDFViewer
- Add text boxes (react-rnd)
- Add highlights (react-rnd rectangles)
- Drag, resize, rotate elements
- Delete elements
- Layer management

#### ExportPDF.tsx
- User inputs filename
- Use pdf-lib to:
  - Load original PDF
  - Draw overlay elements
  - Add edited text
- Generate Blob
- Trigger download

### AIFormatter/ Components

#### AIFormatModal.tsx
- Modal UI with split view:
  - Left: Original content
  - Right: AI suggestions
- Color coding:
  - 🟢 Green: Additions
  - 🔴 Red: Removals
  - 🟡 Yellow: Changes
- Accept/Reject per suggestion
- Apply all / Apply selected

#### CloudflareAI.ts
- API wrapper for Cloudflare Workers AI
- Model: `@cf/meta/llama-2-7b-chat-int8` (free tier)
- Prompt engineering:
  ```
  Analyze this resume and suggest improvements:
  - Grammar fixes
  - Action verb enhancements
  - ATS keyword optimization
  - Structure improvements
  Return JSON: { additions: [], removals: [], changes: [] }
  ```

### TemplateEditor/ Components

#### QuillEditor.tsx
- Wrap Quill instance
- Handle HTML paste correctly
- Prevent showing raw HTML tags
- Rich text rendering
- Auto-save on change

#### TemplateToolbar.tsx
- Bold, Italic, Underline
- Font size, color
- Alignment
- Lists, indentation
- Clear formatting

## User Workflows

### Workflow 1: Create Resume from Template
```
1. User opens Resume Builder
2. User sees "My Resumes" panel (collapsed)
3. User clicks "Choose Template"
4. User selects template card
5. Template content loads as FORMATTED TEXT
6. User edits with toolbar
7. User clicks "Save Draft"
8. Draft appears in "My Resumes → Saved Drafts"
9. User clicks "Download PDF"
10. Filename modal appears
11. User enters name → downloads PDF
```

### Workflow 2: Upload & Edit Resume
```
1. User opens Resume Builder
2. User drags PDF into upload area
3. PDF renders in viewer (left panel)
4. Text extracted to editor (right panel)
   - If no text → OCR runs automatically
5. User edits text directly
6. User clicks "AI Format"
7. AI modal shows suggestions
8. User accepts some suggestions
9. Editor updates with changes
10. User downloads edited PDF
```

### Workflow 3: Continue Editing Saved Resume
```
1. User opens Resume Builder
2. User expands "My Resumes" panel
3. User switches to "Saved Drafts" tab
4. User clicks resume card
5. Resume loads into editor
6. User continues editing
7. Changes auto-save
```

## API Integration

### Cloudflare Workers AI

#### Endpoint
```
POST https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/@cf/meta/llama-2-7b-chat-int8
```

#### Request
```typescript
{
  messages: [
    {
      role: "system",
      content: "You are a professional resume writer..."
    },
    {
      role: "user",
      content: `Analyze and improve this resume:\n\n${resumeText}`
    }
  ]
}
```

#### Response
```typescript
{
  result: {
    response: string; // JSON string with suggestions
  }
}
```

## State Management

### ResumeBuilder State
```typescript
{
  mode: 'scratch' | 'template' | 'upload';
  selectedTemplate: string | null;
  resumeContent: {
    header: string;
    sidebar: string;
    mainContent: string;
  };
  uploadedPDF: {
    file: File | null;
    extractedText: string;
    pages: number;
  };
  savedResumes: SavedResume[];
  isLoading: boolean;
  isSaving: boolean;
  showAIModal: boolean;
  aiSuggestions: AISuggestion[];
}
```

## File Structure
```
/Users/gauravtadia/ai-mock-interview/
├── packages/app/src/
│   ├── components/
│   │   ├── ResumeBuilder.tsx
│   │   ├── MyResumesPanel.tsx
│   │   ├── PDFEditor/
│   │   │   ├── index.tsx
│   │   │   ├── PDFUploader.tsx
│   │   │   ├── PDFViewer.tsx
│   │   │   ├── TextExtractor.tsx
│   │   │   ├── OverlayEditor.tsx
│   │   │   └── ExportPDF.tsx
│   │   ├── AIFormatter/
│   │   │   ├── AIFormatModal.tsx
│   │   │   └── CloudflareAI.ts
│   │   └── TemplateEditor/
│   │       ├── QuillEditor.tsx
│   │       └── TemplateToolbar.tsx
│   ├── utils/
│   │   ├── pdfHelpers.ts
│   │   ├── storageHelpers.ts
│   │   └── aiHelpers.ts
│   └── types/
│       ├── resume.ts
│       └── pdf.ts
├── ARCHITECTURE.md
└── DATAFLOW_DIAGRAM.md
```

## Security Considerations

1. **File Upload**
   - Validate file type (only PDF)
   - Limit file size (10MB max)
   - Sanitize extracted text
   - No server upload (client-side only)

2. **LocalStorage**
   - Encrypt sensitive data
   - Clear on logout
   - Size limits (5-10MB per domain)

3. **AI API**
   - API key in environment variables
   - Rate limiting
   - Input sanitization
   - No PII sent to AI

## Performance Optimization

1. **PDF Rendering**
   - Lazy load pages
   - Canvas pooling
   - Worker threads for PDF.js

2. **Text Extraction**
   - Stream processing
   - Cancel pending OCR
   - Cache extracted text

3. **LocalStorage**
   - Compress before save
   - Debounce auto-save
   - Clean old drafts

## Error Handling

1. **PDF Upload Errors**
   - Invalid file type → Show error toast
   - Corrupted PDF → Fallback message
   - OCR failure → Manual text entry

2. **AI API Errors**
   - Network failure → Retry 3x
   - Rate limit → Queue request
   - Invalid response → Fallback to basic suggestions

3. **Export Errors**
   - Save failure → Download as JSON backup
   - PDF generation error → Export as HTML

## Future Enhancements

1. **Cloud Sync** (Optional Backend)
2. **Collaborative Editing**
3. **Version History**
4. **ATS Score Calculator**
5. **Template Marketplace**
6. **Real-time Preview**
7. **Multi-language Support**

---

## Next Steps

1. ✅ Remove "My Resumes" from header
2. 🔄 Create MyResumesPanel component
3. ⏳ Build PDFEditor module
4. ⏳ Integrate Cloudflare AI
5. ⏳ Fix Quill template rendering
6. ⏳ Implement Download with filename picker
7. ⏳ Create system diagrams
