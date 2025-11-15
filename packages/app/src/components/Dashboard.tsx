import { X } from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeleteInterview, useInterviews } from '../hooks/useInterviews'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [atsScore, setAtsScore] = useState<number | null>(null)
  const [resumeCompletion, setResumeCompletion] = useState<number>(0)
  const [keywordMatch, setKeywordMatch] = useState<number | null>(null)
  const [readabilityScore, setReadabilityScore] = useState<number | null>(null)
  const [interviewToCancel, setInterviewToCancel] = useState<number | null>(null)
  const [jobRoleMatch, setJobRoleMatch] = useState<number>(0)

  const { data: interviewsData, isLoading: interviewsLoading } = useInterviews({ upcoming: true })
  const deleteInterviewMutation = useDeleteInterview()

  const scheduledInterviews = interviewsData?.interviews || []

  // Recompute resume completion score using available stored data: selectedResume (sessionStorage) and keywordMatch
  function recomputeResumeCompletion() {
    try {
      const raw = sessionStorage.getItem('selectedResume')
      let selected: any = null
      if (raw) selected = JSON.parse(raw)

      // Heuristic weights (kept consistent with ResumeBuilder):
      // - has resume text: 20
      // - optimized resume present: 40
      // - keywordMatch (0-100) contributes up to 40
      let score = 0
      const hasText = selected && (selected.text || '').toString().trim().length > 0
      const hasOptimized = selected && typeof selected.optimized === 'string' && (selected.optimized as string).trim().length > 0

      if (hasText) score += 20
      if (hasOptimized) score += 40

      const kmRaw = localStorage.getItem('keywordMatch')
      const km = kmRaw !== null ? Number(kmRaw) : (keywordMatch ?? null)
      if (km !== null && !Number.isNaN(km)) {
        const kmContribution = Math.round(Math.max(0, Math.min(100, Number(km))) * 0.4) // scale to 0-40
        score += kmContribution
      }

      if (score > 100) score = 100
      console.debug('Dashboard: recomputeResumeCompletion', { hasText, hasOptimized, km: kmRaw ?? keywordMatch, score })
      setResumeCompletion(score)
      try { localStorage.setItem('resumeCompletion', String(score)) } catch (e) { /* noop */ }
    } catch (e) {
      console.warn('Failed to recompute resume completion', e)
    }
  }

  useEffect(() => {
    const s = localStorage.getItem('atsScore')
    if (s !== null) setAtsScore(Number(s))

    const rc = localStorage.getItem('resumeCompletion')
    if (rc !== null) setResumeCompletion(Number(rc))

    const km = localStorage.getItem('keywordMatch')
    if (km !== null) setKeywordMatch(Number(km))

    const rs = localStorage.getItem('readabilityScore')
    if (rs !== null) setReadabilityScore(Number(rs))

    // compute job role match on mount
    void computeJobRoleMatch()

    // Ensure derived completion is calculated on mount
    recomputeResumeCompletion()
  }, [])

  useEffect(() => {
    ; (window as any).updateAtsScore = (n: number) => {
      setAtsScore(n)
      localStorage.setItem('atsScore', String(n))
    }

      ; (window as any).updateReadabilityScore = (n: number) => {
        setReadabilityScore(n)
        localStorage.setItem('readabilityScore', String(n))
      }

      ; (window as any).updateResumeCompletion = (n: number) => {
        setResumeCompletion(n)
        try { localStorage.setItem('resumeCompletion', String(n)) } catch (e) { /* noop */ }
        // keep derived state consistent
        try { recomputeResumeCompletion() } catch (e) { /* noop */ }
      }

    const onScores = (evt: any) => {
      try {
        const d = evt?.detail || {}
        if (d.atsScore !== undefined && d.atsScore !== null) {
          const a = Number(d.atsScore)
          if (Number.isFinite(a)) {
            setAtsScore(a)
            localStorage.setItem('atsScore', String(a))
          }
        }
        if (d.readabilityScore !== undefined && d.readabilityScore !== null) {
          const r = Number(d.readabilityScore)
          if (Number.isFinite(r)) {
            setReadabilityScore(r)
            localStorage.setItem('readabilityScore', String(r))
          }
        }
        if (d.keywordMatch !== undefined && d.keywordMatch !== null) {
          const k = Number(d.keywordMatch)
          if (Number.isFinite(k)) {
            setKeywordMatch(k)
            localStorage.setItem('keywordMatch', String(k))
          }
        }
        if (d.resumeCompletion !== undefined && d.resumeCompletion !== null) {
          const rc = Number(d.resumeCompletion)
          if (Number.isFinite(rc)) {
            setResumeCompletion(rc)
            localStorage.setItem('resumeCompletion', String(rc))
          }
        }
        // After applying any direct values, recompute a derived resumeCompletion so the dashboard reflects combined progress
        recomputeResumeCompletion()
        // recompute role match when scores or preferences change
        try { computeJobRoleMatch().catch(() => { }) } catch (e) { /* noop */ }
      } catch (e) {
        console.warn('resumeScoresUpdated handler error', e)
      }
    }

    window.addEventListener('resumeScoresUpdated', onScores)
    window.addEventListener('preferencesUpdated', () => { try { computeJobRoleMatch().catch(() => { }) } catch (e) { } })

    return () => {
      window.removeEventListener('resumeScoresUpdated', onScores)
    }
  }, [])

  async function computeJobRoleMatch() {
    try {
      // load selected resume
      const raw = sessionStorage.getItem('selectedResume')
      let selected: any = null
      if (raw) selected = JSON.parse(raw)
      const resumeTextSource = selected?.text ?? (typeof selected?.optimized === 'string' ? selected.optimized : '')
      const resumeText = String(resumeTextSource || '').toLowerCase()

      // gather preferences: pending local + server
      const pendingKey = 'pendingJobPreferences'
      let pending: any[] = []
      try { const r = localStorage.getItem(pendingKey); if (r) pending = JSON.parse(r) as any[] } catch (e) { console.warn('Failed to parse pendingJobPreferences in Dashboard', e) }

      // fetch server prefs
      let server: any[] = []
      try {
        const res = await fetch('/api/preferences/list')
        if (res.ok) {
          const j = await res.json()
          if (j && j.success && Array.isArray(j.results)) server = j.results
        }
      } catch (e) {
        console.warn('Failed to fetch server preferences in Dashboard', e)
      }

      const merged = [...pending, ...server.filter((s) => !pending.some((p) => String(p.id) === String(s.id)))]

      // choose starred preference (first favorite)
      const starred = merged.find((p) => p && p.metadata && p.metadata.favorite)
      if (!starred) {
        setJobRoleMatch(0)
        return
      }

      // get keywords from metadata
      let keywords: string[] = []
      try {
        const km = starred.metadata?.keywords
        if (Array.isArray(km)) keywords = km.map((k: any) => String(k))
        else if (typeof km === 'string') keywords = JSON.parse(km)
      } catch (e) {
        try { if (starred.metadata && typeof starred.metadata === 'string') { const m = JSON.parse(starred.metadata); if (Array.isArray(m.keywords)) keywords = m.keywords } } catch (ee) { /* noop */ }
      }

      if (!keywords || keywords.length === 0) {
        setJobRoleMatch(0)
        return
      }

      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
      const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const wordBoundaryMatch = (phrase: string, text: string) => {
        const p = phrase.trim()
        if (!p) return false
        const re = new RegExp('\\b' + escapeRegExp(p) + '\\b', 'i')
        if (re.test(text)) return true
        const parts = p.split(/\s+/).filter(Boolean)
        return parts.every(part => {
          const re2 = new RegExp('\\b' + escapeRegExp(part) + '\\b', 'i')
          return re2.test(text)
        })
      }

      const matched: string[] = []
      const missing: string[] = []
      const resumeLower = resumeText
      for (const kw of keywords) {
        const k = normalize(String(kw))
        if (!k) continue
        if (wordBoundaryMatch(k, resumeLower)) { matched.push(kw); continue }
        if (k.endsWith('s')) { const sing = k.slice(0, -1); if (wordBoundaryMatch(sing, resumeLower)) { matched.push(kw); continue } }
        missing.push(kw)
      }

      const score = keywords.length > 0 ? Math.round((matched.length / keywords.length) * 100) : 0
      setJobRoleMatch(score)
      try { localStorage.setItem('jobRoleMatch', String(score)) } catch (e) { }
    } catch (e) {
      console.warn('Failed to compute job role match', e)
      setJobRoleMatch(0)
    }
  }

  // recomputeResumeCompletion is defined above and hoisted; calling that implementation here when needed


  const formatDateTime = (scheduledDate: number) => {
    const dateObj = new Date(scheduledDate * 1000)

    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    let dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    if (dateObj.toDateString() === today.toDateString()) {
      dateStr = 'Today'
    } else if (dateObj.toDateString() === tomorrow.toDateString()) {
      dateStr = 'Tomorrow'
    }

    const hour = dateObj.getHours()
    const minutes = dateObj.getMinutes()
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    const displayMinutes = minutes.toString().padStart(2, '0')

    return `${dateStr}, ${displayHour}:${displayMinutes} ${ampm}`
  }

  const cancelInterview = (id: number) => {
    deleteInterviewMutation.mutate(id, {
      onSuccess: () => {
        setInterviewToCancel(null)
      }
    })
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='bg-blue-600 dark:bg-blue-800 shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <h1 className='text-2xl font-bold text-white'>AI Resume & Interview Trainer</h1>
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

      <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
        <div className='px-4 py-6 sm:px-0'>
          <div className='mb-8'>
            <h2 className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>Welcome back!</h2>
            <p className='text-gray-600 dark:text-gray-400'>
              You have {scheduledInterviews.length} scheduled interview{scheduledInterviews.length !== 1 ? 's' : ''}
              {' '}
              and 0 tasks to complete this week.
            </p>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8'>
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700'>
              <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
                <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>Your Progress</h3>
              </div>
              <div className='px-6 py-4 space-y-6'>
                <div>
                  <div className='flex justify-between items-center mb-2'>
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Resume Completion</span>
                    <span className='text-sm font-medium text-gray-900 dark:text-white'>{resumeCompletion}%</span>
                  </div>
                  <div className='w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3'>
                    <div
                      className='bg-blue-600 dark:bg-blue-500 h-3 rounded-full'
                      style={{ width: `${resumeCompletion}%` }}
                    >
                    </div>
                  </div>
                </div>
                <div>
                  <div className='flex justify-between items-center mb-2'>
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Interview Practice</span>
                    <span className='text-sm font-medium text-gray-900 dark:text-white'>0%</span>
                  </div>
                  <div className='w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3'>
                    <div className='bg-blue-600 dark:bg-blue-500 h-3 rounded-full' style={{ width: '0%' }}></div>
                  </div>
                </div>
                <div>
                  <div className='flex justify-between items-center mb-2'>
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                      Job Application Readiness
                    </span>
                    <span className='text-sm font-medium text-gray-900 dark:text-white'>0%</span>
                  </div>
                  <div className='w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3'>
                    <div className='bg-blue-600 dark:bg-blue-500 h-3 rounded-full' style={{ width: '0%' }}></div>
                  </div>
                </div>
                <div>
                  <div className='flex justify-between items-center mb-2'>
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                      Job Role Match
                    </span>
                    <span className='text-sm font-medium text-gray-900 dark:text-white'>{jobRoleMatch}%</span>
                  </div>
                  <div className='w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3'>
                    <div className='bg-blue-600 dark:bg-blue-500 h-3 rounded-full' style={{ width: `${jobRoleMatch}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className='bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700'>
              <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
                <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>Upcoming Mock Interviews</h3>
              </div>
              <div className='px-6 py-4'>
                {interviewsLoading
                  ? (
                    <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
                      <p>Loading interviews...</p>
                    </div>
                  )
                  : scheduledInterviews.length > 0
                    ? (
                      <>
                        {scheduledInterviews.map((interview) => (
                          <div key={interview.id} className='bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4'>
                            <div className='flex items-center justify-between'>
                              <div className='flex items-center space-x-3 flex-1'>
                                <div className='w-1 h-12 bg-blue-500 dark:bg-blue-400 rounded'></div>
                                <div>
                                  <h4 className='font-semibold text-gray-900 dark:text-white'>{interview.title}</h4>
                                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                                    {formatDateTime(interview.scheduled_date)}
                                  </p>
                                </div>
                              </div>
                              <div className='flex items-center space-x-2'>
                                <button
                                  className='ml-3 text-sm bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-00 text-white disabled:opacity-50 disabled:cursor-not-allowed'


                                  onClick={() =>
                                    navigate('/interview')}
                                >
                                  Start
                                </button>
                                <button
                                  className='p-2 bg-white border border-gray-300 text-black hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors'
                                  onClick={() =>
                                    setInterviewToCancel(interview.id)}
                                  aria-label='Cancel interview'
                                >
                                  <X className='w-5 h-5' />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )
                    : (
                      <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
                        <p className='mb-4'>No upcoming interviews scheduled</p>
                      </div>
                    )}
                <button
                  className='w-full border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 bg-transparent py-2 px-4 rounded-md font-medium transition-colors'
                  onClick={() => navigate('/schedule-interview')}
                >
                  + Schedule New Interview
                </button>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700'>
              <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
                <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>Resume Analysis</h3>
              </div>
              <div className='px-6 py-4'>
                <div className='grid grid-cols-3 gap-4'>
                  <div className='text-center bg-gray-50 dark:bg-gray-700 rounded-lg p-4'>
                    <div className='text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1'>{atsScore ?? 0}</div>
                    <div className='text-xs text-gray-500 dark:text-gray-400 mb-1'>/100</div>
                    <div className='text-sm font-medium text-gray-700 dark:text-gray-300'>ATS Score</div>
                  </div>
                  <div className='text-center bg-gray-50 dark:bg-gray-700 rounded-lg p-4'>
                    <div className='text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1'>{keywordMatch ?? 0}</div>
                    <div className='text-xs text-gray-500 dark:text-gray-400 mb-1'>/100</div>
                    <div className='text-sm font-medium text-gray-700 dark:text-gray-300'>Keyword Match</div>
                  </div>
                  <div className='text-center bg-gray-50 dark:bg-gray-700 rounded-lg p-4'>
                    <div className='text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1'>{readabilityScore ?? 0}</div>
                    <div className='text-xs text-gray-500 dark:text-gray-400 mb-1'>/100</div>
                    <div className='text-sm font-medium text-gray-700 dark:text-gray-300'>Readability</div>
                  </div>
                </div>
              </div>
            </div>

            <div className='bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700'>
              <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
                <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>Recent Interview Performance</h3>
              </div>
              <div className='px-6 py-4'>
                <div className='h-48 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center relative'>
                  <div className='absolute top-4 right-4 flex space-x-4 text-xs'>
                    <div className='flex items-center space-x-1'>
                      <div className='w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full'></div>
                      <span className='text-gray-600 dark:text-gray-400'>Content Quality</span>
                    </div>
                    <div className='flex items-center space-x-1'>
                      <div className='w-3 h-3 bg-orange-500 dark:bg-orange-400 rounded-full'></div>
                      <span className='text-gray-600 dark:text-gray-400'>Confidence</span>
                    </div>
                  </div>
                  <div className='text-center text-gray-500 dark:text-gray-400'>
                    <div className='text-sm mb-2'>Performance trending upward</div>
                    <div className='flex justify-between w-full px-8 text-xs text-gray-400 dark:text-gray-500'>
                      <span>Session 1</span>
                      <span>Session 2</span>
                      <span>Session 3</span>
                      <span>Session 4</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {interviewToCancel && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
              Are you sure you want to cancel the interview?
            </h3>
            <div className='flex justify-end space-x-3 mt-6'>
              <button
                className='px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md font-medium transition-colors'
                onClick={() => cancelInterview(interviewToCancel)}
              >
                Yes
              </button>
              <button
                className='px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md font-bold transition-colors'
                onClick={() => setInterviewToCancel(null)}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
