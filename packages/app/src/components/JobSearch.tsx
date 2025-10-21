import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import EditableTemplateEditor from './EditableTemplateEditor'
import type { SelectedResume, ResumeSuggestion } from '../types/resume'

const JobSearch: React.FC = () => {
  const [query, setQuery] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [resumeSuggestion, setResumeSuggestion] = useState('')
  // loadingAction indicates which action is running: 'extract' | 'analyze' | null
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [selectedResume, setSelectedResume] = useState<SelectedResume | null>(null)
  const [skillGapResult, setSkillGapResult] = useState<null | { total: number; matched: string[]; missing: string[]; score: number }>(null)
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
    if (!jobDescription.trim()) return;
    if (loadingAction) return; // prevent concurrent actions
    setLoadingAction('extract')
    try {
      //AI called for keyword extraction 
      const response = await fetch('/api/extract-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription })
      });
      const data = await response.json() as ResumeSuggestion;
      setKeywords(data.keywords || []);
      setResumeSuggestion(data.resumeSuggestion || '');
    } catch (err) {
      setKeywords([]);
      setResumeSuggestion('Error extracting keywords.');
    } finally {
      setLoadingAction(null)
    }
  }

  const handleSaveEditedResume = (updated: SelectedResume) => {
    setSelectedResume(updated)
    try {
      sessionStorage.setItem('selectedResume', JSON.stringify(updated))
    } catch (e) {
      console.warn('Failed to persist selectedResume', e)
    }
  }

  const normalize = (s: string) => s.replace(/[^a-z0-9\s]/g, ' ').toLowerCase()

  const handleAnalyzeSkillGap = async () => {
    if (!selectedResume) return alert('No resume selected. Please select a resume to analyze.')
    if (!jobDescription.trim()) return alert('Please paste a job description to analyze against.')
    if (loadingAction) return

    setLoadingAction('analyze')
    let kws = keywords
    try {
      if (!kws || kws.length === 0) {
        const response = await fetch('/api/extract-keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobDescription })
        })
        const data = await response.json() as ResumeSuggestion
        kws = data.keywords || []
        setKeywords(kws)
        setResumeSuggestion(data.resumeSuggestion || '')
      }

      const resumeText = normalize(String(selectedResume.text || ''))
      if (!resumeText.trim()) {
        return alert('Selected resume has no extracted text to analyze. Open the resume in the Resume Builder and extract text first.')
      }

      const matched: string[] = []
      const missing: string[] = []

      for (const kw of kws) {
        const n = normalize(kw)
        if (!n) continue
        const tokens = n.split(/\s+/).filter(Boolean)
        const found = tokens.every(t => resumeText.indexOf(t) !== -1)
        if (found) matched.push(kw)
        else missing.push(kw)
      }

      const total = kws.length || (matched.length + missing.length)
      const score = total > 0 ? Math.round((matched.length / total) * 100) : 0
      setSkillGapResult({ total, matched, missing, score })
  try { (window as any).updateKeywordMatch?.(score) } catch (e) { /* ignore */ }
    } catch (err) {
      console.error('Skill gap analysis failed', err)
      alert('Failed to analyze skill gap. Try again.')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div>
          {/* Job search card on top */}
          <div>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 w-full">
              <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Job Search</h1>
              <form className="space-y-4 text-left" onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Type Entry</label>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for jobs (e.g. Software Engineer)"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    required
                  />
                </div>

                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors w-full">Search on Indeed</button>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paste Job Description</label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here..."
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    rows={5}
                    aria-label="Job description to extract keywords from"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-colors w-full"
                    onClick={handleExtractKeywords}
                    disabled={!!loadingAction}
                    aria-busy={loadingAction === 'extract'}
                    aria-disabled={!!loadingAction}
                  >
                    {loadingAction === 'extract' ? 'Extracting...' : 'Extract Keywords & Suggest Resume Edit'}
                  </button>

                  <button
                    type="button"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md font-medium transition-colors w-full"
                    onClick={handleAnalyzeSkillGap}
                    disabled={!!loadingAction}
                  >
                    {loadingAction === 'analyze' ? 'Analyzing...' : 'Analyze Skill Gap against Selected Resume'}
                  </button>
                </div>

                {keywords.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Extracted Keywords:</h4>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((kw, idx) => (
                        <span key={idx} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}

                {resumeSuggestion && (
                  <div className="mt-4" aria-live="polite" role="status">
                    <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">AI Resume Suggestion</h4>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded p-3 text-sm text-green-900 dark:text-green-100">
                      {resumeSuggestion}
                    </div>
                  </div>
                )}

                {skillGapResult && (
                  <div className="mt-4 border rounded p-3 bg-white dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Skill Gap Analysis</h4>
                      <div className="text-xs text-gray-500">Match score: <span className="font-medium">{skillGapResult.score}%</span></div>
                    </div>
                    <div className="mt-2 text-sm">
                      <div className="mb-2">
                        <div className="font-semibold">Matched Skills</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {skillGapResult.matched.length > 0 ? skillGapResult.matched.map((m, i) => (
                            <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">{m}</span>
                          )) : <div className="text-xs text-gray-500">No matched skills found.</div>}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold">Missing Skills</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {skillGapResult.missing.length > 0 ? skillGapResult.missing.map((m, i) => (
                            <span key={i} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">{m}</span>
                          )) : <div className="text-xs text-gray-500">No missing skills detected.</div>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className="text-sm px-3 py-1 bg-blue-600 text-white rounded" onClick={() => {
                        if (skillGapResult.missing.length === 0) return
                        navigator.clipboard.writeText(skillGapResult.missing.join(', '))
                      }}>Copy Missing Skills</button>
                      <button className="text-sm px-3 py-1 bg-gray-200 text-gray-800 rounded" onClick={() => setSkillGapResult(null)}>Dismiss</button>
                    </div>
                  </div>
                )}
                
                <button
                  type="button"
                  className="text-blue-600 dark:text-blue-400 underline w-full mt-2"
                  onClick={() => navigate('/dashboard')}
                >
                  Back to Dashboard
                </button>
              </form>
            </div>
          </div>

          {/* Full-width resume/template panel below */}
          <div className="mt-8">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 w-full">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Selected Resume</h2>
                <button
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300"
                  onClick={() => {
                    sessionStorage.removeItem('selectedResume')
                    setSelectedResume(null)
                  }}
                >
                  Close
                </button>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded p-3 overflow-y-auto text-sm bg-gray-50 dark:bg-gray-900">
                {!selectedResume && (
                  <div className="text-xs text-gray-500">No resume selected. Pick a resume in the Resume Builder and click Job Search.</div>
                )}
                {selectedResume && (
                  <div className="space-y-3">
                    <div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">{selectedResume.fileName}</div>
                      {selectedResume.optimized && (
                        <div className="mt-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded p-2 text-sm text-green-900 dark:text-green-100">{String(selectedResume.optimized)}</div>
                      )}
                    </div>
                    <EditableTemplateEditor resume={selectedResume} suggestion={resumeSuggestion} onSave={handleSaveEditedResume} />
                    {selectedResume.images && selectedResume.images.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Images</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedResume.images.map((src: string, idx: number) => (
                            <img key={idx} src={src} alt={`resume-img-${idx}`} className="h-20 w-auto border rounded" />
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
