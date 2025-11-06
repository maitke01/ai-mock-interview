import React, { useEffect, useState } from 'react'
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

  const handleAnalyzeSkillGap = () => {
    if (!selectedResume) return alert('No resume selected. Pick a resume in the Resume Builder and click Job Search.')
    if (!keywords || keywords.length === 0) return alert('No keywords extracted. Please extract keywords first.')

    const resumeTextSource = selectedResume.text
      ?? (typeof selectedResume.optimized === 'string' ? selectedResume.optimized : '')
    const resumeText = String(resumeTextSource).toLowerCase()
    const matched: string[] = []
    const missing: string[] = []

    for (const kw of keywords) {
      const k = kw.toLowerCase()
      if (!k) continue
      if (resumeText.includes(k)) matched.push(kw)
      else missing.push(kw)
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
                  className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors w-full'
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
                  className='bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-colors w-full'
                  onClick={handleExtractKeywords}
                  disabled={loading}
                >
                  {loading ? 'Extracting...' : 'Extract Keywords & Suggest Resume Edit'}
                </button>
                <button
                  type='button'
                  className='mt-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-md font-medium transition-colors w-full border-2 border-transparent'
                  onClick={handleAnalyzeSkillGap}
                  disabled={!selectedResume || keywords.length === 0}
                >
                  Analyze Skill Gap against Selected Resume
                </button>
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
                  className='text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300'
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
