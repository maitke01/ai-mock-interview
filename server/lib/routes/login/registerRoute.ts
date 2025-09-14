import type { Route } from '../../..'
import z from 'zod'

const schema = z.object({
  username: z.string().min(4).max(32),
  password: z.string().max(255),
  confirmPassword: z.string().max(255)
})

export const registerRoute: Route = async (ctx) => {
  const fd = await ctx.req.formData()
  const entries = Object.fromEntries(fd.entries())
  const { success, data, error } = schema.safeParse(entries)
  
  if (!success) {
    return new Response(z.prettifyError(error), { status: 400 })
  }

  const { confirmPassword, password, username } = data

  if (confirmPassword !== password) {
    return new Response('Passwords do not match', { status: 400 })
  }

  // make db query here to find account
  // then use ctx.env.AUTH argon2 bindings to verify password

  return new Response('eventually')
}
