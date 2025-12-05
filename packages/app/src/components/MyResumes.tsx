import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from './Header'

interface SavedResume {
  id: string
  name: string
  type: 'draft' | 'uploaded'
  savedAt: Date
  templateId?: string
  content?: string
}

const MyResumes: React.FC = () => {
  const navigate = useNavigate()
  const [resumes, setResumes] = useState<SavedResume[]>([])
  const [filter, setFilter] = useState<'all' | 'draft' | 'uploaded'>('all')

  useEffect(() => {
    loadResumes()
  }, [])

  const loadResumes = () => {
    const allResumes: SavedResume[] = []

    // Load all drafts from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('resume-draft-')) {
        try {
          const draftData = JSON.parse(localStorage.getItem(key) || '{}')
          const templateId = key.replace('resume-draft-', '')

          allResumes.push({
            id: key,
            name: `Draft - ${templateId}`,
            type: 'draft',
            savedAt: new Date(draftData.savedAt || Date.now()),
            templateId,
            content: draftData.mainContent || ''
          })
        } catch (error) {
          console.error('Error loading draft:', error)
        }
      } else if (key?.startsWith('uploaded-resume-')) {
        try {
          const uploadData = JSON.parse(localStorage.getItem(key) || '{}')

          allResumes.push({
            id: key,
            name: uploadData.name || 'Uploaded Resume',
            type: 'uploaded',
            savedAt: new Date(uploadData.uploadedAt || Date.now()),
            content: uploadData.pdfUrl || ''
          })
        } catch (error) {
          console.error('Error loading uploaded resume:', error)
        }
      }
    }

    // Sort by date (newest first)
    allResumes.sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime())
    setResumes(allResumes)
  }

  const filteredResumes = resumes.filter(resume => {
    if (filter === 'all') return true
    return resume.type === filter
  })

  const handleEditResume = (resume: SavedResume) => {
    // Navigate to resume builder with the template ID or uploaded file
    if (resume.type === 'draft' && resume.templateId) {
      navigate(`/resume?template=${resume.templateId}`)
    } else if (resume.type === 'uploaded') {
      navigate(`/resume?uploaded=${resume.id}`)
    }
  }

  const handleDeleteResume = (resumeId: string) => {
    if (confirm('Are you sure you want to delete this resume?')) {
      localStorage.removeItem(resumeId)
      loadResumes()
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900'>
      <Header title='My Resumes' />

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Filter Tabs */}
        <div className='mb-8'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-3xl font-bold text-gray-900 dark:text-white'>
              All Your Resumes
            </h2>
            <button
              onClick={() => navigate('/resume')}
              className='bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-colors'
            >
              + Create New Resume
            </button>
          </div>

          <div className='flex space-x-4 border-b border-gray-200 dark:border-gray-700'>
            <button
              onClick={() => setFilter('all')}
              className={`pb-3 px-4 font-medium transition-colors ${
                filter === 'all'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              All ({resumes.length})
            </button>
            <button
              onClick={() => setFilter('draft')}
              className={`pb-3 px-4 font-medium transition-colors ${
                filter === 'draft'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Drafts ({resumes.filter(r => r.type === 'draft').length})
            </button>
            <button
              onClick={() => setFilter('uploaded')}
              className={`pb-3 px-4 font-medium transition-colors ${
                filter === 'uploaded'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Uploaded ({resumes.filter(r => r.type === 'uploaded').length})
            </button>
          </div>
        </div>

        {/* Resumes Grid */}
        {filteredResumes.length === 0 ? (
          <div className='text-center py-16'>
            <div className='text-6xl mb-4'>📄</div>
            <h3 className='text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2'>
              No resumes found
            </h3>
            <p className='text-gray-500 dark:text-gray-400 mb-6'>
              {filter === 'all'
                ? 'Create your first resume or upload an existing one to get started'
                : `You don't have any ${filter} resumes yet`}
            </p>
            <button
              onClick={() => navigate('/resume')}
              className='bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-colors'
            >
              Create Resume
            </button>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {filteredResumes.map((resume) => (
              <div
                key={resume.id}
                className='bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden group'
              >
                {/* Resume Preview Area */}
                <div className='bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 p-8 h-48 flex items-center justify-center border-b border-gray-200 dark:border-gray-600'>
                  <div className='text-center'>
                    <div className='text-5xl mb-2'>
                      {resume.type === 'draft' ? '📝' : '📄'}
                    </div>
                    <p className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
                      {resume.type === 'draft' ? 'Draft' : 'Uploaded'}
                    </p>
                  </div>
                </div>

                {/* Resume Details */}
                <div className='p-5'>
                  <h3 className='font-bold text-lg text-gray-900 dark:text-white mb-2 truncate'>
                    {resume.name}
                  </h3>
                  <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
                    Saved {formatDate(resume.savedAt)}
                  </p>

                  {/* Action Buttons */}
                  <div className='flex space-x-2'>
                    <button
                      onClick={() => handleEditResume(resume)}
                      className='flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors'
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteResume(resume.id)}
                      className='bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors'
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MyResumes
