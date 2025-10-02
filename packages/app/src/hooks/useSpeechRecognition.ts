import { useCallback, useRef, useState } from 'react'

interface SpeechRecognitionState {
  isInitialized: boolean
  isRecording: boolean
  isTranscribing: boolean
  transcript: string
  error: string | null
  status: 'idle' | 'loading' | 'ready' | 'recording' | 'transcribing' | 'error'
}

interface SpeechRecognitionActions {
  initialize: () => Promise<void>
  startRecording: () => Promise<void>
  stopRecording: () => void
  transcribeFile: (file: File) => Promise<void>
  clearTranscript: () => void
}

export const useSpeechRecognition = (): SpeechRecognitionState & SpeechRecognitionActions => {
  const [state, setState] = useState<SpeechRecognitionState>({
    isInitialized: false,
    isRecording: false,
    isTranscribing: false,
    transcript: '',
    error: null,
    status: 'idle'
  })

  const pipelineRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const initialize = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, status: 'loading', error: null }))

      // Dynamically import transformers library
      const { pipeline: createPipeline } = await import('@xenova/transformers')

      // Load the Whisper tiny model
      pipelineRef.current = await createPipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en')

      setState((prev) => ({
        ...prev,
        isInitialized: true,
        status: 'ready',
        error: null
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize speech recognition'
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: errorMessage
      }))
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (!pipelineRef.current) {
      setState((prev) => ({ ...prev, error: 'Speech recognition not initialized' }))
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data)
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        await transcribeAudio(audioBlob)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorderRef.current.start()
      setState((prev) => ({
        ...prev,
        isRecording: true,
        status: 'recording',
        error: null
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Microphone access denied'
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: errorMessage
      }))
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop()
      setState((prev) => ({ ...prev, isRecording: false }))
    }
  }, [state.isRecording])

  const transcribeFile = useCallback(async (file: File) => {
    if (!pipelineRef.current) {
      setState((prev) => ({ ...prev, error: 'Speech recognition not initialized' }))
      return
    }

    const audioBlob = new Blob([file], { type: file.type })
    await transcribeAudio(audioBlob)
  }, [])

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setState((prev) => ({
        ...prev,
        isTranscribing: true,
        status: 'transcribing',
        error: null
      }))

      // Create an audio context to decode the audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000 // Whisper expects 16kHz
      })

      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // Get the audio data as Float32Array
      let audio: Float32Array
      if (audioBuffer.numberOfChannels === 1) {
        audio = audioBuffer.getChannelData(0)
      } else {
        // Convert stereo to mono by averaging channels
        const left = audioBuffer.getChannelData(0)
        const right = audioBuffer.getChannelData(1)
        audio = new Float32Array(left.length)
        for (let i = 0; i < left.length; i++) {
          audio[i] = (left[i] + right[i]) / 2
        }
      }

      // Transcribe using the pipeline
      const result = await pipelineRef.current(audio)

      setState((prev) => ({
        ...prev,
        transcript: result.text,
        isTranscribing: false,
        status: 'ready'
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transcription failed'
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: errorMessage,
        isTranscribing: false
      }))
    }
  }

  const clearTranscript = useCallback(() => {
    setState((prev) => ({ ...prev, transcript: '' }))
  }, [])

  return {
    ...state,
    initialize,
    startRecording,
    stopRecording,
    transcribeFile,
    clearTranscript
  }
}
