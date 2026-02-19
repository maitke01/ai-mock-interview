import type { Route } from '../../../index'

export const saveSkillGapRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)

  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const body = await ctx.req.json<{
      keywordMatch: number
      matchedSkills: string[]
      missingSkills: string[]
      preferenceId?: string
    }>()

    const { keywordMatch, matchedSkills, missingSkills, preferenceId } = body

    if (typeof keywordMatch !== 'number') {
      return ctx.json({ error: 'Missing keywordMatch' }, 400)
    }

    const db = ctx.env.DB
    if (!db) {
      return ctx.json({ error: 'Database not available' }, 500)
    }

    const id = preferenceId || `skillgap-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const userId = account.accountId.toString()
    const metadata = JSON.stringify({
      type: 'skill_gap',
      keywordMatch,
      matchedSkills: matchedSkills || [],
      missingSkills: missingSkills || [],
    })

    const stmt = `
      INSERT INTO job_preferences (id, user_id, name, pref_text, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        metadata = excluded.metadata,
        updated_at = CURRENT_TIMESTAMP;
    `

    await db.prepare(stmt)
      .bind(id, userId, 'Skill Gap Analysis', null, metadata)
      .run()

    return ctx.json({ success: true, id })
  } catch (error) {
    console.error('Error in saveSkillGapRoute:', error)
    return ctx.json({
      error: 'Failed to save skill gap result',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
