import type { Route } from '../../..'
import z from 'zod'

const schema = z.object({
  username: z.string().min(4).max(32),
  password: z.string().max(255),
  confirmPassword: z.string().max(255)
})

export const registerRoute: Route = async (ctx) => {
  const fd = await ctx.req.formData()
  const entries = Object.fromEntries(fd)
  const { success, data, error } = schema.safeParse(entries)
  
  if (!success) {
    return new Response(z.prettifyError(error), { status: 400 })
  }

  const { confirmPassword, password, username } = data

  if (confirmPassword !== password) {
    return new Response('Passwords do not match', { status: 400 })
  }

  const row = await ctx.env.DB.prepare(`
    select username, password from accounts where username = ?  
  `).bind(username).first<{ username: string, password: string }>()

  if (row !== null) {
    return new Response('An account with that username already exists', { status: 400 })
  }

  const passwordHash = await ctx.env.AUTH.argon2Hash(password)

  const newAccount = await ctx.env.DB.prepare(`
    insert into accounts (
      username, password
    ) values (?, ?)
      returning id
  `).bind(username, passwordHash).first<{ id: number }>()

  if (newAccount === null) {
    return new Response('?', { status: 502 })
  }

  // 1 year in seconds
  const maxAge = 1 * 60 * 60 * 24 * 365

  console.log(newAccount.id)
  const jwt = await ctx.env.AUTH.signJwt({
    audience: 'https://ai-mock-interview.cc',
    payload: { id: newAccount.id },
    subject: `${newAccount.id}`,
    expires: '1y'
  })

  const origin = ctx.req.header('Origin')
  const domain = import.meta.env.DEV ? '' : `Domain=${origin};`

  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
  // "Setting the domain will make the cookie available to it, as well as to all its subdomains."
  return new Response('Account created successfully', {
    status: 302,
    headers: {
      'Set-Cookie': `token=${jwt}; Max-Age=${maxAge}; Secure; HttpOnly; Path=/; ${domain}`
    }
  })
}
