import { create } from 'zustand'

interface ResumeScores {
  atsScore: number | null
  readabilityScore: number | null
  completionScore: number | null
}

interface ResumeScoresState {
  scores: ResumeScores
  isLoading: boolean
  error: string | null

  // Actions
  setScores: (scores: Partial<ResumeScores>) => void
  fetchScores: () => Promise<void>
  scoreResume: (resumeId: number, resumeText: string) => Promise<void>
}

export const useResumeScoresStore = create<ResumeScoresState>((set) => ({
  scores: {
    atsScore: null,
    readabilityScore: null,
    completionScore: null,
  },
  isLoading: false,
  error: null,

  setScores: (newScores) =>
    set((state) => ({
      scores: { ...state.scores, ...newScores },
    })),

  fetchScores: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/resume-scores', {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to fetch scores')
      }
      const data = await response.json()
      set({
        scores: data.scores
          ? {
              atsScore: data.scores.atsScore,
              readabilityScore: data.scores.readabilityScore,
              completionScore: data.scores.completionScore,
            }
          : {
              atsScore: null,
              readabilityScore: null,
              completionScore: null,
            },
        isLoading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      })
    }
  },

  scoreResume: async (resumeId: number, resumeText: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/score-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId, resumeText }),
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(`Failed to score resume: ${response.status}`)
      }
      const data = await response.json()
      if (data.scores) {
        set({
          scores: {
            atsScore: data.scores.atsScore,
            readabilityScore: data.scores.readabilityScore,
            completionScore: data.scores.completionScore,
          },
          isLoading: false,
        })
      } else {
        set({ isLoading: false })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      })
    }
  },
}))
