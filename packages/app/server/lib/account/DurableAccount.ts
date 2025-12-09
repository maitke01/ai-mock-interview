import { DurableObject } from 'cloudflare:workers'

export class DurableAccount extends DurableObject<Env> {
  constructor (ctx: DurableObjectState, env: Env) {
    super(ctx, env)

    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS uploaded_resumes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL UNIQUE,
        original_file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        file_data BLOB NOT NULL,
        total_pages INTEGER,
        upload_date INTEGER DEFAULT (strftime('%s', 'now')),
        last_accessed INTEGER DEFAULT (strftime('%s', 'now'))
      ) strict;

      CREATE TABLE IF NOT EXISTS resume_sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resume_id INTEGER NOT NULL,
        header_content TEXT,
        sidebar_content TEXT,
        main_content TEXT,
        extracted_text TEXT,
        extracted_images TEXT,
        created_date INTEGER DEFAULT (strftime('%s', 'now')),
        updated_date INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (resume_id) REFERENCES uploaded_resumes(id) ON DELETE CASCADE
      ) strict;

      CREATE TABLE IF NOT EXISTS ai_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resume_id INTEGER NOT NULL,
        result_type TEXT NOT NULL,
        result_data TEXT NOT NULL,
        created_date INTEGER DEFAULT (strftime('%s', 'now')),
        expires_date INTEGER,
        FOREIGN KEY (resume_id) REFERENCES uploaded_resumes(id) ON DELETE CASCADE
      ) strict;

      CREATE TABLE IF NOT EXISTS mock_interviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        scheduled_date INTEGER NOT NULL,
        duration_minutes INTEGER DEFAULT 60,
        interview_type TEXT DEFAULT 'technical',
        status TEXT DEFAULT 'scheduled',
        resume_id INTEGER,
        notes TEXT,
        feedback TEXT,
        created_date INTEGER DEFAULT (strftime('%s', 'now')),
        updated_date INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (resume_id) REFERENCES uploaded_resumes(id) ON DELETE SET NULL
      ) strict;

      CREATE INDEX IF NOT EXISTS idx_uploaded_resumes_upload_date ON uploaded_resumes(upload_date);
      CREATE INDEX IF NOT EXISTS idx_resume_sections_resume_id ON resume_sections(resume_id);
      CREATE INDEX IF NOT EXISTS idx_ai_results_resume_type ON ai_results(resume_id, result_type);
      CREATE INDEX IF NOT EXISTS idx_mock_interviews_scheduled_date ON mock_interviews(scheduled_date);
      CREATE INDEX IF NOT EXISTS idx_mock_interviews_status ON mock_interviews(status);
  `)
  }

  addResume (data: {
    fileName: string
    originalFileName: string
    fileSize: number
    mimeType: string
    fileData: ArrayBuffer
    totalPages?: number
  }) {
    const { fileName, originalFileName, fileSize, mimeType, fileData, totalPages } = data

    const result = this.ctx.storage.sql.exec<{ id: number }>(
      `
        INSERT INTO uploaded_resumes (file_name, original_file_name, file_size, mime_type, file_data, total_pages)
        VALUES (?, ?, ?, ?, ?, ?)
        returning id
      `,
      fileName,
      originalFileName,
      fileSize,
      mimeType,
      fileData,
      totalPages ?? null
    ).one()

    return {
      success: true,
      resumeId: result.id,
      fileName,
      originalFileName,
      uploadDate: Date.now()
    }
  }

  deleteResume (resumeId: number) {
    const result = this.ctx.storage.sql.exec<{ id: number; file_name: string }>(
      `
        DELETE FROM uploaded_resumes
        WHERE id = ?
        RETURNING id, file_name
      `,
      resumeId
    ).one()

    return {
      success: true,
      resumeId: result.id,
      fileName: result.file_name
    }
  }

  listResumes () {
    const resumes = this.ctx.storage.sql.exec<{
      id: number
      file_name: string
      original_file_name: string
      file_size: number
      mime_type: string
      total_pages: number | null
      upload_date: number
      last_accessed: number
    }>(`
      SELECT id, file_name, original_file_name, file_size, mime_type, total_pages, upload_date, last_accessed
      FROM uploaded_resumes
      ORDER BY upload_date DESC
    `).toArray()

    return {
      success: true,
      resumes
    }
  }

  getResume (resumeId: number) {
    const resume = this.ctx.storage.sql.exec<{
      id: number
      file_name: string
      original_file_name: string
      file_size: number
      mime_type: string
      file_data: ArrayBuffer
      total_pages: number | null
      upload_date: number
      last_accessed: number
    }>(
      `
      SELECT id, file_name, original_file_name, file_size, mime_type, file_data, total_pages, upload_date, last_accessed
      FROM uploaded_resumes
      WHERE id = ?
    `,
      resumeId
    ).one()

    // Also get extracted text from resume_sections if available
    const sections = this.ctx.storage.sql.exec<{
      extracted_text: string | null
    }>(
      `SELECT extracted_text FROM resume_sections WHERE resume_id = ?`,
      resumeId
    ).toArray()

    const extractedText = sections.length > 0 ? sections[0].extracted_text : null

    // Convert ArrayBuffer to base64 for JSON serialization
    const fileDataBase64 = this.arrayBufferToBase64(resume.file_data)

    return {
      success: true,
      resume: {
        ...resume,
        file_data: fileDataBase64,
        extracted_text: extractedText
      }
    }
  }

  private arrayBufferToBase64 (buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  saveExtractedText (resumeId: number, extractedText: string) {
    // Check if a section entry already exists
    const existing = this.ctx.storage.sql.exec<{ id: number }>(
      `SELECT id FROM resume_sections WHERE resume_id = ?`,
      resumeId
    ).toArray()

    if (existing.length > 0) {
      // Update existing
      this.ctx.storage.sql.exec(
        `UPDATE resume_sections SET extracted_text = ?, updated_date = strftime('%s', 'now') WHERE resume_id = ?`,
        extractedText,
        resumeId
      )
    } else {
      // Insert new
      this.ctx.storage.sql.exec(
        `INSERT INTO resume_sections (resume_id, extracted_text) VALUES (?, ?)`,
        resumeId,
        extractedText
      )
    }

    return { success: true }
  }

  saveDraftContent (resumeId: number, content: {
    headerContent?: string
    sidebarContent?: string
    mainContent?: string
  }) {
    const { headerContent, sidebarContent, mainContent } = content

    // Check if a section entry already exists
    const existing = this.ctx.storage.sql.exec<{ id: number }>(
      `SELECT id FROM resume_sections WHERE resume_id = ?`,
      resumeId
    ).toArray()

    if (existing.length > 0) {
      // Update existing
      this.ctx.storage.sql.exec(
        `UPDATE resume_sections
         SET header_content = ?, sidebar_content = ?, main_content = ?, updated_date = strftime('%s', 'now')
         WHERE resume_id = ?`,
        headerContent ?? null,
        sidebarContent ?? null,
        mainContent ?? null,
        resumeId
      )
    } else {
      // Insert new
      this.ctx.storage.sql.exec(
        `INSERT INTO resume_sections (resume_id, header_content, sidebar_content, main_content) VALUES (?, ?, ?, ?)`,
        resumeId,
        headerContent ?? null,
        sidebarContent ?? null,
        mainContent ?? null
      )
    }

    return { success: true }
  }

  getDraftContent (resumeId: number) {
    const result = this.ctx.storage.sql.exec<{
      header_content: string | null
      sidebar_content: string | null
      main_content: string | null
    }>(
      `SELECT header_content, sidebar_content, main_content FROM resume_sections WHERE resume_id = ?`,
      resumeId
    ).toArray()

    if (result.length === 0) {
      return { success: true, content: null }
    }

    return {
      success: true,
      content: {
        headerContent: result[0].header_content,
        sidebarContent: result[0].sidebar_content,
        mainContent: result[0].main_content,
      }
    }
  }

  // Get draft by template name (for scratch/modern/classic templates)
  getDraftByTemplateName (templateName: string) {
    const result = this.ctx.storage.sql.exec<{
      id: number
      header_content: string | null
      sidebar_content: string | null
      main_content: string | null
    }>(
      `SELECT ur.id, rs.header_content, rs.sidebar_content, rs.main_content
       FROM uploaded_resumes ur
       LEFT JOIN resume_sections rs ON rs.resume_id = ur.id
       WHERE ur.file_name = ?
       ORDER BY ur.upload_date DESC
       LIMIT 1`,
      `draft-${templateName}`
    ).toArray()

    if (result.length === 0) {
      return { success: true, resumeId: null, content: null }
    }

    return {
      success: true,
      resumeId: result[0].id,
      content: {
        headerContent: result[0].header_content,
        sidebarContent: result[0].sidebar_content,
        mainContent: result[0].main_content,
      }
    }
  }

  // Create or update a draft by template name
  saveDraftByTemplateName (templateName: string, content: {
    headerContent?: string
    sidebarContent?: string
    mainContent?: string
  }) {
    const fileName = `draft-${templateName}`

    // Check if draft already exists
    const existing = this.ctx.storage.sql.exec<{ id: number }>(
      `SELECT id FROM uploaded_resumes WHERE file_name = ?`,
      fileName
    ).toArray()

    let resumeId: number
    if (existing.length > 0) {
      resumeId = existing[0].id
    } else {
      // Create a new resume entry for this draft
      const result = this.ctx.storage.sql.exec<{ id: number }>(
        `INSERT INTO uploaded_resumes (file_name, original_file_name, file_size, mime_type, file_data)
         VALUES (?, ?, 0, 'text/plain', X'')
         RETURNING id`,
        fileName,
        fileName
      ).one()
      resumeId = result.id
    }

    // Save the content
    return this.saveDraftContent(resumeId, content)
  }

  scheduleMockInterview (data: {
    title: string
    description?: string
    scheduledDate: number
    durationMinutes?: number
    interviewType?: string
    resumeId?: number
    notes?: string
  }) {
    const {
      title,
      description,
      scheduledDate,
      durationMinutes = 60,
      interviewType = 'technical',
      resumeId,
      notes
    } = data

    const result = this.ctx.storage.sql.exec<{ id: number }>(
      `
        INSERT INTO mock_interviews (title, description, scheduled_date, duration_minutes, interview_type, resume_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING id
      `,
      title,
      description ?? null,
      scheduledDate,
      durationMinutes,
      interviewType,
      resumeId ?? null,
      notes ?? null
    ).one()

    return {
      success: true,
      interviewId: result.id
    }
  }

  listMockInterviews (filters?: { status?: string; upcoming?: boolean }) {
    let query = `
      SELECT id, title, description, scheduled_date, duration_minutes, interview_type, status, resume_id, notes, feedback, created_date, updated_date
      FROM mock_interviews
    `
    const conditions: string[] = []
    const params: any[] = []

    if (filters?.status) {
      conditions.push('status = ?')
      params.push(filters.status)
    }

    if (filters?.upcoming) {
      conditions.push('scheduled_date >= ?')
      params.push(Math.floor(Date.now() / 1000))
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY scheduled_date ASC'

    const interviews = this.ctx.storage.sql.exec<{
      id: number
      title: string
      description: string | null
      scheduled_date: number
      duration_minutes: number
      interview_type: string
      status: string
      resume_id: number | null
      notes: string | null
      feedback: string | null
      created_date: number
      updated_date: number
    }>(query, ...params).toArray()

    return {
      success: true,
      interviews
    }
  }

  getMockInterview (interviewId: number) {
    const interview = this.ctx.storage.sql.exec<{
      id: number
      title: string
      description: string | null
      scheduled_date: number
      duration_minutes: number
      interview_type: string
      status: string
      resume_id: number | null
      notes: string | null
      feedback: string | null
      created_date: number
      updated_date: number
    }>(
      `
      SELECT id, title, description, scheduled_date, duration_minutes, interview_type, status, resume_id, notes, feedback, created_date, updated_date
      FROM mock_interviews
      WHERE id = ?
    `,
      interviewId
    ).one()

    return {
      success: true,
      interview
    }
  }

  updateMockInterview (interviewId: number, data: {
    title?: string
    description?: string
    scheduledDate?: number
    durationMinutes?: number
    interviewType?: string
    status?: string
    resumeId?: number
    notes?: string
    feedback?: string
  }) {
    const updates: string[] = []
    const params: any[] = []

    if (data.title !== undefined) {
      updates.push('title = ?')
      params.push(data.title)
    }
    if (data.description !== undefined) {
      updates.push('description = ?')
      params.push(data.description)
    }
    if (data.scheduledDate !== undefined) {
      updates.push('scheduled_date = ?')
      params.push(data.scheduledDate)
    }
    if (data.durationMinutes !== undefined) {
      updates.push('duration_minutes = ?')
      params.push(data.durationMinutes)
    }
    if (data.interviewType !== undefined) {
      updates.push('interview_type = ?')
      params.push(data.interviewType)
    }
    if (data.status !== undefined) {
      updates.push('status = ?')
      params.push(data.status)
    }
    if (data.resumeId !== undefined) {
      updates.push('resume_id = ?')
      params.push(data.resumeId)
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?')
      params.push(data.notes)
    }
    if (data.feedback !== undefined) {
      updates.push('feedback = ?')
      params.push(data.feedback)
    }

    if (updates.length === 0) {
      return {
        success: false,
        error: 'No updates provided'
      }
    }

    updates.push('updated_date = strftime(\'%s\', \'now\')')
    params.push(interviewId)

    const result = this.ctx.storage.sql.exec<{ id: number }>(
      `
        UPDATE mock_interviews
        SET ${updates.join(', ')}
        WHERE id = ?
        RETURNING id
      `,
      ...params
    ).one()

    return {
      success: true,
      interviewId: result.id
    }
  }

  cancelMockInterview (interviewId: number) {
    const result = this.ctx.storage.sql.exec<{ id: number }>(
      `
        UPDATE mock_interviews
        SET status = 'cancelled', updated_date = strftime('%s', 'now')
        WHERE id = ?
        RETURNING id
      `,
      interviewId
    ).one()

    return {
      success: true,
      interviewId: result.id
    }
  }

  saveResumeScores (resumeId: number, scores: {
    atsScore: number
    readabilityScore: number
    completionScore: number
  }) {
    const { atsScore, readabilityScore, completionScore } = scores
    const resultData = JSON.stringify({ atsScore, readabilityScore, completionScore })

    // Check if scores already exist for this resume
    const existing = this.ctx.storage.sql.exec<{ id: number }>(
      `SELECT id FROM ai_results WHERE resume_id = ? AND result_type = 'scores'`,
      resumeId
    ).toArray()

    if (existing.length > 0) {
      // Update existing scores
      this.ctx.storage.sql.exec(
        `UPDATE ai_results SET result_data = ?, created_date = strftime('%s', 'now') WHERE resume_id = ? AND result_type = 'scores'`,
        resultData,
        resumeId
      )
    } else {
      // Insert new scores
      this.ctx.storage.sql.exec(
        `INSERT INTO ai_results (resume_id, result_type, result_data) VALUES (?, 'scores', ?)`,
        resumeId,
        resultData
      )
    }

    return { success: true }
  }

  getResumeScores (resumeId: number) {
    const result = this.ctx.storage.sql.exec<{ result_data: string }>(
      `SELECT result_data FROM ai_results WHERE resume_id = ? AND result_type = 'scores'`,
      resumeId
    ).toArray()

    if (result.length === 0) {
      return { success: true, scores: null }
    }

    const scores = JSON.parse(result[0].result_data) as {
      atsScore: number
      readabilityScore: number
      completionScore: number
    }

    return { success: true, scores }
  }

  getAllResumeScores () {
    // Get the most recent resume's scores (for dashboard display)
    const result = this.ctx.storage.sql.exec<{
      resume_id: number
      result_data: string
    }>(
      `SELECT ar.resume_id, ar.result_data
       FROM ai_results ar
       JOIN uploaded_resumes ur ON ar.resume_id = ur.id
       WHERE ar.result_type = 'scores'
       ORDER BY ur.upload_date DESC
       LIMIT 1`
    ).toArray()

    if (result.length === 0) {
      return { success: true, scores: null, resumeId: null }
    }

    const scores = JSON.parse(result[0].result_data) as {
      atsScore: number
      readabilityScore: number
      completionScore: number
    }

    return { success: true, scores, resumeId: result[0].resume_id }
  }

  deleteMockInterview (interviewId: number) {
    const result = this.ctx.storage.sql.exec<{ id: number; title: string }>(
      `
        DELETE FROM mock_interviews
        WHERE id = ?
        RETURNING id, title
      `,
      interviewId
    ).one()

    return {
      success: true,
      interviewId: result.id,
      title: result.title
    }
  }
}
