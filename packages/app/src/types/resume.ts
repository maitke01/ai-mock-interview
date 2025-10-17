export interface SelectedResume {
  fileName: string
  text?: string
  images?: string[]
  // optimized can be a brief string summary or a boolean flag
  optimized?: string | boolean
  // previewUrl is an object URL or remote URL to the original uploaded PDF
  previewUrl?: string
}

export interface ResumeSuggestion {
  keywords?: string[]
  resumeSuggestion?: string
}
