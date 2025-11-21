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

// Mock Interview Session Hooks

export interface InterviewSession {
  id: number
  mock_interview_id: number | null
  account_id: number
  status: 'active' | 'completed' | 'abandoned'
  started_at: number
  ended_at: number | null
  total_turns: number
  created_date: number
  updated_date: number
}

export interface ConversationTurn {
  turnNumber: number
  userText: string
  aiText: string
  videoUrl: string
  audioUrl: string
}

interface StartSessionResponse {
  success: boolean
  session?: InterviewSession
  error?: string
}

interface SubmitResponseResponse {
  success: boolean
  turn?: ConversationTurn
  error?: string
}

interface GetSessionResponse {
  success: boolean
  session?: InterviewSession & {
    turns: Array<{
      id: number
      session_id: number
      turn_number: number
      user_text: string
      ai_response_text: string
      video_url: string | null
      audio_url: string | null
      created_at: number
    }>
  }
  error?: string
}

interface EndSessionResponse {
  success: boolean
  session?: InterviewSession
  error?: string
}

interface ListSessionsResponse {
  success: boolean
  sessions?: InterviewSession[]
  error?: string
}

/**
 * Start a new mock interview session
 */
export const useStartInterviewSession = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data?: { mockInterviewId?: number }): Promise<StartSessionResponse> => {
      const response = await fetch('/api/mock-interview-session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data || {})
      })

      if (!response.ok) {
        throw new Error('Failed to start interview session')
      }

      return response.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interviewSessions'] })
  })
}

/**
 * Submit a user response and get AI reply with video
 */
export const useSubmitInterviewResponse = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      sessionId: number
      userText: string
      conversationHistory?: Array<{ role: string; content: string }>
      r2PublicUrl?: string
    }): Promise<SubmitResponseResponse> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      // Add R2 public URL header if provided
      if (data.r2PublicUrl) {
        headers['X-R2-Public-URL'] = data.r2PublicUrl
      }

      const response = await fetch(`/api/mock-interview-session/${data.sessionId}/respond`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userText: data.userText,
          conversationHistory: data.conversationHistory
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to submit response')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interviewSession', variables.sessionId] })
    }
  })
}

/**
 * Get a specific interview session with conversation history
 */
export const useInterviewSession = (sessionId: number | null) => {
  return useQuery({
    queryKey: ['interviewSession', sessionId],
    queryFn: async (): Promise<GetSessionResponse> => {
      if (!sessionId) {
        throw new Error('Session ID is required')
      }

      const response = await fetch(`/api/mock-interview-session/${sessionId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch interview session')
      }
      return response.json()
    },
    enabled: !!sessionId
  })
}

/**
 * End an active interview session
 */
export const useEndInterviewSession = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sessionId: number): Promise<EndSessionResponse> => {
      const response = await fetch(`/api/mock-interview-session/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to end interview session')
      }

      return response.json()
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['interviewSession', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['interviewSessions'] })
    }
  })
}

/**
 * List all interview sessions for the current user
 */
export const useInterviewSessions = () => {
  return useQuery({
    queryKey: ['interviewSessions'],
    queryFn: async (): Promise<ListSessionsResponse> => {
      const response = await fetch('/api/mock-interview-session/list')
      if (!response.ok) {
        throw new Error('Failed to fetch interview sessions')
      }
      return response.json()
    }
  })
}
