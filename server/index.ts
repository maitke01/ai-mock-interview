import { Hono, type Context } from 'hono'
import { loginRoute } from './lib/routes/login/loginRoute'
import { registerRoute } from './lib/routes/login/registerRoute'

type Bindings = { Bindings: Env }

export type Route<R extends string = string> = (ctx: Context<Bindings, R>) => Promise<Response> | Response

const app = new Hono({ strict: false })
  .post('/login', loginRoute)
  .post('/register', registerRoute)

export default {
	fetch: app.fetch
} satisfies ExportedHandler<Env>
