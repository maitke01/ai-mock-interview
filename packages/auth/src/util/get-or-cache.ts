/**
 * Gets a request from the cache, or fetches + caches one for 15 minutes.
 */
export const getCachedOrFetch = async (cacheKey: string, url: string | Request, init?: RequestInit) => {
  let memberResponse = await caches.default.match(cacheKey)

  if (!memberResponse?.ok) {
    memberResponse = await fetch(url, init)

    if (!memberResponse.ok) {
      // Do not cache if the request is still not ok
      return memberResponse
    }

    // Clone to make headers mutable
    memberResponse = new Response(memberResponse.body, memberResponse)

    // "Responses with Set-Cookie headers are never cached..."
    // https://developers.cloudflare.com/workers/runtime-apis/cache/#headers
    memberResponse.headers.delete('set-cookie')

    // "cache.put will throw an error if:
    //    " ... The response passed contains the header Vary: * ... "
    if (memberResponse.headers.get('vary') === '*') {
      memberResponse.headers.delete('vary')
    }

    memberResponse.headers.set('cache-control', 'max-age=900')

    await caches.default.put(cacheKey, memberResponse.clone())
  }

  return memberResponse
}
