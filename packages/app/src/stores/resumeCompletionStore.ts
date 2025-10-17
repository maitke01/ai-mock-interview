import { create } from 'zustand'

interface ResumeStore {
  saveResumeDraft: (title: string, content: string, templateType?: string) => Promise<void>
}

export const useResumeStore = create<ResumeStore>(() => ({
  saveResumeDraft: async (title: string, content: string, templateType: string = 'modern') => {
    try {
      await fetch('/api/resume-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, templateType })
      })
    } catch (error) {
      console.warn('Resume draft save failed', error)
    }
  }
}))
