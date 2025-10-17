import type { Route } from '../../../index'

function clamp (n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}

export const atsScoreRoute: Route = async (ctx) => {
  try {
    const { resumeText, keywords } = await ctx.req.json()

    if (!resumeText || typeof resumeText !== 'string') {
      return ctx.json({ error: 'Invalid or missing resumeText' }, 400)
    }

    const text = resumeText.toLowerCase()
    const wordMatches = text.match(/\b[\w'-]+\b/g) || []
    const wordCount = wordMatches.length
    const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean)
    const sentenceCount = sentences.length || 1
    const avgWordsPerSentence = wordCount / sentenceCount

    // Keyword match scoring (30% of total)
    let keywordScore = 0
    let matchedKeywords: string[] = []
    if (Array.isArray(keywords) && keywords.length > 0) {
      let found = 0
      for (const kw of keywords) {
        const k = String(kw).toLowerCase().trim()
        if (!k) continue
        // naive containment check
        if (text.includes(k)) {
          found++
          matchedKeywords.push(k)
        }
      }
      keywordScore = Math.round((found / keywords.length) * 30)
    }

    // Readability heuristic (35% of total) -- prefer avg sentence length near 15 words
    const ideal = 15
    const diff = Math.abs(avgWordsPerSentence - ideal)
    // map diff to score: diff 0 -> 35, diff >=30 -> 0
    const readabilityScore = Math.round(Math.max(0, (1 - Math.min(diff / 30, 1)) * 35))

    // Base/other heuristics (35% of total)
    let baseScore = 0
    // presence of contact info
    if (text.includes('@') || /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text)) {
      baseScore += 15
    }
    // reasonable length gives points
    if (wordCount >= 200 && wordCount <= 1000) {
      baseScore += 20
    } else if (wordCount >= 100 && wordCount < 200) {
      baseScore += 10
    }

    const totalScore = clamp(baseScore + keywordScore + readabilityScore, 0, 100)

    return ctx.json({
      success: true,
      atsScore: totalScore,
      keywordScore,
      readabilityScore,
      baseScore,
      matchedKeywords
    })
  } catch (error) {
    console.error('Error in atsScoreRoute:', error)
    return ctx.json({
      error: 'Failed to calculate ATS score',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
