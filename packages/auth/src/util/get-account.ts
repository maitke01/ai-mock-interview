import { parse } from 'cookie'
import { Buffer } from 'node:buffer'
import { verifyJwt } from '../jwt/verify'

const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/

function isValidJWT (jwt: string, alg?: string): boolean {
  if (!jwtRegex.test(jwt)) return false

  try {
    const [header] = jwt.split('.')
    const base64 = Buffer.from(header, 'base64url').toString()
    const decoded = JSON.parse(base64)

    if (typeof decoded !== 'object' || decoded === null) return false
    if (!decoded.alg) return false
    if (alg && decoded.alg !== alg) return false

    return true
  } catch {
    return false
  }
}

export const getAccount = async (cookieHeader: string | null | undefined) => {
  const cookie = cookieHeader ? parse(cookieHeader) : null

  if (cookieHeader === null || !cookie?.token) {
    throw new Error('No cookie header')
  }

  if (!isValidJWT(cookie.token, 'RS256')) {
    throw new TypeError('invalid JWT')
  }

  const { payload: { aud, exp, iat, iss, jti, nbf, sub, ...rest } } = await verifyJwt({
    audience: 'https://ai-mock-interview.cc',
    jwt: cookie.token
  })

  return {
    payload: {
      aud,
      exp,
      iat,
      iss,
      jti,
      nbf,
      sub
    },
    rest,
    accountId: Number(sub)
  }
}
