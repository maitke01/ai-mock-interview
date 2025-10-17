import { create } from 'zustand'

interface ResumeCompletionStore {
  trackCompletion: (action: string, fileName?: string, amount?: number) => Promise<void>
}

export const useResumeCompletionStore = create<ResumeCompletionStore>(() => ({
  trackCompletion: async (action: string, fileName?: string, amount: number = 10) => {
    try {
      await fetch('/api/resume-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, fileName, amount })
      })
    } catch (error) {
      console.warn('Resume completion tracking failed', error)
    }
  }
}))