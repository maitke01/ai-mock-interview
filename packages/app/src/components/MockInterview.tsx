import type React from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

const MockInterview: React.FC = () => {
  const navigate = useNavigate()
  const [inputValue, setInputValue] = useState('')

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

  useEffect(() => {
    void initialize()
  }, [initialize])

  useEffect(() => {
    if (transcript) {
      setInputValue(transcript)
    }
  }, [transcript])

  const handleMicrophoneClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      void startRecording()
    }
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
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='bg-blue-600 dark:bg-blue-800 shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <h1 className='text-2xl font-bold text-white'>Mock Interview</h1>
            <nav className='flex space-x-8'>
              <a
                href='#'
                className='text-white font-bold hover:text-blue-200 font-medium'
                onClick={() => navigate('/dashboard')}
              >
                Dashboard
              </a>
              <a
                href='#'
                className='text-white font-bold hover:text-blue-200 font-medium'
                onClick={() => navigate('/resume')}
              >
                Resume Builder
              </a>
              <a
                href='#'
                className='text-white font-bold hover:text-blue-200 font-medium'
                onClick={() => navigate('/interview')}
              >
                Mock Interview
              </a>
              <a
                href='#'
                className='text-white font-bold hover:text-blue-200 font-medium'
                onClick={() => navigate('/login')}
              >
               Log Out
              </a>
            </nav>
          </div>
        </div>
      </div>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Video Interface Section */}
          <div className='lg:col-span-2'>
            <div className='bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden'>
              <div className='p-6'>
                <h2 className='text-xl font-semibold mb-4'>Interview Session</h2>

                {/* Video Display */}
                <div className='relative bg-gray-900 rounded-lg overflow-hidden mb-6' style={{ aspectRatio: '16/9' }}>
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <div className='text-center'>
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
                      <p className='text-gray-400 text-sm mt-1'>Ready to begin</p>
                    </div>
                  </div>

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
                </div>

                {/* Controls */}
                <div className='flex items-center justify-center gap-4 mb-6'>
                  <button className='w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors'>
                    <svg className='w-6 h-6 text-white' fill='currentColor' viewBox='0 0 24 24'>
                      <rect x='6' y='6' width='12' height='12' />
                    </svg>
                  </button>
                  <button
                    onClick={handleMicrophoneClick}
                    disabled={!isInitialized || isTranscribing}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                      isRecording
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : isInitialized
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    } ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isTranscribing
                      ? (
                        <svg className='w-6 h-6 animate-spin' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                          />
                        </svg>
                      )
                      : (
                        <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z'
                          />
                        </svg>
                      )}
                  </button>
                  <button className='w-14 h-14 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors'>
                    <svg className='w-6 h-6 text-gray-700' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                      />
                    </svg>
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
                        ? 'bg-red-100 text-red-700'
                        : status === 'recording'
                        ? 'bg-red-100 text-red-700'
                        : status === 'transcribing'
                        ? 'bg-yellow-100 text-yellow-700'
                        : status === 'ready'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {getStatusDisplay()}
                  </div>
                </div>

                {/* Answer Input */}
                <div>
                  <div className='flex items-center justify-between mb-2'>
                    <label className='block text-sm font-medium text-gray-700'>Your Answer</label>
                    {transcript && (
                      <button
                        onClick={() => {
                          clearTranscript()
                          setInputValue('')
                        }}
                        className='text-xs text-blue-600 hover:text-blue-800'
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
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-vertical'
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Panel */}
          <div className='lg:col-span-1'>
            <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6'>
              <h2 className='text-xl font-semibold mb-4'>AI Feedback</h2>

              {/* Metrics */}
              <div className='space-y-4 mb-6'>
                <div>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-sm font-medium text-gray-700'>Content Relevance</span>
                    <span className='text-sm font-semibold text-blue-600'>0%</span>
                  </div>
                  <div className='w-full bg-gray-200 rounded-full h-2'>
                    <div className='bg-blue-600 h-2 rounded-full' style={{ width: '0%' }}></div>
                  </div>
                </div>

                <div>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-sm font-medium text-gray-700'>Clarity & Structure</span>
                    <span className='text-sm font-semibold text-green-600'>0%</span>
                  </div>
                  <div className='w-full bg-gray-200 rounded-full h-2'>
                    <div className='bg-green-600 h-2 rounded-full' style={{ width: '0%' }}></div>
                  </div>
                </div>

                <div>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-sm font-medium text-gray-700'>Confidence Level</span>
                    <span className='text-sm font-semibold text-purple-600'>0%</span>
                  </div>
                  <div className='w-full bg-gray-200 rounded-full h-2'>
                    <div className='bg-purple-600 h-2 rounded-full' style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>

              {/* Live Suggestions */}
              <div>
                <h3 className='text-sm font-semibold text-gray-900 mb-3'>Live Suggestions</h3>
                <ul className='space-y-2'>
                  <li className='flex items-start gap-2'>
                    <svg
                      className='w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0'
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
                    <span className='text-sm text-gray-600'>Maintain eye contact with the camera</span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <svg
                      className='w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0'
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
                    <span className='text-sm text-gray-600'>Speak at a steady pace</span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <svg
                      className='w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0'
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
                    <span className='text-sm text-gray-600'>Use specific examples from your experience</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default MockInterview
