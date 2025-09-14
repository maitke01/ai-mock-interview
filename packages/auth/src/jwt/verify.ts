import { jwtVerify } from 'jose/jwt/verify'
import { importSPKI } from 'jose/key/import'
import { env } from '../util/get-env'

export interface VerifyJwtOptions {
  jwt: string | Uint8Array
  audience: string
  issuer?: string
}

export const verifyJwt = async (
  options: VerifyJwtOptions,
  publicKey?: string
) => {
  publicKey ??= env.PUBLIC_KEY

  const {
    jwt,
    audience,
    issuer = 'https://ai-mock-interview.cc'
  } = options

  const josePublicKey = await importSPKI(publicKey, 'RS256')

  return await jwtVerify(jwt, josePublicKey, {
    issuer,
    audience,
    algorithms: ['RS256']
  })
}
