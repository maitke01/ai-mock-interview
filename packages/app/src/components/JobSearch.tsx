import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const JobSearch: React.FC = () => {
  const [query, setQuery] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [resumeSuggestion, setResumeSuggestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedResume, setSelectedResume] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('selectedResume')
      if (raw) setSelectedResume(JSON.parse(raw))
    } catch (err) {
      console.warn('Failed to parse selectedResume from sessionStorage', err)
    }
  }, [])

  const handleSearch = () => {
    window.open(`https://www.indeed.com/jobs?q=${encodeURIComponent(query)}`, '_blank')
  }

  const handleExtractKeywords = async () => {
    if (!jobDescription.trim()) return;
    setLoading(true);
    try {
      //AI called for keyword extraction 
      const response = await fetch('/api/extract-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription })
      });
      const data = await response.json();
      setKeywords(data.keywords || []);
      setResumeSuggestion(data.resumeSuggestion || '');
    } catch (err) {
      setKeywords([]);
      setResumeSuggestion('Error extracting keywords.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: job search UI - span 2 on large screens */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 w-full">
              <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Job Search</h1>
              <form className="space-y-4 text-left" onSubmit={e => { e.preventDefault(); handleSearch(); }}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Type Entry: </label>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for jobs (e.g. Software Engineer)"
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors w-full"
          >
            Search on Indeed
          </button>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paste Job Description</label>
            <textarea
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              rows={5}
            />
          </div>
          <button
            type="button"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-colors w-full"
            onClick={handleExtractKeywords}
            disabled={loading}
          >
            {loading ? 'Extracting...' : 'Extract Keywords & Suggest Resume Edit'}
          </button>
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
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">AI Resume Suggestion:</h4>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded p-3 text-sm text-green-900 dark:text-green-100">
                {resumeSuggestion}
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

          {/* Right column: resume panel (popup-like) */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 h-full min-h-[200px]">
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
                <div className="border border-gray-200 dark:border-gray-700 rounded p-3 max-h-[60vh] overflow-y-auto text-sm bg-gray-50 dark:bg-gray-900">
                  {!selectedResume && (
                    <div className="text-xs text-gray-500">No resume selected. Pick a resume in the Resume Builder and click Job Search.</div>
                  )}
                  {selectedResume && (
                    <div className="space-y-3">
                      <div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">{selectedResume.fileName}</div>
                        {selectedResume.optimized && (
                          <div className="mt-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded p-2 text-sm text-green-900 dark:text-green-100">{selectedResume.optimized}</div>
                        )}
                      </div>
                      {selectedResume.text && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Extracted Text</h4>
                          <pre className="whitespace-pre-wrap text-xs text-gray-900 dark:text-gray-100">{selectedResume.text}</pre>
                        </div>
                      )}
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
    </div>
  )
}

export default JobSearch
