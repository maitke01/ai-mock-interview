import { env } from '../util/get-env'

interface Argon2HashOptions {
  timeCost: number
  memoryCost: number
  parallelism: number
}

export const argon2Hash = async (password: string, options?: Argon2HashOptions) => {
  const response = await env.ARGON2.fetch('http://internal/hash', {
    method: 'POST',
    body: JSON.stringify({ password, options })
  })

  const { hash } = await response.json() as { hash: string }
  return hash
}

export const argon2Verify = async (hash: string, password: string) => {
  const response = await env.ARGON2.fetch('http://internal/verify', {
    method: 'POST',
    body: JSON.stringify({ password, hash })
  })

  const { matches } = await response.json() as { matches: boolean }
  return matches
}
