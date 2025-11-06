import { type Context, Hono } from 'hono'
import { cancelMockInterviewRoute } from './lib/routes/interview/cancelMockInterviewRoute'
import { deleteMockInterviewRoute } from './lib/routes/interview/deleteMockInterviewRoute'
import { getMockInterviewRoute } from './lib/routes/interview/getMockInterviewRoute'
import { listMockInterviewsRoute } from './lib/routes/interview/listMockInterviewsRoute'
import { scheduleMockInterviewRoute } from './lib/routes/interview/scheduleMockInterviewRoute'
import { updateMockInterviewRoute } from './lib/routes/interview/updateMockInterviewRoute'
import { loginRoute } from './lib/routes/login/loginRoute'
import { registerRoute } from './lib/routes/login/registerRoute'
import { addResumeRoute } from './lib/routes/resume/addResumeRoute'
import { atsScoreRoute } from './lib/routes/resume/atsScoreRoute'
import { deleteResumeRoute } from './lib/routes/resume/deleteResumeRoute'
import { extractKeywordsRoute } from './lib/routes/resume/extractKeywordsRoute'
import { formatResumeRoute } from './lib/routes/resume/formatResumeRoute'
import { getResumeRoute } from './lib/routes/resume/getResumeRoute'
import { listResumesRoute } from './lib/routes/resume/listResumesRoute'
import { optimizeResumeRoute } from './lib/routes/resume/optimizeResumeRoute'
import { readabilityRoute } from './lib/routes/resume/readabilityRoute'
import { upsertPreferenceRoute } from './lib/routes/preferences/upsertPreferenceRoute'
import { searchPreferencesRoute } from './lib/routes/preferences/searchPreferencesRoute'

type Bindings = { Bindings: Env }

export type Route<R extends string = string> = (ctx: Context<Bindings, R>) => Promise<Response> | Response

const app = new Hono({ strict: false })
  .post('/login', loginRoute)
  .post('/register', registerRoute)
  .post('/api/add-resume', addResumeRoute)
  .delete('/api/delete-resume', deleteResumeRoute)
  .get('/api/get-resume/:id', getResumeRoute)
  .get('/api/list-resumes', listResumesRoute)
  .post('/api/optimize-resume', optimizeResumeRoute)
  .post('/api/preferences/upsert', upsertPreferenceRoute)
  .post('/api/preferences/search', searchPreferencesRoute)
  // health check for local dev
  .get('/ping', (ctx) => new Response('pong', { status: 200 }))
  .post('/api/extract-keywords', extractKeywordsRoute)
  .post('/api/ats-score', atsScoreRoute)
  .post('/api/format-resume', formatResumeRoute)
  .post('/api/schedule-mock-interview', scheduleMockInterviewRoute)
  .get('/api/list-mock-interviews', listMockInterviewsRoute)
  .get('/api/get-mock-interview/:id', getMockInterviewRoute)
  .patch('/api/update-mock-interview/:id', updateMockInterviewRoute)
  .post('/api/cancel-mock-interview/:id', cancelMockInterviewRoute)
  .delete('/api/delete-mock-interview/:id', deleteMockInterviewRoute)
  .post('/api/readability', readabilityRoute)

export default {
  fetch: app.fetch
} satisfies ExportedHandler<Env>

export { DurableAccount } from './lib/account/DurableAccount'
