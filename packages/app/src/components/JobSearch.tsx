import React, { useEffect, useState } from 'react'
import { usePreferences } from '../hooks/usePreferences'
import { useNavigate } from 'react-router-dom'
import type { ResumeSuggestion, SelectedResume } from '../types/resume'
import EditableTemplateEditor from './EditableTemplateEditor.tsx'

const JobSearch: React.FC = () => {
  const [query, setQuery] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [resumeSuggestion, setResumeSuggestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedResume, setSelectedResume] = useState<SelectedResume | null>(null)
  const [analysisScore, setAnalysisScore] = useState<number | null>(null)
  const [matchedSkillsState, setMatchedSkillsState] = useState<string[]>([])
  const [missingSkillsState, setMissingSkillsState] = useState<string[]>([])
  const [showAnalysis, setShowAnalysis] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('selectedResume')
      if (raw) setSelectedResume(JSON.parse(raw) as SelectedResume)
    } catch (err) {
      console.warn('Failed to parse selectedResume from sessionStorage', err)
    }
  }, [])

  const handleSearch = () => {
    window.open(`https://www.indeed.com/jobs?q=${encodeURIComponent(query)}`, '_blank')
  }

  const handleExtractKeywords = async () => {
    if (!jobDescription.trim()) return
    setLoading(true)
    try {
      // AI called for keyword extraction
      const response = await fetch('/api/extract-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription })
      })
      const data = await response.json() as ResumeSuggestion
      setKeywords(data.keywords || [])
      setResumeSuggestion(data.resumeSuggestion || '')
    } catch {
      setKeywords([])
      setResumeSuggestion('Error extracting keywords.')
    }
    setLoading(false)
  }

  const { savePreference, deletePreference, listPreferences, loading: prefLoading, error: prefError } = usePreferences()
  const [savedPreferences, setSavedPreferences] = useState<Array<any>>([])
  const [selectedPrefId, setSelectedPrefId] = useState<string | null>(null)

  // Load saved preferences on mount and when preferencesUpdated event fires
  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        // show any locally-pending preferences immediately so UI doesn't appear empty
        const pendingKey = 'pendingJobPreferences'
        let pending: any[] = []
        try {
          const raw = localStorage.getItem(pendingKey)
          if (raw) pending = JSON.parse(raw || '[]') as any[]
        } catch (e) {
          console.warn('Failed to parse pendingJobPreferences', e)
        }
        if (mounted && pending.length > 0) {
          console.debug('[JobSearch] load: showing pending items', pending)
          setSavedPreferences(pending)
        }

        // Now fetch server preferences and merge them with pending (pending first)
        const res = await listPreferences()
        if (!mounted) return
        if (res && res.success) {
          const server = res.results || []
          console.debug('[JobSearch] load: server results', server)
          const merged = [...pending, ...server.filter((s: any) => !pending.some((p) => String(p.id) === String(s.id)))]
          console.debug('[JobSearch] load: merged list', merged)
          setSavedPreferences(merged)
        } else {
          // server failed or returned nothing - keep pending (already set above)
          if (mounted && (!pending || pending.length === 0)) setSavedPreferences([])
        }
      } catch (e) {
        console.warn('Failed to load saved preferences', e)
      }
    }
    load()
    // restore selected pref id from localStorage if user had one selected
    try {
      const sel = localStorage.getItem('selectedJobPrefId')
      if (sel) setSelectedPrefId(sel)
    } catch (e) {
      // ignore
    }
    const handler = () => { load() }
    window.addEventListener('preferencesUpdated', handler)
    return () => {
      mounted = false
      window.removeEventListener('preferencesUpdated', handler)
    }
    // listPreferences is intentionally omitted from deps to avoid re-running
    // this effect on every render (the hook returns a new function instance
    // each render). We only want to load once on mount and when the
    // 'preferencesUpdated' event is dispatched.
  }, [])

  const handleDeletePreference = async (p: any) => {
    console.debug('[JobSearch] handleDeletePreference called for', p && p.id)
    if (!p || !p.id) return
    // If this is a locally-pending preference (dev fallback), remove locally
    // remove any matching pending entry regardless of id prefix
    try {
      const key = 'pendingJobPreferences'
      const raw = localStorage.getItem(key)
      if (raw) {
        const arr = JSON.parse(raw || '[]') as any[]
        const filtered = arr.filter((it) => String(it.id) !== String(p.id))
        if (filtered.length) localStorage.setItem(key, JSON.stringify(filtered))
        else localStorage.removeItem(key)
      }
    } catch (e) {
      console.warn('Failed to remove pending pref from localStorage', e)
    }

    if (String(p.id).startsWith('local-')) {
      try {
        const key = 'pendingJobPreferences'
        const raw = localStorage.getItem(key)
        if (raw) {
          const arr = JSON.parse(raw || '[]') as any[]
          const filtered = arr.filter((it) => it.id !== p.id)
          if (filtered.length) localStorage.setItem(key, JSON.stringify(filtered))
          else localStorage.removeItem(key)
        }
      } catch (e) {
        console.warn('Failed to remove local pending pref', e)
      }
      setSavedPreferences((prev) => (prev || []).filter((it) => it.id !== p.id))
      if (selectedPrefId === p.id) {
        setSelectedPrefId(null)
        try { localStorage.removeItem('selectedJobPrefId') } catch { }
      }
      return
    }

    try {
      const res = await deletePreference(p.id)
      if (res && res.success) {
        setSavedPreferences((prev) => (prev || []).filter((it) => it.id !== p.id))
        if (selectedPrefId === p.id) {
          setSelectedPrefId(null)
          try { localStorage.removeItem('selectedJobPrefId') } catch { }
        }
        try { window.dispatchEvent(new CustomEvent('preferencesUpdated')) } catch { }
      } else {
        console.warn('deletePreference failed', res)
        alert('Failed to delete preference')
      }
    } catch (e) {
      console.error('Delete preference error', e)
      alert('Failed to delete preference')
    }
  }

  const handleToggleFavorite = async (p: any) => {
    if (!p || !p.id) return
    const newMeta = { ...(p.metadata || {}), favorite: !(p.metadata && p.metadata.favorite) }
    // optimistic update
    setSavedPreferences((prev) => {
      const updated = (prev || []).map((it) => (it.id === p.id ? { ...it, metadata: newMeta } : it))
      console.debug('[JobSearch] handleToggleFavorite: optimistic updated list', updated)
      return updated
    })

    // update local pending storage for local prefs
    try {
      console.debug('[JobSearch] handleToggleFavorite: updating pending for', p.id, 'newMeta=', newMeta)
      const key = 'pendingJobPreferences'
      const raw = localStorage.getItem(key)
      const arr = raw ? (JSON.parse(raw) as any[]) : []
      const idx = arr.findIndex((it) => String(it.id) === String(p.id))
      if (idx !== -1) {
        arr[idx].metadata = { ...(arr[idx].metadata || {}), ...newMeta }
      } else {
        // add a pending entry so the toggled state persists until server confirms
        const newPending = { id: p.id, userId: p.userId ?? 'public', name: p.name ?? null, text: p.text ?? null, metadata: newMeta, createdAt: Date.now() }
        arr.unshift(newPending)
      }
      localStorage.setItem(key, JSON.stringify(arr))
      console.debug('[JobSearch] handleToggleFavorite: pending now', arr)
    } catch (e) {
      console.warn('Failed to update pending preferences for favorite toggle', e)
    }

    // persist favorite via upsert (include id and full text). If the server confirms
    // the upsert (not savedLocally), remove the pending entry.
    try {
      const res = await savePreference({ id: p.id, userId: p.userId, name: p.name, text: p.text, metadata: newMeta })
      // if saved to server (not savedLocally), remove from pending
      try {
        const key = 'pendingJobPreferences'
        if (res && res.success && !(res.data && res.data.savedLocally === true)) {
          const raw = localStorage.getItem(key)
          if (raw) {
            const arr = JSON.parse(raw) as any[]
            const filtered = arr.filter((it) => String(it.id) !== String(p.id))
            if (filtered.length) {
              localStorage.setItem(key, JSON.stringify(filtered))
              console.debug('[JobSearch] handleToggleFavorite: removed pending entry after server save, remaining', filtered)
            } else {
              localStorage.removeItem(key)
              console.debug('[JobSearch] handleToggleFavorite: removed pending entry after server save, no remaining')
            }
          }
        }
      } catch (e) {
        console.warn('Failed to cleanup pending preferences after save', e)
      }
      try { window.dispatchEvent(new CustomEvent('preferencesUpdated')) } catch { }
    } catch (e) {
      console.warn('Failed to persist favorite toggle', e)
    }
  }

  const handleSavePreference = async () => {
    if (!jobDescription || !jobDescription.trim()) return alert('Paste a job description first')
    try {
      const metadata = { keywords }
      const name = (jobDescription.split('\n')[0] || 'saved-job').slice(0, 80)
      const res = await savePreference({ userId: undefined, name, text: jobDescription, metadata })
      if (res && res.success) {
        const savedLocally = res?.data?.savedLocally === true
        if (savedLocally) {
          alert('Job preference saved locally (dev DB unavailable). It will be synced when the server is reachable.')
          // optimistic UI: add the locally-saved preference to the list immediately
          try {
            const newPref = {
              id: res?.data?.id || ('local-' + Math.random().toString(36).slice(2, 9)),
              userId: 'public',
              name,
              text: jobDescription,
              metadata,
              createdAt: Date.now()
            }
            setSavedPreferences((prev) => [newPref, ...(prev || [])])
            // persist pending so it survives navigation
            try {
              const key = 'pendingJobPreferences'
              const raw = localStorage.getItem(key)
              const arr = raw ? JSON.parse(raw) as any[] : []
              arr.unshift(newPref)
              localStorage.setItem(key, JSON.stringify(arr))
            } catch (e) {
              console.warn('Failed to persist pending preference', e)
            }
            setSelectedPrefId(newPref.id)
            try { localStorage.setItem('selectedJobPrefId', String(newPref.id)) } catch { }
          } catch (e) {
            console.warn('Failed to optimistic-insert local pref', e)
          }
        } else {
          alert('Job preference saved')
          // optimistic UI: insert the new preference immediately so the user sees it
          try {
            const newPref = {
              id: res?.data?.id || ('temp-' + Math.random().toString(36).slice(2, 9)),
              userId: undefined,
              name,
              text: jobDescription,
              metadata,
              createdAt: Date.now()
            }
            setSavedPreferences((prev) => [newPref, ...(prev || [])])
            // also persist optimistic pref so it remains visible until server list includes it
            try {
              const key = 'pendingJobPreferences'
              const rawExisting = localStorage.getItem(key)
              const arrExisting = rawExisting ? JSON.parse(rawExisting) as any[] : []
              arrExisting.unshift(newPref)
              localStorage.setItem(key, JSON.stringify(arrExisting))
            } catch (e) {
              console.warn('Failed to persist optimistic pending pref', e)
            }
            setSelectedPrefId(newPref.id)
            try { localStorage.setItem('selectedJobPrefId', String(newPref.id)) } catch { }
          } catch (e) {
            console.warn('Failed to optimistic-insert pref', e)
          }
          // notify other parts of the app that preferences changed
          try {
            window.dispatchEvent(new CustomEvent('preferencesUpdated', { detail: { id: res?.data?.id || null } }))
          } catch (e) {
            // ignore
          }
        }
      } else {
        console.warn('Save preference failed', res)
        const details = res?.error?.details || res?.error?.error || res?.error || res?.status || 'Unknown error'
        alert('Failed to save preference: ' + (typeof details === 'string' ? details : JSON.stringify(details)))
      }
    } catch (e) {
      console.error('Save preference error', e)
      alert('Failed to save preference')
    }
  }

  const handleAnalyzeSkillGap = () => {
    if (!selectedResume) return alert('No resume selected. Pick a resume in the Resume Builder and click Job Search.')
    if (!keywords || keywords.length === 0) return alert('No keywords extracted. Please extract keywords first.')
    const resumeTextSource = selectedResume.text
      ?? (typeof selectedResume.optimized === 'string' ? selectedResume.optimized : '')
    const resumeText = String(resumeTextSource).toLowerCase()
    const matched: string[] = []
    const missing: string[] = []

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const wordBoundaryMatch = (phrase: string, text: string) => {
      const p = phrase.trim()
      if (!p) return false
      // exact phrase with word boundaries
      const re = new RegExp('\\b' + escapeRegExp(p) + '\\b', 'i')
      if (re.test(text)) return true
      // otherwise check that all words in phrase appear somewhere in text (order-insensitive)
      const parts = p.split(/\s+/).filter(Boolean)
      return parts.every(part => {
        const re2 = new RegExp('\\b' + escapeRegExp(part) + '\\b', 'i')
        return re2.test(text)
      })
    }

    for (const kw of keywords) {
      const k = normalize(String(kw))
      if (!k) continue
      // check phrase match first
      if (wordBoundaryMatch(k, resumeText)) {
        matched.push(kw)
        continue
      }
      // try simple singular/plural normalization: check without trailing 's'
      if (k.endsWith('s')) {
        const sing = k.slice(0, -1)
        if (wordBoundaryMatch(sing, resumeText)) {
          matched.push(kw)
          continue
        }
      }
      missing.push(kw)
    }

    const score = keywords.length > 0 ? Math.round((matched.length / keywords.length) * 100) : 0

    try {
      localStorage.setItem('keywordMatch', String(score))
      localStorage.setItem('matchedSkills', JSON.stringify(matched))
      localStorage.setItem('missingSkills', JSON.stringify(missing))
    } catch (e) {
      console.warn('Failed to persist skill gap results', e)
    }

    // Notify dashboard (and other listeners) that keyword match changed so resume completion can update
    try {
      window.dispatchEvent(new CustomEvent('resumeScoresUpdated', { detail: { keywordMatch: score } }))
    } catch (e) {
      console.warn('Failed to dispatch resumeScoresUpdated from JobSearch', e)
    }

    // show results inline instead of navigating away
    setMatchedSkillsState(matched)
    setMissingSkillsState(missing)
    setAnalysisScore(score)
    setShowAnalysis(true)
  }

  const handleSaveEditedResume = (updated: SelectedResume) => {
    setSelectedResume(updated)
    try {
      sessionStorage.setItem('selectedResume', JSON.stringify(updated))
    } catch (e) {
      console.warn('Failed to persist selectedResume', e)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div>
          {/* Job search card on top */}
          <div>
            <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-8 w-full'>
              <h1 className='text-3xl font-bold mb-6 text-gray-900 dark:text-white'>Job Search</h1>
              <form
                className='space-y-4 text-left'
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSearch()
                }}
              >
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Job Type Entry:
                  </label>
                  <input
                    type='text'
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder='Search for jobs (e.g. Software Engineer)'
                    className='w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'
                    required
                  />
                </div>
                <button
                  type='submit'
                  className='mt-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-2 rounded-md font-medium transition-colors w-full border-2 border-transparent'
                >
                  Search on Indeed
                </button>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Paste Job Description
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder='Paste the job description here...'
                    className='w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'
                    rows={5}
                  />
                </div>
                <button
                  type='button'
                  className='mt-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-2 rounded-md font-medium transition-colors w-full'
                  onClick={handleExtractKeywords}
                  disabled={loading}
                >
                  {loading ? 'Extracting...' : 'Extract Keywords & Suggest Resume Edit'}
                </button>
                <button
                  type='button'
                  className='mt-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-md font-medium transition-colors w-full border-2 border-transparent'
                  onClick={handleSavePreference}
                  disabled={loading || prefLoading}
                >
                  {prefLoading ? 'Saving...' : 'Save Job Preference'}
                </button>
                <button
                  type='button'
                  className='mt-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-2 rounded-md font-medium transition-colors w-full border-2 border-transparent'
                  onClick={handleAnalyzeSkillGap}
                  disabled={!selectedResume || keywords.length === 0}
                >
                  Analyze Skill Gap against Selected Resume
                </button>
                {/* Saved preferences panel - always visible so users can discover saved items */}
                <div className='mt-4'>
                  <h4 className='text-sm font-semibold text-gray-900 dark:text-white mb-2'>Saved Job Preferences</h4>
                  <div className='flex flex-col gap-2'>
                    {prefLoading ? (
                      <div className='text-xs text-gray-500'>Loading saved preferences...</div>
                    ) : savedPreferences && savedPreferences.length > 0 ? (
                      savedPreferences.map((p: any) => (
                        <div key={p.id} className='flex items-center justify-between bg-gray-50 dark:bg-gray-900/10 border border-gray-200 dark:border-gray-700 rounded p-2'>
                          <div className='text-sm'>
                            <div className='font-medium text-gray-800 dark:text-gray-200'>{p.name || 'saved-job'}</div>
                            <div className='text-xs text-gray-500 truncate max-w-xl'>{p.text ? String(p.text).slice(0, 200) : ''}</div>
                            {p.createdAt && (
                              <div className='text-xs text-gray-400 mt-1'>Saved {new Date(p.createdAt).toLocaleString()}</div>
                            )}
                          </div>
                          <div className='flex items-center gap-2'>
                            <button
                              type='button'
                              title={p.metadata && p.metadata.favorite ? 'Unstar preference' : 'Star preference'}
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleToggleFavorite(p) }}
                              className={`px-3 py-1 rounded text-sm ${p.metadata && p.metadata.favorite ? 'bg-yellow-400 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
                            >
                              {p.metadata && p.metadata.favorite ? '★' : '☆'}
                            </button>

                            <button
                              type='button'
                              className='px-3 py-1 bg-blue-600 text-white rounded text-sm'
                              onClick={(e) => {
                                e.stopPropagation();
                                setJobDescription(p.text || '')
                                try { setKeywords(Array.isArray(p.metadata?.keywords) ? p.metadata.keywords : []) } catch { setKeywords([]) }
                                setSelectedPrefId(p.id)
                                try { localStorage.setItem('selectedJobPrefId', String(p.id)) } catch { }
                              }}
                            >
                              Load
                            </button>

                            <button
                              type='button'
                              title='Delete preference'
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!confirm('Delete this saved job preference? This cannot be undone.')) return
                                console.debug('[JobSearch] Delete button clicked for', p.id)
                                handleDeletePreference(p)
                              }}
                              className='px-3 py-1 bg-red-600 text-white rounded text-sm'
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='text-xs text-gray-500'>No saved job preferences yet. Save a job description to see it here.</div>
                    )}
                  </div>
                </div>
                {keywords.length > 0 && (
                  <div className='mt-4'>
                    <h4 className='text-sm font-semibold text-gray-900 dark:text-white mb-2'>Extracted Keywords:</h4>
                    <div className='flex flex-wrap gap-2'>
                      {keywords.map((kw, idx) => (
                        <span
                          key={idx}
                          className='bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs'
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {resumeSuggestion && (
                  <div className='mt-4'>
                    <h4 className='text-sm font-semibold text-green-700 dark:text-green-400 mb-2'>
                      AI Resume Suggestion:
                    </h4>
                    <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded p-3 text-sm text-green-900 dark:text-green-100'>
                      {resumeSuggestion}
                    </div>
                  </div>
                )}
                {/* Skill Gap Analysis panel - shown after Analyze is clicked */}
                {showAnalysis && (
                  <div className='mt-6 p-4 bg-gray-800/50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg'>
                    <div className='flex items-start justify-between'>
                      <div>
                        <h4 className='text-sm font-semibold text-green-600 dark:text-green-300'>Skill Gap Analysis</h4>
                        <p className='text-xs text-gray-300 mt-1'>Matched Skills</p>
                        <div className='flex flex-wrap gap-2 mt-2'>
                          {matchedSkillsState.length === 0 ? <span className='text-xs text-gray-300'>None</span> : (
                            matchedSkillsState.map((m, i) => (
                              <span
                                key={i}
                                className='bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs'
                              >
                                {m}
                              </span>
                            ))
                          )}
                        </div>
                        <p className='text-xs text-gray-300 mt-3'>Missing Skills</p>
                        <div className='flex flex-wrap gap-2 mt-2'>
                          {missingSkillsState.length === 0 ? <span className='text-xs text-gray-300'>None</span> : (
                            missingSkillsState.map((m, i) => (
                              <span
                                key={i}
                                className='bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded text-xs'
                              >
                                {m}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='text-sm font-semibold text-gray-100'>Match score</div>
                        <div className='text-2xl font-bold text-blue-400 mt-1'>{analysisScore ?? 0}%</div>
                        <div className='mt-4 flex flex-col gap-2'>
                          <button
                            onClick={async () => {
                              try {
                                const text = missingSkillsState.join(', ')
                                if (navigator.clipboard && text) await navigator.clipboard.writeText(text)
                                alert('Missing skills copied to clipboard')
                              } catch (e) {
                                console.warn('Copy failed', e)
                                alert('Failed to copy')
                              }
                            }}
                            className='px-3 py-1 bg-blue-600 text-white rounded text-sm'
                          >
                            Copy Missing Skills
                          </button>
                          <button
                            onClick={() => setShowAnalysis(false)}
                            className='px-3 py-1 border border-gray-300 text-gray-200 rounded text-sm'
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <button
                  type='button'
                  className='text-blue-600 dark:text-blue-400 underline w-full mt-2'
                  onClick={() => navigate('/dashboard')}
                >
                  Back to Dashboard
                </button>
              </form>
            </div>
          </div>

          {/* Full-width resume/template panel below */}
          <div className='mt-8'>
            <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6 w-full'>
              <div className='flex items-center justify-between mb-3'>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>Selected Resume</h2>
                <button
                  className='bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white px-3 py-1 rounded-md font-medium transition-colors border-2 border-transparent'
                  onClick={() => {
                    sessionStorage.removeItem('selectedResume')
                    setSelectedResume(null)
                  }}
                >
                  Close
                </button>
              </div>
              <div className='border border-gray-200 dark:border-gray-700 rounded p-3 overflow-y-auto text-sm bg-gray-50 dark:bg-gray-900'>
                {!selectedResume && (
                  <div className='text-xs text-gray-500'>
                    No resume selected. Pick a resume in the Resume Builder and click Job Search.
                  </div>
                )}
                {selectedResume && (
                  <div className='space-y-3'>
                    <div>
                      <div className='font-medium text-gray-800 dark:text-gray-200'>{selectedResume.fileName}</div>
                      {/* Prefer showing the optimized text when available; fall back to the raw text */}
                      {(typeof selectedResume.optimized === 'string' && selectedResume.optimized.trim()) ? (
                        <div className='mt-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded p-2 text-sm text-green-900 dark:text-green-100'>
                          {selectedResume.optimized}
                        </div>
                      ) : selectedResume.text ? (
                        <div className='mt-2 bg-gray-50 dark:bg-gray-900/10 border border-gray-200 dark:border-gray-700 rounded p-2 text-sm text-gray-900 dark:text-gray-100'>
                          {selectedResume.text}
                        </div>
                      ) : null}
                    </div>
                    <EditableTemplateEditor
                      resume={{
                        fileName: selectedResume.fileName,
                        text: selectedResume.text,
                        images: selectedResume.images,
                        // ensure the minimal type expects a string or null for optimized
                        optimized: typeof selectedResume.optimized === 'string' ? selectedResume.optimized : null
                      }}
                      suggestion={resumeSuggestion}
                      onSave={(updated) => {
                        // Convert MinimalSelectedResume back into the full SelectedResume shape
                        const merged: SelectedResume = {
                          fileName: updated.fileName ?? selectedResume.fileName,
                          text: updated.optimized ?? updated.text ?? selectedResume.text,
                          images: updated.images ?? selectedResume.images,
                          optimized: updated.optimized ?? updated.text ?? selectedResume.optimized
                        }
                        handleSaveEditedResume(merged)
                      }}
                    />
                    {selectedResume.images && selectedResume.images.length > 0 && (
                      <div>
                        <h4 className='text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1'>Images</h4>
                        <div className='flex flex-wrap gap-2'>
                          {selectedResume.images.map((src: string, idx: number) => (
                            <img key={idx} src={src} alt={`resume-img-${idx}`} className='h-20 w-auto border rounded' />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JobSearch
