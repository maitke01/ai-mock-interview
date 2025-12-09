import { create } from 'zustand'

interface SkillGapResult {
  keywordMatch: number
  matchedSkills: string[]
  missingSkills: string[]
  preferenceId?: string
}

interface PendingPreference {
  id: string
  userId: string
  name: string | null
  text: string | null
  metadata: Record<string, unknown>
  createdAt: number
}

interface JobSearchState {
  // Skill gap analysis state
  skillGapResult: SkillGapResult | null
  isLoadingSkillGap: boolean
  skillGapError: string | null

  // Pending preferences (for offline sync)
  pendingPreferences: PendingPreference[]
  isSyncingPreferences: boolean

  // Actions
  setSkillGapResult: (result: SkillGapResult | null) => void
  saveSkillGapResult: (result: SkillGapResult) => Promise<void>
  fetchSkillGapResult: () => Promise<void>

  // Pending preference actions
  addPendingPreference: (pref: PendingPreference) => void
  updatePendingPreference: (id: string, updates: Partial<PendingPreference>) => void
  removePendingPreference: (id: string) => void
  syncPendingPreferences: () => Promise<void>
  loadPendingPreferences: () => void
}

const PENDING_PREFS_KEY = 'pendingJobPreferences'

export const useJobSearchStore = create<JobSearchState>((set, get) => ({
  skillGapResult: null,
  isLoadingSkillGap: false,
  skillGapError: null,
  pendingPreferences: [],
  isSyncingPreferences: false,

  setSkillGapResult: (result) => set({ skillGapResult: result }),

  saveSkillGapResult: async (result) => {
    set({ isLoadingSkillGap: true, skillGapError: null })
    try {
      const response = await fetch('/api/skill-gap/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(result),
      })
      if (!response.ok) {
        throw new Error('Failed to save skill gap result')
      }
      const data = await response.json()
      set({
        skillGapResult: { ...result, preferenceId: data.id },
        isLoadingSkillGap: false,
      })
      // Dispatch event for other components
      window.dispatchEvent(
        new CustomEvent('resumeScoresUpdated', {
          detail: { keywordMatch: result.keywordMatch },
        })
      )
    } catch (error) {
      set({
        skillGapError: error instanceof Error ? error.message : 'Unknown error',
        isLoadingSkillGap: false,
      })
      // Still update local state even if save fails
      set({ skillGapResult: result })
      window.dispatchEvent(
        new CustomEvent('resumeScoresUpdated', {
          detail: { keywordMatch: result.keywordMatch },
        })
      )
    }
  },

  fetchSkillGapResult: async () => {
    set({ isLoadingSkillGap: true, skillGapError: null })
    try {
      const response = await fetch('/api/skill-gap/latest', {
        credentials: 'include',
      })
      if (!response.ok) {
        if (response.status === 404) {
          set({ skillGapResult: null, isLoadingSkillGap: false })
          return
        }
        throw new Error('Failed to fetch skill gap result')
      }
      const data = await response.json()
      if (data.success && data.result) {
        set({
          skillGapResult: {
            keywordMatch: data.result.keywordMatch,
            matchedSkills: data.result.matchedSkills || [],
            missingSkills: data.result.missingSkills || [],
            preferenceId: data.result.id,
          },
          isLoadingSkillGap: false,
        })
      } else {
        set({ skillGapResult: null, isLoadingSkillGap: false })
      }
    } catch (error) {
      set({
        skillGapError: error instanceof Error ? error.message : 'Unknown error',
        isLoadingSkillGap: false,
      })
    }
  },

  addPendingPreference: (pref) => {
    set((state) => {
      const updated = [pref, ...state.pendingPreferences.filter((p) => p.id !== pref.id)]
      try {
        localStorage.setItem(PENDING_PREFS_KEY, JSON.stringify(updated))
      } catch (e) {
        console.warn('Failed to persist pending preference', e)
      }
      return { pendingPreferences: updated }
    })
  },

  updatePendingPreference: (id, updates) => {
    set((state) => {
      const updated = state.pendingPreferences.map((p) =>
        p.id === id ? { ...p, ...updates, metadata: { ...p.metadata, ...updates.metadata } } : p
      )
      try {
        localStorage.setItem(PENDING_PREFS_KEY, JSON.stringify(updated))
      } catch (e) {
        console.warn('Failed to persist pending preference update', e)
      }
      return { pendingPreferences: updated }
    })
  },

  removePendingPreference: (id) => {
    set((state) => {
      const filtered = state.pendingPreferences.filter((p) => p.id !== id)
      try {
        if (filtered.length) {
          localStorage.setItem(PENDING_PREFS_KEY, JSON.stringify(filtered))
        } else {
          localStorage.removeItem(PENDING_PREFS_KEY)
        }
      } catch (e) {
        console.warn('Failed to remove pending preference', e)
      }
      return { pendingPreferences: filtered }
    })
  },

  syncPendingPreferences: async () => {
    const { pendingPreferences, removePendingPreference } = get()
    if (pendingPreferences.length === 0) return

    set({ isSyncingPreferences: true })
    for (const pref of pendingPreferences) {
      try {
        const response = await fetch('/api/preferences/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(pref),
        })
        if (response.ok) {
          removePendingPreference(pref.id)
        }
      } catch (e) {
        console.warn('Failed to sync pending preference', pref.id, e)
      }
    }
    set({ isSyncingPreferences: false })
  },

  loadPendingPreferences: () => {
    try {
      const raw = localStorage.getItem(PENDING_PREFS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as PendingPreference[]
        set({ pendingPreferences: parsed })
      }
    } catch (e) {
      console.warn('Failed to load pending preferences from localStorage', e)
    }
  },
}))
