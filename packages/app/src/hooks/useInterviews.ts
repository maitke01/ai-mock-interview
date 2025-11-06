import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface MockInterview {
  id: number
  title: string
  description: string | null
  scheduled_date: number
  duration_minutes: number
  interview_type: string
  status: string
  resume_id: number | null
  notes: string | null
  feedback: string | null
  created_date: number
  updated_date: number
}

interface ListInterviewsResponse {
  success: boolean
  interviews: MockInterview[]
}

interface GetInterviewResponse {
  success: boolean
  interview: MockInterview
}

interface ScheduleInterviewResponse {
  success: boolean
  interviewId: number
}

interface UpdateInterviewResponse {
  success: boolean
  interviewId: number
}

interface CancelInterviewResponse {
  success: boolean
  interviewId: number
}

interface DeleteInterviewResponse {
  success: boolean
  interviewId: number
  title: string
}

export const useInterviews = (filters?: { status?: string; upcoming?: boolean }) => {
  return useQuery({
    queryKey: ['interviews', filters],
    queryFn: async (): Promise<ListInterviewsResponse> => {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.upcoming) params.append('upcoming', 'true')

      const url = `/api/list-mock-interviews${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch interviews')
      }
      return response.json()
    }
  })
}

export const useInterview = (interviewId: number | null) => {
  return useQuery({
    queryKey: ['interview', interviewId],
    queryFn: async (): Promise<GetInterviewResponse> => {
      if (!interviewId) {
        throw new Error('Interview ID is required')
      }

      const response = await fetch(`/api/get-mock-interview/${interviewId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch interview')
      }
      return response.json()
    },
    enabled: !!interviewId
  })
}

export const useScheduleInterview = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      title: string
      description?: string
      scheduledDate: number
      durationMinutes?: number
      interviewType?: string
      resumeId?: number
      notes?: string
    }): Promise<ScheduleInterviewResponse> => {
      const response = await fetch('/api/schedule-mock-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Failed to schedule interview')
      }

      return response.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interviews'] })
  })
}

export const useUpdateInterview = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      interviewId,
      data
    }: {
      interviewId: number
      data: {
        title?: string
        description?: string
        scheduledDate?: number
        durationMinutes?: number
        interviewType?: string
        status?: string
        resumeId?: number
        notes?: string
        feedback?: string
      }
    }): Promise<UpdateInterviewResponse> => {
      const response = await fetch(`/api/update-mock-interview/${interviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Failed to update interview')
      }

      return response.json()
    },
    onSuccess: (_, variables) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['interviews'] }),
        queryClient.invalidateQueries({ queryKey: ['interview', variables.interviewId] })
      ])
  })
}

export const useCancelInterview = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (interviewId: number): Promise<CancelInterviewResponse> => {
      const response = await fetch(`/api/cancel-mock-interview/${interviewId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to cancel interview')
      }

      return response.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interviews'] })
  })
}

export const useDeleteInterview = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (interviewId: number): Promise<DeleteInterviewResponse> => {
      const response = await fetch(`/api/delete-mock-interview/${interviewId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete interview')
      }

      return response.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interviews'] })
  })
}
