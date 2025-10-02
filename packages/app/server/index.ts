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

// Env interface (matches wrangler bindings)
export interface Env {
  AI: any   // Workers AI binding
  DB: D1Database
  AUTH: Fetcher
}

// Hono app
const app = new Hono<{ Bindings: Env }>({ strict: false })

// Enable CORS globally
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowHeaders: ['Content-Type','Authorization']
}))

// ---------------- Authentication Routes ----------------
app.post('/login', loginRoute)
app.post('/register', registerRoute)

// ---------------- Resume Routes ----------------
app.post('/resume/parse', resumeParserRoute)
app.post('/resume/analyze', resumeAnalysisRoute)
app.post('/resume/analyze-enhanced', enhancedResumeAnalysisRoute)
app.post('/resume/process-pdf', pdfProcessingRoute)
app.post('/resume/job-match', jobMatchingRoute)
app.post('/resume/templates', templateSuggestionsRoute)
app.post('/resume/versions', versionManagementRoute)
app.post('/resume/search', vectorSearchRoute)
app.post('/resume/analytics', analyticsTrackingRoute)
app.post('/resume/batch', batchProcessingRoute)

// ---------------- AI Resume Suggestions ----------------
app.post('/resume/ai-suggestions', async (ctx) => {
  try {
    const env = ctx.env as unknown as { AI: any }
    const body = await ctx.req.json()
    const text: string = body.text || ''

    if (!text) return ctx.json({ error: 'No resume text provided' }, 400)

    // Call Workers AI LLM
    const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: `You are a resume improvement assistant. Suggest improvements for this resume:\n\n${text}`,
      max_output_tokens: 400
    })

    return ctx.json({ suggestions: aiResponse.output_text || aiResponse })
  } catch (err) {
    return ctx.json({ error: (err as Error).message }, 500)
  }
})

// Export for Cloudflare Worker
export default {
  fetch: app.fetch
} satisfies ExportedHandler<Env>