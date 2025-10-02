import { WorkerEntrypoint } from 'cloudflare:workers'
import { signJwt } from './jwt/sign'
import { verifyJwt } from './jwt/verify'
import { getOAuthToken, type GetTokenOptions, refreshOAuthToken, type RefreshTokenOptions } from './oauth/token'
import { argon2Hash, argon2Verify } from './password/argon2'
import { getAccount } from './util/get-account'

// Env interface
interface Env {
  AI: Ai
  DB: D1Database
  AUTH: Fetcher
}

export default class Auth extends WorkerEntrypoint<Env> {
  async argon2Hash(...args: Parameters<typeof argon2Hash>) { return await argon2Hash(...args) }
  async argon2Verify(...args: Parameters<typeof argon2Verify>) { return await argon2Verify(...args) }
  async refreshOAuthToken(options: RefreshTokenOptions) { return await refreshOAuthToken(options) }
  async getOAuthToken(requestURL: string, options: GetTokenOptions) { return await getOAuthToken(requestURL, options) }
  async signJwt(...args: Parameters<typeof signJwt>) { return await signJwt(...args) }
  async verifyJwt(...args: Parameters<typeof verifyJwt>) { return await verifyJwt(...args) }
  async getAccount(...args: Parameters<typeof getAccount>) { return await getAccount(...args) }

  async fetch(request: Request): Promise<Response> {
    return new Response(null, { status: 404 })
  }
}
