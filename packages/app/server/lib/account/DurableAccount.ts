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

      CREATE INDEX IF NOT EXISTS idx_uploaded_resumes_upload_date ON uploaded_resumes(upload_date);
      CREATE INDEX IF NOT EXISTS idx_resume_sections_resume_id ON resume_sections(resume_id);
      CREATE INDEX IF NOT EXISTS idx_ai_results_resume_type ON ai_results(resume_id, result_type);
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
}
