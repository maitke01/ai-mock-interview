import type { Route } from '../../../index'

export const extractKeywordsRoute: Route = async (ctx) => {
  try {
    const { jobDescription } = await ctx.req.json()

    if (!jobDescription || typeof jobDescription !== 'string') {
      return ctx.json({ error: 'Invalid or missing jobDescription' }, 400)
    }

    const prompt = `You are an assistant that extracts the most important keywords and skills from a job description.

Given the following job description, return a JSON object with two properties:
- keywords: an array of 6-12 short keyword phrases (lowercase), prioritized by relevance.
- resumeSuggestion: a short (1-3 sentence) tailored suggestion a candidate could apply to their resume to better match the job.

Only return the JSON object and nothing else.

Job Description:
${jobDescription}
`

    // Try Cloudflare AI binding if available
    const env = (ctx.env as any) || {}
    let aiResponse: any = null
    if (env.AI && typeof env.AI.run === 'function') {
      try {
        aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          prompt,
          temperature: 0.0,
          top_p: 0.5
        })
      } catch (err) {
        console.warn('AI.run failed in extractKeywordsRoute', err)
        aiResponse = null
      }
    }

    // If we have an AI response, try to parse JSON out of it. Otherwise, fall back to a heuristic extractor.
    if (aiResponse && aiResponse.response) {
      // The model is instructed to return JSON only, but be defensive and try to parse.
      let parsed: any = { keywords: [], resumeSuggestion: '' }
      try {
        parsed = JSON.parse(aiResponse.response)
      } catch {
        // If parsing fails, attempt to extract JSON substring
        const m = aiResponse.response.match(/\{[\s\S]*\}/)
        if (m) {
          try {
            parsed = JSON.parse(m[0])
          } catch { /* ignore */ }
        }
      }

      // Normalize keywords to array of strings
      const keywords = Array.isArray(parsed.keywords)
        ? parsed.keywords.map((k: any) => String(k).toLowerCase().trim())
        : []

      const resumeSuggestion = typeof parsed.resumeSuggestion === 'string' ? parsed.resumeSuggestion : ''

      return ctx.json({ success: true, keywords, resumeSuggestion, model: '@cf/meta/llama-3.1-8b-instruct' })
    }

    // Fallback heuristic extractor when AI binding is not configured or fails.
    // Improved heuristic: extract 1-3 word phrases (n-grams), filter stopwords, rank by frequency and phrase length.
    const text = jobDescription.toLowerCase()
    const STOPWORDS = new Set([
      'the','and','or','a','an','to','of','in','for','with','on','by','is','are','as','be','that','this','from','at','it','you','your','we','our',
      'skills','experience','using','including','including','responsibilities','responsible','ability','must','preferably','will','work'
    ])

    // Tokenize words (keep alphanum)
    const tokens = text.split(/[^a-z0-9]+/).filter(Boolean)

    function isGoodToken(t: string) {
      return t.length > 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t)
    }

    // Build n-grams up to length 3 and count frequencies
    const counts: Record<string, number> = {}
    for (let i = 0; i < tokens.length; i++) {
      for (let n = 1; n <= 3 && i + n <= tokens.length; n++) {
        const slice = tokens.slice(i, i + n)
        // drop n-grams that start or end with stopwords
        if (!isGoodToken(slice[0]) || !isGoodToken(slice[slice.length - 1])) continue
        const phrase = slice.join(' ')
        counts[phrase] = (counts[phrase] || 0) + 1
      }
    }

    // Score phrases: frequency * length (favor multi-word meaningful phrases)
    const scored = Object.keys(counts).map(p => ({ phrase: p, score: counts[p] * (p.split(' ').length) }))
      .sort((a,b) => b.score - a.score)

    // Deduplicate by simple containment (prefer longer phrases)
    const selected: string[] = []
    for (const s of scored) {
      if (selected.length >= 12) break
      const p = s.phrase
      // skip if contained in an already selected longer phrase
      if (selected.some(sel => sel.includes(p) || p.includes(sel))) continue
      selected.push(p)
    }

    // Normalize output: lowercase already, but ensure uniqueness and limit
    const keywords = selected.slice(0, 12)

    const resumeSuggestion = keywords.length > 0
      ? `Highlight experience with ${keywords.slice(0,3).join(', ')} and emphasize measurable achievements related to these skills.`
      : ''

    return ctx.json({ success: true, keywords, resumeSuggestion, model: 'heuristic' })
  } catch (error) {
    console.error('Error in extractKeywordsRoute:', error)
    return ctx.json({
      error: 'Failed to extract keywords',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
