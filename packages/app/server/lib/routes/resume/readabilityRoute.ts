import type { Route } from '../../../index'

// Helper function to estimate syllables
function countSyllables(word: string): number {
  word = word.toLowerCase()
  if (word.length <= 3) return 1
  const matches = word.match(/[aeiouy]{1,2}/g)
  return matches ? matches.length : 1
}

export const readabilityRoute: Route = async (ctx) => {
  try {
    const { resumeText } = await ctx.req.json()

    if (!resumeText || typeof resumeText !== 'string') {
      return ctx.json({ error: 'Invalid or missing resumeText' }, 400)
    }

    const text = resumeText.trim()
    if (!text) {
      return ctx.json({ score: 0 }, 200)
    }

    // Split into sentences and words
    const sentences = text.split(/[.!?]+/).filter(Boolean)
    const words = text.split(/\s+/).filter(Boolean)
    
    // Count syllables
    const totalWords = words.length
    const totalSentences = sentences.length
    const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0)

// Flesch Reading Ease Score
const fleschScore = totalSentences > 0 && totalWords > 0
  ? 206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords)
  : 0


// Normalize to 0-100 scale (Flesch score can be negative or > 100)
const normalizedScore = Math.max(0, Math.min(100, Math.round(fleschScore)))


return ctx.json({ 
  score: normalizedScore,
  readabilityScore: normalizedScore 
}, 200)
  } catch (error) {
    return ctx.json({ error: 'An unexpected error occurred' }, 500)
  }
}