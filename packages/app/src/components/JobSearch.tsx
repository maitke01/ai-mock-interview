import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const JobSearch: React.FC = () => {
  const [query, setQuery] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [resumeSuggestion, setResumeSuggestion] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSearch = () => {
    window.open(`https://www.indeed.com/jobs?q=${encodeURIComponent(query)}`, '_blank')
  }

  const handleExtractKeywords = async () => {
    if (!jobDescription.trim()) return;
    setLoading(true);
    try {
      // Replace with your actual AI endpoint
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center py-10">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 w-full max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white text-center">Job Search</h1>
        <form className="space-y-4 text-left max-w-lg mx-auto" onSubmit={e => { e.preventDefault(); handleSearch(); }}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search Query</label>
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
  )
}

export default JobSearch
