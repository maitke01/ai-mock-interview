import { DurableObject } from 'cloudflare:workers'
import Replicate from 'replicate'

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
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE
      ) strict;
    `)

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

      // Use a publicly accessible default avatar
      // Option 1: Use a professional headshot from a public CDN
      // You can replace this with your own R2-hosted avatar later
      const avatarUrl = 'https://replicate.delivery/pbxt/IkgW9tngATq608Qf6haUXDpg81s5YBJfS9GaBiCFjdKXk4F5/art_1.png'

      // Alternative: If you want to use a custom avatar, upload it to R2 first:
      // const avatarUrl = `${data.r2PublicUrl}/avatars/default-interviewer.png`

      // Initialize Replicate client
      const replicate = new Replicate({
        auth: this.env.REPLICATE_API_TOKEN,
      })

      // Generate video using SadTalker
      const replicateOutput = await replicate.run(
        'cjwbw/sadtalker:a519cc0cfebaaeade068b23899165a11ec76aaa1d2b313d40d214f204ec957a3',
        {
          input: {
            facerender: 'facevid2vid',
            pose_style: 0,
            preprocess: 'crop',
            still_mode: true,
            driven_audio: audioUrl,
            source_image: avatarUrl,
            use_enhancer: true,
            use_eyeblink: true,
            size_of_image: 256,
            expression_scale: 1,
          },
        }
      )

      // Extract video URL from Replicate output
      // The output can be: string, FileOutput with .url(), or object with url property
      let replicateVideoUrl: string

      if (typeof replicateOutput === 'string') {
        replicateVideoUrl = replicateOutput
      } else if (replicateOutput && typeof replicateOutput === 'object') {
        // Handle FileOutput object with .url() method
        if ('url' in replicateOutput) {
          if (typeof replicateOutput.url === 'function') {
            replicateVideoUrl = replicateOutput.url()
          } else if (typeof replicateOutput.url === 'string') {
            replicateVideoUrl = replicateOutput.url
          } else {
            throw new Error(`Unexpected url type in Replicate output: ${typeof replicateOutput.url}`)
          }
        } else {
          // Try to stringify to see what we got
          throw new Error(`Replicate output missing url property. Output: ${JSON.stringify(replicateOutput)}`)
        }
      } else {
        throw new Error(`Unexpected Replicate output type: ${typeof replicateOutput}`)
      }

      // Download video from Replicate and upload to R2
      const videoResponse = await fetch(replicateVideoUrl)
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video from Replicate: ${videoResponse.statusText}`)
      }

      const videoData = await videoResponse.arrayBuffer()
      const videoKey = `sessions/${data.sessionId}/videos/${Date.now()}.mp4`

      await this.env.MOCK_INTERVIEW_BUCKET.put(videoKey, videoData, {
        httpMetadata: {
          contentType: 'video/mp4',
        },
      })

      const videoUrl = `${data.r2PublicUrl}/${videoKey}`

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
}
