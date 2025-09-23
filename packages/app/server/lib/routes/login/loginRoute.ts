import { z } from 'zod'
import type { Route } from '../../..'

const schema = z.object({
  username: z.string().min(4).max(32),
  password: z.string().max(255)
})

export const loginRoute: Route = async (ctx) => {
  const fd = await ctx.req.formData()
  const entries = Object.fromEntries(fd)

  const { success, data, error } = schema.safeParse(entries)

  if (!success) {
    return new Response(z.prettifyError(error), { status: 400 })
  }

  const { username, password } = data

  const row = await ctx.env.DB.prepare(`select password, id from accounts where username = ?`)
    .bind(username)
    .first<{ password: string; id: number }>()

  if (row === null) {
    return new Response('No account exists with that username', { status: 400 })
  }

  try {
    const verified = await ctx.env.AUTH.argon2Verify(row.password, password)

    if (!verified) {
      return new Response('Passwords do not match', { status: 401 })
    }
  } catch (e) {
    if (!import.meta.env.DEV) {
      throw e
    }

    if (row.password !== password) {
      return new Response('Passwords do not match', { status: 401 })
    }
  }

  // 1 year in seconds
  const maxAge = 1 * 60 * 60 * 24 * 365

  const jwt = await ctx.env.AUTH.signJwt({
    audience: 'https://ai-mock-interview.cc',
    payload: {},
    subject: `${row.id}`,
    expires: '1y'
  })

  const origin = ctx.req.header('Origin')
  const domain = import.meta.env.DEV ? '' : `Domain=${origin};`

  return new Response('Logged in!', {
    headers: {
      'Set-Cookie': `token=${jwt}; Max-Age=${maxAge}; Secure; HttpOnly; Path=/; ${domain}`
    }
  })
}
