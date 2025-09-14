// @ts-ignore
import { env as cfEnv } from 'cloudflare:workers'

interface Env {
  ARGON2: Fetcher
  PRIVATE_KEY: string
  PUBLIC_KEY: string
  PASSWORD: string
}

export const env = cfEnv as unknown as Env
