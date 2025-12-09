import { type Context, Hono } from 'hono'
import { cancelMockInterviewRoute } from './lib/routes/interview/cancelMockInterviewRoute'
import { deleteMockInterviewRoute } from './lib/routes/interview/deleteMockInterviewRoute'
import { getMockInterviewRoute } from './lib/routes/interview/getMockInterviewRoute'
import { listMockInterviewsRoute } from './lib/routes/interview/listMockInterviewsRoute'
import { scheduleMockInterviewRoute } from './lib/routes/interview/scheduleMockInterviewRoute'
import { updateMockInterviewRoute } from './lib/routes/interview/updateMockInterviewRoute'
import { startMockInterviewSessionRoute } from './lib/routes/interview/startMockInterviewSessionRoute'
import { submitMockInterviewResponseRoute } from './lib/routes/interview/submitMockInterviewResponseRoute'
import { getMockInterviewSessionRoute } from './lib/routes/interview/getMockInterviewSessionRoute'
import { endMockInterviewSessionRoute } from './lib/routes/interview/endMockInterviewSessionRoute'
import { listMockInterviewSessionsRoute } from './lib/routes/interview/listMockInterviewSessionsRoute'
import { getSessionFeedbackRoute } from './lib/routes/interview/getSessionFeedbackRoute'
import { listSessionsWithFeedbackRoute } from './lib/routes/interview/listSessionsWithFeedbackRoute'
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
import { saveExtractedTextRoute } from './lib/routes/resume/saveExtractedTextRoute'
import { generateJobDescriptionRoute } from './lib/routes/resume/generateJobDescriptionRoute'
import { scoreResumeRoute } from './lib/routes/resume/scoreResumeRoute'
import { getResumeScoresRoute } from './lib/routes/resume/getResumeScoresRoute'
import { saveDraftRoute } from './lib/routes/resume/saveDraftRoute'
import { getDraftRoute } from './lib/routes/resume/getDraftRoute'
import { upsertPreferenceRoute } from './lib/routes/preferences/upsertPreferenceRoute'
import { searchPreferencesRoute } from './lib/routes/preferences/searchPreferencesRoute'
import { listPreferencesRoute } from './lib/routes/preferences/listPreferencesRoute'
import { deletePreferenceRoute } from './lib/routes/preferences/deletePreferenceRoute'
import { listTodosRoute } from './lib/routes/todo/listTodosRoute'
import { addTodoRoute } from './lib/routes/todo/addTodoRoute'
import { updateTodoRoute } from './lib/routes/todo/updateTodoRoute'
import { deleteTodoRoute } from './lib/routes/todo/deleteTodoRoute'
import { clearCompletedTodosRoute } from './lib/routes/todo/clearCompletedTodosRoute'

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
  .get('/api/preferences/list', listPreferencesRoute)
  .delete('/api/preferences/delete/:id', deletePreferenceRoute)
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
  .post('/api/save-extracted-text', saveExtractedTextRoute)
  .post('/api/generate-job-description', generateJobDescriptionRoute)
  .post('/api/score-resume', scoreResumeRoute)
  .get('/api/resume-scores', getResumeScoresRoute)
  .post('/api/save-draft', saveDraftRoute)
  .get('/api/get-draft/:templateName', getDraftRoute)
  // Mock interview session routes
  .post('/api/mock-interview-session/start', startMockInterviewSessionRoute)
  .get('/api/mock-interview-session/list', listMockInterviewSessionsRoute)
  .get('/api/mock-interview-session/performance', listSessionsWithFeedbackRoute)
  .post('/api/mock-interview-session/:sessionId/respond', submitMockInterviewResponseRoute)
  .get('/api/mock-interview-session/:sessionId/feedback', getSessionFeedbackRoute)
  .get('/api/mock-interview-session/:sessionId', getMockInterviewSessionRoute)
  .post('/api/mock-interview-session/:sessionId/end', endMockInterviewSessionRoute)
  // Todo routes
  .get('/api/todos', listTodosRoute)
  .post('/api/todos', addTodoRoute)
  .patch('/api/todo/:id', updateTodoRoute)
  .delete('/api/todo/:id', deleteTodoRoute)
  .post('/api/todos/clear-completed', clearCompletedTodosRoute)

export default {
  fetch: app.fetch
} satisfies ExportedHandler<Env>

export { DurableAccount } from './lib/account/DurableAccount'
export { DurableMockInterview } from './lib/interview/DurableMockInterview'
