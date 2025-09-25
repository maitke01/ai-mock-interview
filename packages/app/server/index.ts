import { type Context, Hono } from 'hono'
import { cors } from 'hono/cors'
import { loginRoute } from './lib/routes/login/loginRoute'
import { registerRoute } from './lib/routes/login/registerRoute'
import { resumeAnalysisRoute } from './lib/routes/resumeAnalysis'
import { resumeParserRoute } from './lib/services/resumeParser'
import {
  enhancedResumeAnalysisRoute,
  pdfProcessingRoute,
  jobMatchingRoute,
  templateSuggestionsRoute,
  versionManagementRoute,
  vectorSearchRoute,
  analyticsTrackingRoute,
  batchProcessingRoute
} from './lib/routes/resumeRoutes'

type Bindings = { Bindings: Env }

export type Route<R extends string = string> = (ctx: Context<Bindings, R>) => Promise<Response> | Response

const app = new Hono({ strict: false })
  .use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization']
  }))
  // Authentication routes
  .post('/login', loginRoute)
  .post('/register', registerRoute)
  // Resume processing routes
  .post('/resume/parse', resumeParserRoute)
  .post('/resume/analyze', resumeAnalysisRoute)
  .post('/resume/analyze-enhanced', enhancedResumeAnalysisRoute)
  .post('/resume/process-pdf', pdfProcessingRoute)
  .post('/resume/job-match', jobMatchingRoute)
  .post('/resume/templates', templateSuggestionsRoute)
  .post('/resume/versions', versionManagementRoute)
  .post('/resume/search', vectorSearchRoute)
  .post('/resume/analytics', analyticsTrackingRoute)
  .post('/resume/batch', batchProcessingRoute)

export default {
  fetch: app.fetch
} satisfies ExportedHandler<Env>
