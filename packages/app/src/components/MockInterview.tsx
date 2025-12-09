import type React from 'react'
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import {
  useStartInterviewSession,
  useSubmitInterviewResponse,
  useEndInterviewSession,
  useInterviewSessions,
  useInterviewSession,
  useSessionFeedback,
  type ConversationTurn
} from '../hooks/useInterviews'
import Header from './Header'
import TodoList from './TodoList'

const MockInterview: React.FC = () => {
  const navigate = useNavigate()
  const [inputValue, setInputValue] = useState('')
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([])
  const [mainContentMargin, setMainContentMargin] = useState(320)
  const [currentVideo, setCurrentVideo] = useState<string | null>(null)
  const [selectedPastSessionId, setSelectedPastSessionId] = useState<number | null>(null)
  const [userStream, setUserStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const userVideoRef = useRef<HTMLVideoElement>(null)

  // Fetch past sessions
  const { data: sessionsData, isLoading: isLoadingSessions } = useInterviewSessions()
  const { data: pastSessionData } = useInterviewSession(selectedPastSessionId)

  // Fetch feedback scores for current session (polls every 5 seconds)
  const { data: feedbackData } = useSessionFeedback(sessionId)

  const {
    isInitialized,
    isRecording,
    isTranscribing,
    transcript,
    error,
    status,
    initialize,
    startRecording,
    stopRecording,
    clearTranscript
  } = useSpeechRecognition()

  const startSession = useStartInterviewSession()
  const submitResponse = useSubmitInterviewResponse()
  const endSession = useEndInterviewSession()

  // Initialize speech recognition
  useEffect(() => {
    void initialize()
  }, [initialize])

  // Initialize webcam
  useEffect(() => {
    const initWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false
        })
        setUserStream(stream)
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream
        }
      } catch (err) {
        console.error('Failed to access webcam:', err)
      }
    }
    void initWebcam()

    return () => {
      if (userStream) {
        userStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Start interview session on mount
  useEffect(() => {
    startSession.mutate(undefined, {
      onSuccess: (data) => {
        if (data.success && data.session) {
          setSessionId(data.session.id)
        }
      },
      onError: (error) => {
        console.error('Failed to start session:', error)
      }
    })
  }, [])

  // Update input value when transcript changes
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript)
    }
  }, [transcript])

  // Auto-play video when it changes
  useEffect(() => {
    if (currentVideo && videoRef.current) {
      videoRef.current.load()
      videoRef.current.play().catch(err => {
        console.error('Failed to play video:', err)
      })
    }
  }, [currentVideo])

  const handleMicrophoneClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      void startRecording()
    }
  }

  const handleSubmitResponse = () => {
    if (!sessionId || !inputValue.trim()) {
      return
    }

    // Build conversation history for context
    const history = conversationHistory.flatMap(turn => [
      { role: 'user', content: turn.userText },
      { role: 'assistant', content: turn.aiText }
    ])

    submitResponse.mutate(
      {
        sessionId,
        userText: inputValue,
        conversationHistory: history
      },
      {
        onSuccess: (data) => {
          if (data.success && data.turn) {
            // Add to conversation history
            setConversationHistory(prev => [...prev, data.turn!])

            // Set current video for playback
            setCurrentVideo(data.turn.videoUrl)

            // Clear input
            setInputValue('')
            clearTranscript()
          }
        },
        onError: (error) => {
          console.error('Failed to submit response:', error)
          alert(`Error: ${error.message}`)
        }
      }
    )
  }

  const handleEndSession = () => {
    if (!sessionId) return

    endSession.mutate(sessionId, {
      onSuccess: () => {
        navigate('/dashboard')
      }
    })
  }

  const getStatusDisplay = () => {
    switch (status) {
      case 'loading':
        return '🔄 Loading speech recognition...'
      case 'ready':
        return '✓ Ready to record'
      case 'recording':
        return '🔴 Recording...'
      case 'transcribing':
        return '⏳ Transcribing...'
      case 'error':
        return `✗ Error: ${error}`
      default:
        return 'Speech recognition inactive'
    }
  }

  // UI state for recording toast and elapsed timer
  const [elapsed, setElapsed] = useState<number>(0)
  const [showToast, setShowToast] = useState<string | null>(null)

  useEffect(() => {
    let interval: number | undefined
    let hideTimer: number | undefined

    if (isRecording) {
      // reset and start
      setElapsed(0)
      setShowToast('Recording started')
      // hide toast after 1.8s
      hideTimer = window.setTimeout(() => setShowToast(null), 1800)
      interval = window.setInterval(() => {
        setElapsed((s) => s + 1)
      }, 1000)
    } else {
      // stop interval and show stopped toast briefly
      if (typeof hideTimer !== 'undefined') clearTimeout(hideTimer)
      if (interval) {
        clearInterval(interval)
      }
      if (!isRecording) {
        setShowToast('Recording stopped')
        // hide after 1.2s
        hideTimer = window.setTimeout(() => setShowToast(null), 1200)
      }
    }

    return () => {
      if (interval) clearInterval(interval)
      if (hideTimer) clearTimeout(hideTimer)
    }
  }, [isRecording])

  const formatElapsed = (s: number) => {
    const mm = String(Math.floor(s / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${mm}:${ss}`
  }

  return (
    <div className='flex min-h-screen bg-gray-50 dark:bg-gray-900'>
      <TodoList onWidthChange={setMainContentMargin} />
      <div className='flex-1 transition-all duration-300' style={{ marginLeft: `${mainContentMargin}px` }}>
        <Header title="Let's prepare for the interview" />
        <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Video Interface Section */}
          <div className='lg:col-span-2'>
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden'>
              <div className='p-6'>
                <h2 className='text-xl font-semibold mb-4 text-gray-900 dark:text-white'>Interview Session</h2>

                {/* Video Display */}
                <div className='relative bg-gray-900 rounded-lg overflow-hidden mb-6' style={{ aspectRatio: '16/9' }}>
                  {currentVideo ? (
                    <video
                      ref={videoRef}
                      className='w-full h-full object-cover'
                      controls
                      playsInline
                    >
                      <source src={currentVideo} type='video/mp4' />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className='absolute inset-0 flex items-center justify-center'>
                      <div className='text-center'>
                        {submitResponse.isPending ? (
                          <>
                            <div className='w-24 h-24 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center'>
                              <svg className='w-12 h-12 text-white animate-spin' fill='none' viewBox='0 0 24 24'>
                                <circle
                                  className='opacity-25'
                                  cx='12'
                                  cy='12'
                                  r='10'
                                  stroke='currentColor'
                                  strokeWidth='4'
                                ></circle>
                                <path
                                  className='opacity-75'
                                  fill='currentColor'
                                  d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                                ></path>
                              </svg>
                            </div>
                            <p className='text-white text-lg font-medium'>Generating response...</p>
                            <p className='text-gray-400 text-sm mt-1'>This may take a minute</p>
                          </>
                        ) : (
                          <>
                            <div className='w-24 h-24 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center'>
                              <svg className='w-12 h-12 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                                />
                              </svg>
                            </div>
                            <p className='text-white text-lg font-medium'>AI Interviewer</p>
                            <p className='text-gray-400 text-sm mt-1'>
                              {sessionId ? 'Ready for your response' : 'Starting session...'}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recording Indicator (shown only while recording) */}
                  {isRecording && (
                    <div className='absolute top-4 left-4 flex items-center gap-2 bg-black/50 px-3 py-2 rounded-full'>
                      <div className='w-3 h-3 bg-red-500 rounded-full animate-pulse'></div>
                      <span className='text-white text-sm font-medium'>Recording</span>
                    </div>
                  )}

                  {/* Timer */}
                  <div className='absolute top-4 right-4 bg-black/50 px-3 py-2 rounded-full'>
                    <span className='text-white text-sm font-medium'>
                      {isRecording ? formatElapsed(elapsed) : '00:00'}
                    </span>
                  </div>

                  {/* User Webcam PiP */}
                  <div className='absolute bottom-4 left-4 w-32 h-24 rounded-lg overflow-hidden border-2 border-white/30 shadow-lg bg-gray-800'>
                    <video
                      ref={userVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className='w-full h-full object-cover mirror'
                      style={{ transform: 'scaleX(-1)' }}
                    />
                    {!userStream && (
                      <div className='absolute inset-0 flex items-center justify-center bg-gray-800'>
                        <svg className='w-8 h-8 text-gray-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className='flex items-center justify-center gap-4 mb-6'>
                  <button
                    onClick={handleEndSession}
                    disabled={!sessionId || endSession.isPending}
                    className='w-14 h-14 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg'
                    style={{ backgroundColor: '#ef4444' }}
                    title='End Session'
                  >
                    <svg className='w-6 h-6' fill='white' viewBox='0 0 24 24'>
                      <rect x='6' y='6' width='12' height='12' />
                    </svg>
                  </button>
                  <button
                    onClick={handleMicrophoneClick}
                    disabled={!isInitialized || isTranscribing || submitResponse.isPending}
                    className='w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
                    style={{
                      backgroundColor: isRecording
                        ? '#ef4444'
                        : isInitialized && !submitResponse.isPending
                        ? '#3b82f6'
                        : '#9ca3af'
                    }}
                    title={isRecording ? 'Stop Recording' : 'Start Recording'}
                  >
                    {isTranscribing
                      ? (
                        <svg className='w-6 h-6 animate-spin' fill='none' stroke='white' viewBox='0 0 24 24'>
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                          />
                        </svg>
                      )
                      : (
                        <svg className='w-6 h-6' fill='none' stroke='white' viewBox='0 0 24 24'>
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z'
                          />
                        </svg>
                      )}
                  </button>
                </div>

                {/* Recording toast */}
                {showToast && (
                  <div className='fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded shadow-md z-50'>
                    <div className='flex items-center gap-3'>
                      <div className='text-sm font-medium'>{showToast}</div>
                      {isRecording && <div className='text-xs text-gray-300'>{formatElapsed(elapsed)}</div>}
                    </div>
                  </div>
                )}

                {/* Speech Recognition Status */}
                <div className='mb-4'>
                  <div
                    className={`text-sm px-3 py-2 rounded-lg ${
                      status === 'error'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : status === 'recording'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : status === 'transcribing'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : status === 'ready'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {getStatusDisplay()}
                  </div>
                </div>

                {/* Answer Input */}
                <div>
                  <div className='flex items-center justify-between mb-2'>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>Your Answer</label>
                    {transcript && (
                      <button
                        onClick={() => {
                          clearTranscript()
                          setInputValue('')
                        }}
                        className='text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'
                      >
                        Clear transcript
                      </button>
                    )}
                  </div>
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder='Type your answer here or use the microphone to speak...'
                    rows={4}
                    className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-vertical bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400'
                    disabled={submitResponse.isPending}
                  />
                  <button
                    onClick={handleSubmitResponse}
                    disabled={!sessionId || !inputValue.trim() || submitResponse.isPending}
                    className='mt-3 w-full px-6 py-3 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                    style={{ backgroundColor: '#2563eb', color: 'white' }}
                  >
                    {submitResponse.isPending ? (
                      <>
                        <svg className='w-5 h-5 animate-spin' fill='none' viewBox='0 0 24 24'>
                          <circle
                            className='opacity-25'
                            cx='12'
                            cy='12'
                            r='10'
                            stroke='white'
                            strokeWidth='4'
                          ></circle>
                          <path
                            className='opacity-75'
                            fill='white'
                            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                          ></path>
                        </svg>
                        Generating AI Response...
                      </>
                    ) : (
                      <>
                        <svg className='w-5 h-5' fill='none' stroke='white' viewBox='0 0 24 24'>
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8'
                          />
                        </svg>
                        Submit Response
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Panel */}
          <div className='lg:col-span-1 space-y-4'>
            {/* Conversation History */}
            {conversationHistory.length > 0 && (
              <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
                <h2 className='text-xl font-semibold mb-4 text-gray-900 dark:text-white'>Conversation History</h2>
                <div className='space-y-4 max-h-96 overflow-y-auto'>
                  {conversationHistory.map((turn, index) => (
                    <div key={index} className='space-y-2'>
                      <div className='bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3'>
                        <p className='text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1'>You:</p>
                        <p className='text-sm text-gray-700 dark:text-gray-300'>{turn.userText}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (turn.videoUrl) {
                            setCurrentVideo(turn.videoUrl)
                          }
                        }}
                        className={`w-full text-left bg-gray-50 dark:bg-gray-700 rounded-lg p-3 transition-colors ${
                          turn.videoUrl
                            ? 'hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer'
                            : 'cursor-default'
                        }`}
                      >
                        <div className='flex items-center justify-between mb-1'>
                          <p className='text-xs font-semibold text-gray-900 dark:text-gray-200'>AI Interviewer:</p>
                          {turn.videoUrl && (
                            <span className='text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1'>
                              <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 24 24'>
                                <path d='M8 5v14l11-7z' />
                              </svg>
                              Play
                            </span>
                          )}
                        </div>
                        <p className='text-sm text-gray-700 dark:text-gray-300'>{turn.aiText}</p>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
              <h2 className='text-xl font-semibold mb-4 text-gray-900 dark:text-white'>AI Feedback</h2>

              {/* Scoring info */}
              {feedbackData?.feedback && feedbackData.feedback.totalTurns > 0 && (
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-4'>
                  Based on {feedbackData.feedback.turnsScored} of {feedbackData.feedback.totalTurns} response{feedbackData.feedback.totalTurns !== 1 ? 's' : ''}
                  {feedbackData.feedback.turnsScored < feedbackData.feedback.totalTurns && ' (scoring in progress...)'}
                </p>
              )}

              {/* Metrics */}
              <div className='space-y-4 mb-6'>
                <div>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Content Relevance</span>
                    <span className='text-sm font-semibold text-blue-600 dark:text-blue-400'>
                      {feedbackData?.feedback?.contentRelevance ?? 0}%
                    </span>
                  </div>
                  <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
                    <div
                      className='bg-blue-600 h-2 rounded-full transition-all duration-500'
                      style={{ width: `${feedbackData?.feedback?.contentRelevance ?? 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Clarity & Structure</span>
                    <span className='text-sm font-semibold text-green-600 dark:text-green-400'>
                      {feedbackData?.feedback?.clarityStructure ?? 0}%
                    </span>
                  </div>
                  <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
                    <div
                      className='bg-green-600 h-2 rounded-full transition-all duration-500'
                      style={{ width: `${feedbackData?.feedback?.clarityStructure ?? 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Confidence Level</span>
                    <span className='text-sm font-semibold text-purple-600 dark:text-purple-400'>
                      {feedbackData?.feedback?.confidenceLevel ?? 0}%
                    </span>
                  </div>
                  <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
                    <div
                      className='bg-purple-600 h-2 rounded-full transition-all duration-500'
                      style={{ width: `${feedbackData?.feedback?.confidenceLevel ?? 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Live Suggestions */}
              <div>
                <h3 className='text-sm font-semibold text-gray-900 dark:text-white mb-3'>Live Suggestions</h3>
                <ul className='space-y-2'>
                  <li className='flex items-start gap-2'>
                    <svg
                      className='w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                      />
                    </svg>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Maintain eye contact with the camera</span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <svg
                      className='w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                      />
                    </svg>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Speak at a steady pace</span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <svg
                      className='w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                      />
                    </svg>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Use specific examples from your experience</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Past Conversations Section */}
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
              <h2 className='text-xl font-semibold mb-4 text-gray-900 dark:text-white'>Past Conversations</h2>

              {isLoadingSessions ? (
                <div className='flex items-center justify-center py-4'>
                  <svg className='w-6 h-6 animate-spin text-blue-600' fill='none' viewBox='0 0 24 24'>
                    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                  </svg>
                </div>
              ) : sessionsData?.sessions && sessionsData.sessions.length > 0 ? (
                <div className='space-y-3'>
                  {/* Session List */}
                  <div className='space-y-2 max-h-48 overflow-y-auto'>
                    {sessionsData.sessions
                      .filter(s => s.id !== sessionId && s.total_turns !== 0) // Exclude current session
                      .map((session) => (
                        <button
                          key={session.id}
                          onClick={() => setSelectedPastSessionId(selectedPastSessionId === session.id ? null : session.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedPastSessionId === session.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                              : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                              <span className={`w-2 h-2 rounded-full ${
                                session.status === 'completed' ? 'bg-green-500' :
                                session.status === 'active' ? 'bg-blue-500' :
                                'bg-gray-400'
                              }`}></span>
                              <span className='text-sm font-medium text-gray-900 dark:text-white'>
                                Session #{session.id}
                              </span>
                            </div>
                            <span className='text-xs text-gray-500 dark:text-gray-400'>
                              {session.total_turns} turn{session.total_turns !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                            {new Date(session.started_at * 1000).toLocaleDateString()} at{' '}
                            {new Date(session.started_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </button>
                      ))}
                  </div>

                  {/* Selected Session Conversation */}
                  {selectedPastSessionId && pastSessionData?.session && (
                    <div className='mt-4 pt-4 border-t border-gray-200 dark:border-gray-600'>
                      <h3 className='text-sm font-semibold text-gray-900 dark:text-white mb-3'>
                        Conversation from Session #{selectedPastSessionId}
                      </h3>
                      <div className='space-y-3 max-h-64 overflow-y-auto'>
                        {pastSessionData.session.turns.map((turn, index) => (
                          <div key={index} className='space-y-2'>
                            <div className='bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3'>
                              <p className='text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1'>You:</p>
                              <p className='text-sm text-gray-700 dark:text-gray-300'>{turn.user_text}</p>
                            </div>
                            <button
                              onClick={() => {
                                if (turn.video_url) {
                                  setCurrentVideo(turn.video_url)
                                }
                              }}
                              className={`w-full text-left bg-gray-50 dark:bg-gray-700 rounded-lg p-3 transition-colors ${
                                turn.video_url
                                  ? 'hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer'
                                  : 'cursor-default'
                              }`}
                            >
                              <div className='flex items-center justify-between mb-1'>
                                <p className='text-xs font-semibold text-gray-900 dark:text-gray-200'>AI Interviewer:</p>
                                {turn.video_url && (
                                  <span className='text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1'>
                                    <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 24 24'>
                                      <path d='M8 5v14l11-7z' />
                                    </svg>
                                    Play
                                  </span>
                                )}
                              </div>
                              <p className='text-sm text-gray-700 dark:text-gray-300'>{turn.ai_response_text}</p>
                            </button>
                          </div>
                        ))}
                        {pastSessionData.session.turns.length === 0 && (
                          <p className='text-sm text-gray-500 dark:text-gray-400 text-center py-2'>
                            No conversation turns in this session
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className='text-sm text-gray-500 dark:text-gray-400 text-center py-4'>
                  No past conversations yet. Start your first interview!
                </p>
              )}
            </div>
          </div>
        </div>
        </main>
      </div>
    </div>
  )
}

export default MockInterview
