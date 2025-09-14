import { WorkerEntrypoint } from 'cloudflare:workers'
import { signJwt } from './jwt/sign'
import { verifyJwt } from './jwt/verify'
import { getOAuthToken, type GetTokenOptions, refreshOAuthToken, type RefreshTokenOptions } from './oauth/token'
import { argon2Hash, argon2Verify } from './password/argon2'
import { getAccount } from './util/get-account'

export default class Auth extends WorkerEntrypoint {
  fetch () {
    return new Response(null, { status: 404 })
  }

  async argon2Hash (...args: Parameters<typeof argon2Hash>) {
    return await argon2Hash(...args)
  }

  async argon2Verify (...args: Parameters<typeof argon2Verify>) {
    return await argon2Verify(...args)
  }

  /**
   * Refreshes an OAuth token according to RFC6749
   * @see https://datatracker.ietf.org/doc/html/rfc6749#section-6
   * @returns if the returned response's status is .ok, the refresh succeeded.
   */
  async refreshOAuthToken (options: RefreshTokenOptions) {
    return await refreshOAuthToken(options)
  }

  /**
   * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
   */
  async getOAuthToken (requestURL: string, options: GetTokenOptions) {
    return await getOAuthToken(requestURL, options)
  }

  async signJwt (...args: Parameters<typeof signJwt>) {
    return await signJwt(...args)
  }

  async verifyJwt (...args: Parameters<typeof verifyJwt>) {
    return await verifyJwt(...args)
  }

  async getAccount (...args: Parameters<typeof getAccount>) {
    return await getAccount(...args)
  }
}
