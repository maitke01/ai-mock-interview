import type { Route } from '../../../index'

export const resumeUploadRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)

  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const { title, content, templateType } = await ctx.req.json()

    if (!title || typeof title !== 'string') {
      return ctx.json({ error: 'Missing or invalid title' }, 400)
    }

    if (!content || typeof content !== 'string') {
      return ctx.json({ error: 'Missing or invalid content' }, 400)
    }

    // Check if draft already exists for this user with this title
    const existingDraft = await ctx.env.DB.prepare(`
      SELECT id FROM resume_drafts WHERE title = ? AND account_id = ?
    `).bind(title, account.accountId).first()

    let result
    if (existingDraft) {
      // Update existing draft
      result = await ctx.env.DB.prepare(`
        UPDATE resume_drafts 
        SET content = ?, template_type = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(content, templateType || 'modern', existingDraft.id).run()
    } else {
      // Create new draft
      result = await ctx.env.DB.prepare(`
        INSERT INTO resume_drafts (title, content, template_type, account_id)
        VALUES (?, ?, ?, ?)
      `).bind(title, content, templateType || 'modern', account.accountId).run()
    }

    if (!result.success) {
      throw new Error('Failed to save resume draft')
    }

    return ctx.json({
      success: true,
      message: existingDraft ? 'Resume draft updated successfully' : 'Resume draft saved successfully',
      data: {
        id: existingDraft ? existingDraft.id : result.meta.last_row_id,
        title,
        templateType: templateType || 'modern',
        accountId: account.accountId
      }
    })
  } catch (error) {
    console.error('Error in resumeUploadRoute:', error)

    return ctx.json({
      error: 'Failed to save resume draft',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
