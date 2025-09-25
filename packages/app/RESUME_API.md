# AI Resume Editor API Documentation

This API provides comprehensive resume analysis, optimization, and management features using Cloudflare AI models and Vectorize.

## Features Overview

- **AI Resume Optimization** - NLP-powered analysis and enhancement suggestions
- **Gap Detection** - Identifies skill gaps, inconsistencies, and improvement areas
- **Personalized Recommendations** - Tailored suggestions for better clarity and impact
- **Job Market Alignment** - Ensures ATS compatibility and recruiter standards
- **Action Verb Suggestions** - Recommends impactful, industry-appropriate verbs
- **Industry-Specific Analysis** - Evaluates against industry standards
- **Achievement Enhancement** - Highlights quantifiable accomplishments
- **Job Keyword Matching** - Compares resume to job descriptions with match scoring
- **PDF Processing** - Direct PDF editing and optimization capabilities
- **Vector Embedding Analysis** - Semantic matching using Cloudflare Vectorize
- **Resume Version Tracking** - Analytics and tracking of resume iterations
- **Template Suggestions** - Smart template recommendations based on role/experience

## API Endpoints

### Resume Processing

#### Parse Resume
```
POST /resume/parse
Content-Type: application/json

{
  "resumeText": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sections": {
      "personalInfo": { "name": "string", "email": "string", "phone": "string" },
      "summary": "string",
      "experience": [{ "title": "string", "company": "string", "description": "string" }],
      "education": [{ "degree": "string", "institution": "string", "year": "string" }],
      "skills": ["string"]
    },
    "rawText": "string"
  }
}
```

#### Enhanced Resume Analysis
```
POST /resume/analyze-enhanced
Content-Type: application/json

{
  "resumeText": "string",
  "analysisType": "comprehensive|ats-optimization|gap-detection|industry-specific",
  "includeEmbeddings": boolean,
  "jobDescription": "string (optional)",
  "targetRole": "string (optional)",
  "targetIndustry": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "score": 85,
    "feedback": {
      "overallScore": 85,
      "strengths": ["string"],
      "weaknesses": ["string"],
      "atsCompatibility": {
        "score": 80,
        "issues": ["string"],
        "suggestions": ["string"]
      },
      "contentAnalysis": {
        "clarity": 8,
        "impact": 7,
        "relevance": 9
      }
    },
    "suggestions": ["string"],
    "missingKeywords": ["string"]
  },
  "jobMatch": {
    "matchScore": 78,
    "keywordMatches": [{ "keyword": "string", "importance": "high|medium|low" }],
    "suggestions": ["string"]
  },
  "templateSuggestions": [{ "template": {}, "matchScore": 85, "reasoning": ["string"] }],
  "embeddings": { "count": 15, "stored": true }
}
```

#### PDF Processing
```
POST /resume/process-pdf
Content-Type: multipart/form-data

pdf: File
extractText: boolean
optimizeForATS: boolean
```

**Response:**
```json
{
  "success": true,
  "pdfData": {
    "text": "string",
    "metadata": { "pageCount": 2, "fileSize": 1024 },
    "pageCount": 2
  },
  "optimization": {
    "success": true,
    "optimizations": ["string"]
  },
  "parsedResume": { "sections": {} }
}
```

### Job Matching

#### Job Keyword Matching
```
POST /resume/job-match
Content-Type: application/json

{
  "resumeText": "string",
  "jobDescription": "string",
  "includeSemanticMatch": boolean
}
```

**Response:**
```json
{
  "success": true,
  "jobMatch": {
    "matchScore": 78,
    "keywordMatches": [
      {
        "keyword": "JavaScript",
        "resumeCount": 3,
        "jobDescriptionCount": 2,
        "importance": "high",
        "category": "technical"
      }
    ],
    "missingKeywords": ["React", "Node.js"],
    "suggestions": ["Add React framework experience", "Highlight Node.js projects"]
  },
  "semanticMatch": {
    "overallScore": 82,
    "sectionScores": {
      "summary": 85,
      "experience": 80,
      "skills": 90,
      "education": 75
    },
    "recommendations": ["string"]
  },
  "suggestions": ["string"]
}
```

### Template Management

#### Template Suggestions
```
POST /resume/templates
Content-Type: application/json

{
  "resumeText": "string",
  "targetRole": "string (optional)",
  "targetIndustry": "string (optional)",
  "experienceLevel": "Entry|Mid|Senior|Executive (optional)",
  "generateCustom": boolean
}
```

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "template": {
        "id": "tech-senior",
        "name": "Senior Technology Professional",
        "category": "Technology",
        "sections": [{ "name": "string", "required": true, "guidelines": ["string"] }]
      },
      "matchScore": 95,
      "reasoning": ["Excellent match for your background"],
      "customizations": [
        {
          "section": "Skills",
          "suggestion": "Add more technical skills",
          "priority": "high",
          "example": "Include React, Node.js, Docker"
        }
      ],
      "atsOptimization": {
        "atsScore": 90,
        "changes": ["string"]
      }
    }
  ],
  "customTemplate": {
    "id": "string",
    "name": "Custom Software Developer Template",
    "sections": [{ "name": "string", "content": "string", "guidelines": ["string"] }],
    "metadata": { "industry": "Technology", "atsOptimized": true }
  },
  "count": 3
}
```

### Version Management

#### Version Operations
```
POST /resume/versions
Content-Type: application/json

// Create new version
{
  "action": "create",
  "resumeId": "string",
  "userId": "string",
  "content": "string",
  "changes": ["Added new work experience", "Updated skills section"]
}

// Get version history
{
  "action": "history",
  "resumeId": "string"
}

// Compare versions
{
  "action": "compare",
  "versionId": "string",
  "compareWithId": "string"
}

// Get analytics report
{
  "action": "analytics",
  "resumeId": "string"
}
```

**Response (Create):**
```json
{
  "success": true,
  "version": {
    "id": "string",
    "version": 3,
    "changes": ["string"],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Response (Compare):**
```json
{
  "success": true,
  "comparison": {
    "oldVersion": {},
    "newVersion": {},
    "differences": [
      {
        "section": "Skills",
        "changeType": "added",
        "newValue": "Docker",
        "impact": "medium",
        "description": "Added skill: Docker"
      }
    ],
    "overallImpact": "positive",
    "scoreChange": 5
  }
}
```

### Vector Search

#### Semantic Search
```
POST /resume/search
Content-Type: application/json

{
  "query": "software engineer with React experience",
  "resumeId": "string (optional)",
  "topK": 10,
  "searchType": "similar_content|job_match|similar_resumes"
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "matches": [
      {
        "id": "string",
        "score": 0.85,
        "content": "Senior React Developer with 5+ years...",
        "section": "experience",
        "type": "resume"
      }
    ],
    "totalCount": 15,
    "searchTime": 120
  }
}
```

### Analytics

#### Track Usage
```
POST /resume/analytics
Content-Type: application/json

{
  "action": "view|download|analysis",
  "resumeId": "string",
  "analysisScore": 85 // Required for 'analysis' action
}
```

### Batch Processing

#### Process Multiple Resumes
```
POST /resume/batch
Content-Type: application/json

{
  "resumes": [
    {
      "id": "string",
      "text": "string",
      "jobDescription": "string (optional)"
    }
  ],
  "operations": ["parse", "analyze", "embeddings", "job_match"]
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "resume-1",
      "parsed": {},
      "analysis": { "score": 85 },
      "jobMatch": { "matchScore": 78 },
      "embeddings": { "count": 12, "stored": true }
    }
  ],
  "processed": 5
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error description",
  "details": "Detailed error message",
  "status": 400
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation errors)
- `500` - Internal Server Error

## Environment Requirements

### Cloudflare Workers Environment Variables

```toml
# wrangler.toml
[env.production.vars]
# Add any custom environment variables

[[env.production.ai]]
binding = "AI"

[[env.production.vectorize]]
binding = "RESUME_VECTORIZE_INDEX"
index_name = "resume-embeddings"
```

### Required Bindings

1. **AI Binding** - For Cloudflare AI models
2. **Vectorize Index** - For semantic search and embeddings storage
3. **KV Storage** (optional) - For caching and session management
4. **D1 Database** (optional) - For persistent data storage

## Usage Examples

### Basic Resume Analysis

```javascript
const response = await fetch('/resume/analyze-enhanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    resumeText: "John Doe\nSoftware Engineer...",
    analysisType: "comprehensive",
    includeEmbeddings: true
  })
});

const result = await response.json();
console.log('Resume Score:', result.analysis.score);
console.log('Suggestions:', result.analysis.suggestions);
```

### Job Matching with Recommendations

```javascript
const jobMatch = await fetch('/resume/job-match', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    resumeText: resumeContent,
    jobDescription: jobPosting,
    includeSemanticMatch: true
  })
});

const match = await jobMatch.json();
console.log('Match Score:', match.jobMatch.matchScore + '%');
console.log('Missing Keywords:', match.jobMatch.missingKeywords);
```

### Template Recommendations

```javascript
const templates = await fetch('/resume/templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    resumeText: content,
    targetRole: "Senior Software Engineer",
    targetIndustry: "Technology",
    generateCustom: true
  })
});

const suggestions = await templates.json();
console.log('Best Template:', suggestions.suggestions[0].template.name);
```

## Rate Limits and Constraints

- **Batch Processing**: Maximum 10 resumes per request
- **PDF Processing**: Maximum file size 5MB
- **Vector Search**: Maximum 100 results per query
- **Version History**: Maximum 50 versions stored per resume

## Performance Considerations

- Resume analysis typically takes 2-5 seconds
- PDF processing adds 1-3 seconds depending on file size
- Vector embedding generation takes 1-2 seconds per resume
- Batch operations are processed sequentially to manage resources

## Security Notes

- All uploaded files are processed in memory only
- No resume content is permanently stored without explicit user consent
- API responses do not include sensitive personal information in logs
- All AI processing happens within Cloudflare's secure environment