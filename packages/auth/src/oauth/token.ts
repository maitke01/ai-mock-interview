import type { z } from 'zod'
import { getCachedOrFetch } from '../util/get-or-cache'
import { accessTokenSchema, validateOAuthErrorBody } from './util'

interface TokenOptions {
  clientId: string
  clientSecret: string
}

export interface GetTokenOptions extends TokenOptions {
  tokenURL: string
  redirectURL: string
}

export interface RefreshTokenOptions extends TokenOptions {
  refreshToken: string
  refreshURL: string
}

export const refreshOAuthToken = async (
  {
    clientId,
    clientSecret,
    refreshToken,
    refreshURL
  }: RefreshTokenOptions
) => {
  // https://discord.com/developers/docs/topics/oauth2#authorization-code-grant-access-token-response
  const data = new URLSearchParams({
    'client_id': clientId,
    'client_secret': clientSecret,
    'grant_type': 'refresh_token',
    'refresh_token': refreshToken
  })

  const response = await fetch(refreshURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: data
  })

  if (!response.ok) {
    let error = 'unknown'

    try {
      error = validateOAuthErrorBody(await response.json())
    } catch {}

    return Response.json({
      error,
      at: 'OAuth refresh_token'
    }, {
      status: 404
    })
  }

  return new Response(response.body as ReadableStream<Uint8Array>, response)
}

export const getOAuthToken = async (requestURL: string, {
  clientId,
  clientSecret,
  redirectURL,
  tokenURL
}: GetTokenOptions): Promise<
  { error: true; response: Response } | { error: false } & z.infer<typeof accessTokenSchema>
> => {
  const { searchParams } = new URL(requestURL)

  // If the user canceled the authorization, Discord will redirect them without a code.
  if (!searchParams.has('code')) {
    return {
      error: true,
      response: new Response(null, {
        status: 302,
        headers: {
          Location: '/'
        }
      })
    }
  }

  const code = searchParams.get('code')!
  const data = new URLSearchParams({
    'client_id': clientId,
    'client_secret': clientSecret,
    'grant_type': 'authorization_code',
    code,
    'redirect_uri': redirectURL
  })

  const response = await getCachedOrFetch(`http://fake.host/auth/get-oauth-token/${code}`, tokenURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: data
  })

  if (!response.ok) {
    const body = await response.text()
    let error = 'This is an issue with Discord. Please wait a few minutes before trying again.'

    if (response.status === 429 || body.includes('error code: 1015')) {
      error = 'We are being ratelimited by Discord. Please wait a few minutes before trying again.'
    }

    return {
      error: true,
      response: Response.json({
        error,
        providerError: body,
        errorCode: response.status
      }, {
        status: 404
      })
    }
  }

  const jsonTokenScheme = await response.json()
  const object = accessTokenSchema.safeParse(jsonTokenScheme)

  if (!object.success) {
    console.log(object.error)
    console.log(JSON.stringify(jsonTokenScheme))

    return { error: true, response: Response.json(object.error, { status: 404 }) }
  }

  return { error: false, ...object.data }
}
