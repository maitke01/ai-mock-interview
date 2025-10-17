import { type Context, Hono } from 'hono'
import { loginRoute } from './lib/routes/login/loginRoute'
import { registerRoute } from './lib/routes/login/registerRoute'
import { atsScoreRoute } from './lib/routes/resume/atsScoreRoute'
import { extractKeywordsRoute } from './lib/routes/resume/extractKeywordsRoute'
import { formatResumeRoute } from './lib/routes/resume/formatResumeRoute'
import { optimizeResumeRoute } from './lib/routes/resume/optimizeResumeRoute'
import { resumeUploadRoute } from './lib/routes/resume/resumeUploadRoute'

type Bindings = { Bindings: Env }

export type Route<R extends string = string> = (ctx: Context<Bindings, R>) => Promise<Response> | Response

const app = new Hono({ strict: false })
  .post('/login', loginRoute)
  .post('/register', registerRoute)
  .post('/api/optimize-resume', optimizeResumeRoute)
  .post('/api/extract-keywords', extractKeywordsRoute)
  .post('/api/ats-score', atsScoreRoute)
  .post('/api/format-resume', formatResumeRoute)
  .post('/api/resume-upload', resumeUploadRoute)

export default {
  fetch: app.fetch
} satisfies ExportedHandler<Env>
