import { type Context, Hono } from 'hono'
import { loginRoute } from './lib/routes/login/loginRoute'
import { registerRoute } from './lib/routes/login/registerRoute'
import { optimizeResumeRoute } from './lib/routes/resume/optimizeResumeRoute'

type Bindings = { Bindings: Env }

export type Route<R extends string = string> = (ctx: Context<Bindings, R>) => Promise<Response> | Response

const app = new Hono({ strict: false })
  .post('/login', loginRoute)
  .post('/register', registerRoute)
  .post('/api/optimize-resume', optimizeResumeRoute)

export default {
  fetch: app.fetch
} satisfies ExportedHandler<Env>
