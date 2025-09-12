import { Hono } from 'hono'

const app = new Hono({ strict: false })

export default {
	fetch: app.fetch
} satisfies ExportedHandler<Env>
