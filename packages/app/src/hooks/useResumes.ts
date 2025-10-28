import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface Resume {
  id: number
  file_name: string
  original_file_name: string
  file_size: number
  mime_type: string
  total_pages: number | null
  upload_date: number
  last_accessed: number
}

interface ResumeWithData extends Resume {
  file_data: ArrayBuffer
}

interface ListResumesResponse {
  success: boolean
  resumes: Resume[]
}

interface GetResumeResponse {
  success: boolean
  resume: ResumeWithData
}

interface AddResumeResponse {
  success: boolean
  resumeId: number
  fileName: string
  originalFileName: string
  uploadDate: number
}

interface DeleteResumeResponse {
  success: boolean
  resumeId: number
  fileName: string
}

export const useResumes = () => {
  return useQuery({
    queryKey: ['resumes'],
    queryFn: async (): Promise<ListResumesResponse> => {
      const response = await fetch('/api/list-resumes')
      if (!response.ok) {
        throw new Error('Failed to fetch resumes')
      }
      return response.json()
    }
  })
}

export const useAddResume = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      file,
      fileName,
      totalPages
    }: {
      file: File
      fileName?: string
      totalPages?: number
    }): Promise<AddResumeResponse> => {
      const formData = new FormData()
      formData.append('file', file)
      if (fileName) {
        formData.append('fileName', fileName)
      }
      if (totalPages) {
        formData.append('totalPages', totalPages.toString())
      }

      const response = await fetch('/api/add-resume', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to add resume')
      }

      return response.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resumes'] })
  })
}

export const useGetResume = (resumeId: number | null) => {
  return useQuery({
    queryKey: ['resume', resumeId],
    queryFn: async (): Promise<GetResumeResponse> => {
      if (!resumeId) {
        throw new Error('Resume ID is required')
      }

      const response = await fetch(`/api/get-resume/${resumeId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch resume')
      }
      return response.json()
    },
    enabled: !!resumeId
  })
}

export const useDeleteResume = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (resumeId: number): Promise<DeleteResumeResponse> => {
      const response = await fetch('/api/delete-resume', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resumeId })
      })

      if (!response.ok) {
        throw new Error('Failed to delete resume')
      }

      return response.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resumes'] })
  })
}
