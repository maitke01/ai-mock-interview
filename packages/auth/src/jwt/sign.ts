import type { JWTPayload } from 'jose'
import { SignJWT } from 'jose/jwt/sign'
import { importPKCS8 } from 'jose/key/import'
import { env } from '../util/get-env'

export interface SignJWTOptions {
  /**
   * The "sub" (subject) claim identifies the principal that is the
   * subject of the JWT.
   * @see https://www.rfc-editor.org/rfc/rfc7519#section-4.1.2
   */
  subject: string
  payload: JWTPayload
  audience: string
  issuer?: string
  expires?: string | Date | number
}

export const signJwt = async (
  options: SignJWTOptions,
  privateKey?: string
) => {
  privateKey ??= env.PRIVATE_KEY

  const josePrivateKey = await importPKCS8(privateKey, 'RS256')

  const {
    payload,
    subject,
    audience,
    issuer = 'https://ai-mock-interview.cc',
    expires = '30d'
  } = options

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject(subject)
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime(expires)
    .sign(josePrivateKey)
}
