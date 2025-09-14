const expires = new Date(0).toUTCString()

export const resetCookieHeaders = new Headers()
resetCookieHeaders.append(
  'set-cookie',
  `token=; expires=${expires}; Secure; HttpOnly; Path=/; Domain=ai-mock-interview.cc`
)
resetCookieHeaders.append('set-cookie', `token=; expires=${expires}; Secure; HttpOnly; Path=/;`)
