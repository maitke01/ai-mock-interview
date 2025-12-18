import { DurableObject } from 'cloudflare:workers'
import { GoogleGenAI } from '@google/genai'

// Type definitions for database queries
type InterviewSession = {
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

type ConversationTurn = {
  id: number
  session_id: number
  turn_number: number
  user_text: string
  ai_response_text: string
  video_url: string | null
  audio_url: string | null
  content_relevance: number | null
  clarity_structure: number | null
  confidence_level: number | null
  created_at: number
}

type AiTextToSpeechOutput = Uint8Array | { audio: string }

export class DurableMockInterview extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)

    // Initialize database schema
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS interview_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mock_interview_id INTEGER,
        account_id INTEGER NOT NULL,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'abandoned')),
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        total_turns INTEGER DEFAULT 0,
        created_date INTEGER DEFAULT (strftime('%s', 'now')),
        updated_date INTEGER DEFAULT (strftime('%s', 'now'))
      ) strict;
    `)

    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS conversation_turns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        turn_number INTEGER NOT NULL,
        user_text TEXT NOT NULL,
        ai_response_text TEXT NOT NULL,
        video_url TEXT,
        audio_url TEXT,
        content_relevance INTEGER,
        clarity_structure INTEGER,
        confidence_level INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE
      ) strict;
    `)

    // Migration: Add feedback columns if they don't exist
    try {
      this.ctx.storage.sql.exec(`ALTER TABLE conversation_turns ADD COLUMN content_relevance INTEGER`)
    } catch { /* Column already exists */ }
    try {
      this.ctx.storage.sql.exec(`ALTER TABLE conversation_turns ADD COLUMN clarity_structure INTEGER`)
    } catch { /* Column already exists */ }
    try {
      this.ctx.storage.sql.exec(`ALTER TABLE conversation_turns ADD COLUMN confidence_level INTEGER`)
    } catch { /* Column already exists */ }

    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS generated_videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        turn_id INTEGER NOT NULL,
        r2_key TEXT NOT NULL,
        r2_url TEXT NOT NULL,
        replicate_job_id TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        completed_at INTEGER,
        FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (turn_id) REFERENCES conversation_turns(id) ON DELETE CASCADE
      ) strict;
    `)

    // Create indexes for better query performance
    this.ctx.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_account ON interview_sessions(account_id);
    `)
    this.ctx.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON interview_sessions(status);
    `)
    this.ctx.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_turns_session ON conversation_turns(session_id);
    `)
    this.ctx.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_videos_session ON generated_videos(session_id);
    `)
  }

  /**
   * Start a new interview session
   */
  async startSession(data: { accountId: number; mockInterviewId?: number }) {
    try {
      const now = Math.floor(Date.now() / 1000)

      const result = this.ctx.storage.sql
        .exec<InterviewSession>(
          `INSERT INTO interview_sessions (account_id, mock_interview_id, started_at, status)
           VALUES (?, ?, ?, 'active')
           RETURNING *`,
          data.accountId,
          data.mockInterviewId || null,
          now
        )
        .one()

      if (!result) {
        return { success: false, error: 'Failed to create session' }
      }

      return {
        success: true,
        session: result,
      }
    } catch (error) {
      console.error('Error starting session:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Submit a user response and generate AI reply with video
   */
  async submitResponse(data: {
    sessionId: number
    userText: string
    conversationHistory?: Array<{ role: string; content: string }>
    baseUrl: string
    r2PublicUrl: string
  }) {
    try {
      // Get session
      const session = this.ctx.storage.sql
        .exec<InterviewSession>(`SELECT * FROM interview_sessions WHERE id = ?`, data.sessionId)
        .one()

      if (!session) {
        return { success: false, error: 'Session not found' }
      }

      if (session.status !== 'active') {
        return { success: false, error: 'Session is not active' }
      }

      // Get conversation history from database if not provided
      let conversationHistory = data.conversationHistory
      if (!conversationHistory) {
        const turns = this.ctx.storage.sql
          .exec<ConversationTurn>(
            `SELECT * FROM conversation_turns WHERE session_id = ? ORDER BY turn_number ASC`,
            data.sessionId
          )
          .toArray()

        conversationHistory = turns.flatMap(turn => [
          { role: 'user', content: turn.user_text },
          { role: 'assistant', content: turn.ai_response_text },
        ])
      }

      // Build AI prompt for interviewer
      const systemPrompt = `You are a professional job interviewer conducting a mock interview. Your role is to:
- Ask relevant, thoughtful questions about the candidate's experience, skills, and qualifications
- Follow up on their responses with probing questions when appropriate
- Maintain a professional yet conversational tone
- Provide realistic interview scenarios
- Keep responses concise and natural (2-4 sentences typically)
- Transition smoothly between topics

The candidate has just responded. Continue the interview naturally.`

      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: data.userText },
      ]

      // Generate AI response using Workers AI
      const aiResponse = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 200,
      })

      // Extract response text
      const aiText = typeof aiResponse === 'object' && 'response' in aiResponse
        ? (aiResponse.response as string)
        : String(aiResponse)

      if (!aiText || aiText.trim().length === 0) {
        return { success: false, error: 'AI generated empty response' }
      }

      // Generate audio from AI text using MeloTTS
      const ttsResponse = await this.env.AI.run('@cf/myshell-ai/melotts', {
        prompt: aiText,
        lang: 'en',
      }) as AiTextToSpeechOutput

      // Handle TTS response - either Uint8Array or { audio: string }
      let audioData: Uint8Array
      if (ttsResponse instanceof Uint8Array) {
        audioData = ttsResponse
      } else if (typeof ttsResponse === 'object' && 'audio' in ttsResponse) {
        // Base64-encoded string
        const base64Data = ttsResponse.audio
        const binaryString = atob(base64Data)
        audioData = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          audioData[i] = binaryString.charCodeAt(i)
        }
      } else {
        throw new Error('Unexpected TTS response format')
      }

      // Upload audio to R2
      const audioKey = `sessions/${data.sessionId}/audio/${Date.now()}.mp3`
      await this.env.MOCK_INTERVIEW_BUCKET.put(audioKey, audioData, {
        httpMetadata: {
          contentType: 'audio/mpeg',
        },
      })

      // Generate public URL for audio
      const audioUrl = `${data.r2PublicUrl}/${audioKey}`

      // Get or generate video URL
      // Only generate video on the first turn, reuse it for subsequent turns
      let videoUrl: string

      if (session.total_turns === 0) {
        // First turn - generate video using Google Veo3
        const veo3Prompt = `A professional woman sitting at a desk, framed from the waist up, facing directly toward the camera. She is in a modern office setting with soft, even lighting. She wears business attire. Her lips move naturally as if she is speaking to the camera, with subtle facial expressions and slight head movements. The background is clean and professional. She is saying "${aiText}".`

        // Initialize Google GenAI client
        const ai = new GoogleGenAI({ apiKey: this.env.GOOGLE_GENAI_API_KEY })

        // Start video generation
        let operation = await ai.models.generateVideos({
          model: 'veo-3.0-fast-generate-001',
          prompt: veo3Prompt,
          config: {
            aspectRatio: '16:9',
            durationSeconds: 8,
          },
        })

        console.log('Veo3 initial operation:', JSON.stringify(operation, null, 2))

        // Poll for video generation completion
        const maxAttempts = 60 // 10 minutes max (10 seconds * 60)
        for (let attempt = 0; attempt < maxAttempts && !operation.done; attempt++) {
          console.log(`Veo3 polling attempt ${attempt + 1}/${maxAttempts}, done: ${operation.done}`)
          await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds between polls
          operation = await ai.operations.getVideosOperation({ operation })
          console.log('Veo3 operation status:', JSON.stringify(operation, null, 2))
        }

        if (!operation.done || !operation.response?.generatedVideos?.[0]) {
          console.error('Veo3 final operation state:', JSON.stringify(operation, null, 2))
          throw new Error('Veo3 video generation timed out or returned no video')
        }

        // Download the generated video
        const generatedVideo = operation.response.generatedVideos[0]
        const videoFile = generatedVideo.video

        if (!videoFile?.uri) {
          throw new Error('Veo3 video generation did not return a video URI')
        }

        // Fetch the video content from the URI with API key authentication
        const videoResponse = await fetch(`${videoFile.uri}&key=${this.env.GOOGLE_GENAI_API_KEY}`)
        if (!videoResponse.ok) {
          throw new Error(`Failed to download video from Veo3: ${videoResponse.statusText}`)
        }
        const videoBytes = await videoResponse.arrayBuffer()

        const videoKey = `sessions/${data.sessionId}/videos/${Date.now()}.mp4`

        await this.env.MOCK_INTERVIEW_BUCKET.put(videoKey, videoBytes, {
          httpMetadata: {
            contentType: 'video/mp4',
          },
        })

        videoUrl = `${data.r2PublicUrl}/${videoKey}`
      } else {
        // Subsequent turns - reuse video from first turn
        const firstTurn = this.ctx.storage.sql
          .exec<ConversationTurn>(
            `SELECT video_url FROM conversation_turns WHERE session_id = ? AND turn_number = 1`,
            data.sessionId
          )
          .one()

        if (!firstTurn?.video_url) {
          throw new Error('Could not find video from first turn')
        }

        videoUrl = firstTurn.video_url
      }

      // Save conversation turn to database
      const turnNumber = session.total_turns + 1
      const turn = this.ctx.storage.sql
        .exec<ConversationTurn>(
          `INSERT INTO conversation_turns (session_id, turn_number, user_text, ai_response_text, video_url, audio_url)
           VALUES (?, ?, ?, ?, ?, ?)
           RETURNING *`,
          data.sessionId,
          turnNumber,
          data.userText,
          aiText,
          videoUrl,
          audioUrl
        )
        .one()

      if (!turn) {
        return { success: false, error: 'Failed to save conversation turn' }
      }

      // Update session
      this.ctx.storage.sql.exec(
        `UPDATE interview_sessions
         SET total_turns = ?, updated_date = ?
         WHERE id = ?`,
        turnNumber,
        Math.floor(Date.now() / 1000),
        data.sessionId
      )

      // Trigger async feedback scoring
      // Get the previous AI question (or use a default for first turn)
      const previousAiQuestion = conversationHistory && conversationHistory.length > 0
        ? conversationHistory[conversationHistory.length - 1]?.content || 'Tell me about yourself.'
        : 'Tell me about yourself.'

      // Use waitUntil to run feedback scoring asynchronously without blocking the response
      this.ctx.waitUntil(
        this.generateFeedbackScores(turn.id, data.userText, previousAiQuestion)
      )

      return {
        success: true,
        turn: {
          turnNumber,
          userText: data.userText,
          aiText,
          videoUrl,
          audioUrl,
        },
      }
    } catch (error) {
      console.error('Error submitting response:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get session details with conversation history
   */
  async getSession(sessionId: number) {
    try {
      const session = this.ctx.storage.sql
        .exec<InterviewSession>(`SELECT * FROM interview_sessions WHERE id = ?`, sessionId)
        .one()

      if (!session) {
        return { success: false, error: 'Session not found' }
      }

      const turns = this.ctx.storage.sql
        .exec<ConversationTurn>(
          `SELECT * FROM conversation_turns WHERE session_id = ? ORDER BY turn_number ASC`,
          sessionId
        )
        .toArray()

      return {
        success: true,
        session: {
          ...session,
          turns,
        },
      }
    } catch (error) {
      console.error('Error getting session:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * End an interview session
   */
  async endSession(sessionId: number) {
    try {
      const now = Math.floor(Date.now() / 1000)

      const result = this.ctx.storage.sql
        .exec<InterviewSession>(
          `UPDATE interview_sessions
           SET status = 'completed', ended_at = ?, updated_date = ?
           WHERE id = ? AND status = 'active'
           RETURNING *`,
          now,
          now,
          sessionId
        )
        .one()

      if (!result) {
        return { success: false, error: 'Session not found or already ended' }
      }

      return {
        success: true,
        session: result,
      }
    } catch (error) {
      console.error('Error ending session:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * List all sessions for an account
   */
  async listSessions(accountId: number) {
    try {
      const sessions = this.ctx.storage.sql
        .exec<InterviewSession>(
          `SELECT * FROM interview_sessions
           WHERE account_id = ?
           ORDER BY started_at DESC`,
          accountId
        )
        .toArray()

      return {
        success: true,
        sessions,
      }
    } catch (error) {
      console.error('Error listing sessions:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * List all sessions with aggregated feedback scores for charting
   */
  async listSessionsWithFeedback(accountId: number) {
    try {
      const sessions = this.ctx.storage.sql
        .exec<InterviewSession>(
          `SELECT * FROM interview_sessions
           WHERE account_id = ? AND total_turns > 0
           ORDER BY started_at ASC`,
          accountId
        )
        .toArray()

      // Get feedback scores for each session
      const sessionsWithFeedback = sessions.map(session => {
        const turns = this.ctx.storage.sql
          .exec<ConversationTurn>(
            `SELECT * FROM conversation_turns WHERE session_id = ?`,
            session.id
          )
          .toArray()

        // Calculate averages for turns that have scores
        const turnsWithScores = turns.filter(
          t => t.content_relevance !== null && t.clarity_structure !== null && t.confidence_level !== null
        )

        if (turnsWithScores.length === 0) {
          return {
            ...session,
            feedback: null,
          }
        }

        const avgContentRelevance = Math.round(
          turnsWithScores.reduce((sum, t) => sum + (t.content_relevance || 0), 0) / turnsWithScores.length
        )
        const avgClarityStructure = Math.round(
          turnsWithScores.reduce((sum, t) => sum + (t.clarity_structure || 0), 0) / turnsWithScores.length
        )
        const avgConfidenceLevel = Math.round(
          turnsWithScores.reduce((sum, t) => sum + (t.confidence_level || 0), 0) / turnsWithScores.length
        )

        return {
          ...session,
          feedback: {
            contentRelevance: avgContentRelevance,
            clarityStructure: avgClarityStructure,
            confidenceLevel: avgConfidenceLevel,
            // Content Quality is average of content relevance and clarity
            contentQuality: Math.round((avgContentRelevance + avgClarityStructure) / 2),
            turnsScored: turnsWithScores.length,
            totalTurns: turns.length,
          },
        }
      })

      // Filter out sessions without feedback scores
      const sessionsWithScores = sessionsWithFeedback.filter(s => s.feedback !== null)

      return {
        success: true,
        sessions: sessionsWithScores,
      }
    } catch (error) {
      console.error('Error listing sessions with feedback:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Generate feedback score for a specific metric using AI
   * The AI is instructed to end its response with a number 0-100
   */
  private async generateFeedbackScore(
    metric: 'content_relevance' | 'clarity_structure' | 'confidence_level',
    userText: string,
    aiQuestion: string
  ): Promise<number> {
    const prompts = {
      content_relevance: `You are evaluating a job interview response for CONTENT RELEVANCE.

The interviewer asked: "${aiQuestion}"

The candidate responded: "${userText}"

Evaluate how relevant and on-topic the candidate's response is to the question asked. Consider:
- Does the response directly address the question?
- Are the examples and points made relevant to what was asked?
- Does the candidate stay focused on the topic?

Provide a brief 1-2 sentence evaluation, then end your response with ONLY a number from 0-100 representing the score. The number must be the last thing in your response.`,

      clarity_structure: `You are evaluating a job interview response for CLARITY AND STRUCTURE.

The interviewer asked: "${aiQuestion}"

The candidate responded: "${userText}"

Evaluate how clear and well-structured the candidate's response is. Consider:
- Is the response easy to follow and understand?
- Is it well-organized with a logical flow?
- Does the candidate communicate their points clearly?

Provide a brief 1-2 sentence evaluation, then end your response with ONLY a number from 0-100 representing the score. The number must be the last thing in your response.`,

      confidence_level: `You are evaluating a job interview response for CONFIDENCE LEVEL.

The interviewer asked: "${aiQuestion}"

The candidate responded: "${userText}"

Evaluate how confident the candidate appears based on their written response. Consider:
- Does the response sound assured and self-confident?
- Does the candidate use decisive language vs hedging/uncertain language?
- Does the candidate demonstrate conviction in their abilities and experience?

Provide a brief 1-2 sentence evaluation, then end your response with ONLY a number from 0-100 representing the score. The number must be the last thing in your response.`,
    }

    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: prompts[metric] }],
      temperature: 0.3,
      max_tokens: 150,
    })

    const responseText = typeof response === 'object' && 'response' in response
      ? (response.response as string)
      : String(response)

    // Extract the last number from the response
    const numbers = responseText.match(/\d+/g)
    if (numbers && numbers.length > 0) {
      const score = parseInt(numbers[numbers.length - 1], 10)
      // Clamp to 0-100 range
      return Math.max(0, Math.min(100, score))
    }

    // Default to 50 if no number found
    return 50
  }

  /**
   * Generate all feedback scores for a turn asynchronously
   * This runs in the background and updates the database when complete
   */
  async generateFeedbackScores(turnId: number, userText: string, previousAiQuestion: string) {
    try {
      // Run all three scoring calls in parallel
      const [contentRelevance, clarityStructure, confidenceLevel] = await Promise.all([
        this.generateFeedbackScore('content_relevance', userText, previousAiQuestion),
        this.generateFeedbackScore('clarity_structure', userText, previousAiQuestion),
        this.generateFeedbackScore('confidence_level', userText, previousAiQuestion),
      ])

      // Update the turn with the scores
      this.ctx.storage.sql.exec(
        `UPDATE conversation_turns
         SET content_relevance = ?, clarity_structure = ?, confidence_level = ?
         WHERE id = ?`,
        contentRelevance,
        clarityStructure,
        confidenceLevel,
        turnId
      )

      return {
        success: true,
        scores: {
          contentRelevance,
          clarityStructure,
          confidenceLevel,
        },
      }
    } catch (error) {
      console.error('Error generating feedback scores:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get aggregated feedback scores for a session
   */
  async getSessionFeedback(sessionId: number) {
    try {
      const turns = this.ctx.storage.sql
        .exec<ConversationTurn>(
          `SELECT * FROM conversation_turns WHERE session_id = ? ORDER BY turn_number ASC`,
          sessionId
        )
        .toArray()

      // Calculate averages for turns that have scores
      const turnsWithScores = turns.filter(
        t => t.content_relevance !== null && t.clarity_structure !== null && t.confidence_level !== null
      )

      if (turnsWithScores.length === 0) {
        return {
          success: true,
          feedback: {
            contentRelevance: 0,
            clarityStructure: 0,
            confidenceLevel: 0,
            turnsScored: 0,
            totalTurns: turns.length,
          },
        }
      }

      const avgContentRelevance = Math.round(
        turnsWithScores.reduce((sum, t) => sum + (t.content_relevance || 0), 0) / turnsWithScores.length
      )
      const avgClarityStructure = Math.round(
        turnsWithScores.reduce((sum, t) => sum + (t.clarity_structure || 0), 0) / turnsWithScores.length
      )
      const avgConfidenceLevel = Math.round(
        turnsWithScores.reduce((sum, t) => sum + (t.confidence_level || 0), 0) / turnsWithScores.length
      )

      return {
        success: true,
        feedback: {
          contentRelevance: avgContentRelevance,
          clarityStructure: avgClarityStructure,
          confidenceLevel: avgConfidenceLevel,
          turnsScored: turnsWithScores.length,
          totalTurns: turns.length,
        },
      }
    } catch (error) {
      console.error('Error getting session feedback:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
