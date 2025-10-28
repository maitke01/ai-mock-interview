import { create } from 'zustand'

interface ResumeStore {
  uploadResume: (file: File, fileName?: string, totalPages?: number) => Promise<void>
}

export const useResumeStore = create<ResumeStore>(() => ({
  uploadResume: async (file: File, fileName?: string, totalPages?: number) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (fileName) {
        formData.append('fileName', fileName)
      }
      if (totalPages) {
        formData.append('totalPages', totalPages.toString())
      }

      await fetch('/api/add-resume', {
        method: 'POST',
        body: formData
      })
    } catch (error) {
      console.warn('Resume upload failed', error)
    }
  }
}))
