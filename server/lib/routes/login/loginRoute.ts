import type { Route } from '../../..'
import { z } from 'zod'

const schema = z.object({
  username: z.string().min(4).max(32),
  password: z.string().max(255)
})

export const loginRoute: Route = async (ctx) => {
  const fd = await ctx.req.formData()
  const entries = Object.fromEntries(fd.entries())

  const { success, data, error } = schema.safeParse(entries)

  if (!success) {
    return new Response(z.prettifyError(error), { status: 400 })
  }

  const { username, password } = data

  return new Response('one day!')
}
