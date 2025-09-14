import { z } from 'zod'

/**
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
 */
export const oauthErrorSchema = z.object({
  error: z.enum([
    'invalid_request',
    'invalid_client',
    'invalid_grant',
    'unauthorized_client',
    'unsupported_grant_type',
    'invalid_scope'
  ]),
  error_description: z.string().optional(),
  error_uri: z.string().optional()
})

export const accessTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string()
})

export const validateOAuthErrorBody = (body: unknown) => {
  const { error } = oauthErrorSchema.parse(body)

  let message: string

  switch (error) {
    case 'invalid_client':
      message = 'We failed to authorize with Discord.'
      break
    case 'invalid_grant':
      message = 'Your token is invalid, expired, revoked, or unusable. Please logout and login again.'
      break
    case 'invalid_request':
    case 'invalid_scope':
      message = 'We sent an invalid request to Discord.'
      break
    case 'unauthorized_client':
      message = 'We are not authorized to use a grant type.'
      break
    case 'unsupported_grant_type':
      message = 'We sent an invalid grant type to Discord.'
      break
  }

  return message
}
