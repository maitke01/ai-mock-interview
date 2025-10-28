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

    return {
      success: true,
      resume
    }
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
