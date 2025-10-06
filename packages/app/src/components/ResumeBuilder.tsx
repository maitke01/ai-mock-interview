import type React from 'react'
import { useRef, useState } from 'react'
import Markdown from 'react-markdown'
import { useNavigate } from 'react-router-dom'
import { extractImages, extractText } from 'unpdf'

type ExtractPromise<T> = T extends Promise<infer U> ? U : never

const ResumeBuilder: React.FC = () => {
  const navigate = useNavigate()

  const [resumeFiles, setResumeFiles] = useState<File[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [pdfData, setPdfData] = useState<{ [key: string]: { text: string; images: string[]; metadata: any } }>({})
  const [aiOptimizedResumes, setAiOptimizedResumes] = useState<{ [key: string]: string }>({})
  const inputRef = useRef<HTMLInputElement>(null)

  const [manualResume, setManualResume] = useState({
    name: '',
    education: '',
    jobs: '',
    skills: '',
    summary: ''
  })

  const addFiles = async (files: FileList | File[]) => {
    const newFiles = Array.from(files).filter((f) => !resumeFiles.some((existing) => existing.name === f.name))
    setResumeFiles((prev) => [...prev, ...newFiles])

    for (const file of newFiles) {
      if (file.type === 'application/pdf') {
        const content = await extractPdfContent(file)
        setPdfData((prev) => ({ ...prev, [file.name]: content }))
      } else {
        setPdfData((prev) => ({ ...prev, [file.name]: { text: '', images: [], metadata: {} } }))
      }
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  const extractPdfContent = async (file: File) => {
    const text = await extractText(await file.arrayBuffer())
    const images: ExtractPromise<ReturnType<typeof extractImages>> = []

    for (let i = 1; i <= text.totalPages; i++) {
      const img = await extractImages(await file.arrayBuffer(), i)
      images.push(...img)
    }

    const imageUrls = images.map((img) => {
      const blob = new Blob([img.data], { type: `image/${img.key}` })
      return URL.createObjectURL(blob)
    })

    return {
      text: text.text.join('\n'),
      images: imageUrls,
      metadata: { totalPages: text.totalPages }
    }
  }

  const toggleSelect = (fileName: string) => {
    setSelectedFiles((prev) => (prev.includes(fileName) ? prev.filter((f) => f !== fileName) : [...prev, fileName]))
  }

  const deleteSelected = () => {
    setResumeFiles((prev) => prev.filter((f) => !selectedFiles.includes(f.name)))
    setPdfData((prev) => {
      const updated = { ...prev }
      selectedFiles.forEach((f) => {
        if (updated[f]?.images) {
          updated[f].images.forEach((url) => URL.revokeObjectURL(url))
        }
        delete updated[f]
      })
      return updated
    })
    setAiOptimizedResumes((prev) => {
      const updated = { ...prev }
      selectedFiles.forEach((f) => delete updated[f])
      return updated
    })
    setSelectedFiles([])
  }

  const deleteSingle = (fileName: string) => {
    setResumeFiles((prev) => prev.filter((f) => f.name !== fileName))
    setPdfData((prev) => {
      const updated = { ...prev }
      if (updated[fileName]?.images) {
        updated[fileName].images.forEach((url) => URL.revokeObjectURL(url))
      }
      delete updated[fileName]
      return updated
    })
    setAiOptimizedResumes((prev) => {
      const updated = { ...prev }
      delete updated[fileName]
      return updated
    })
    setSelectedFiles((prev) => prev.filter((f) => f !== fileName))
  }

  const extractSelected = async () => {
    for (const fileName of selectedFiles) {
      const file = resumeFiles.find((f) => f.name === fileName)
      if (file && file.type === 'application/pdf') {
        const content = await extractPdfContent(file)
        setPdfData((prev) => ({ ...prev, [file.name]: content }))
      }
    }
  }

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setManualResume((prev) => ({ ...prev, [name]: value }))
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert('Resume submitted!')
  }

  const optimizeResumeWithAI = async (fileName: string) => {
    const data = pdfData[fileName]
    if (!data || !data.text.trim()) {
      alert('No text content found to optimize')
      return
    }

    try {
      const response = await fetch('/api/optimize-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: data.text,
          metadata: data.metadata,
          fileName: fileName
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setAiOptimizedResumes((prev) => ({
        ...prev,
        [fileName]: result.optimizedResume
      }))
    } catch (error) {
      console.error('Error optimizing resume:', error)
      alert('Failed to optimize resume. Please try again.')
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='bg-blue-600 dark:bg-blue-800 shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <h1 className='text-2xl font-bold text-white'>Resume Builder</h1>
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
            </nav>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
        <div className='px-4 py-6 sm:px-0'>
          <div className='bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg'>
            <div className='px-4 py-5 sm:p-6'>
              <h2 className='text-lg font-medium text-gray-900 dark:text-white mb-1'>Upload Your Resumes</h2>

              <div
                className='border-2 border-dashed rounded-lg p-8 text-center transition-colors border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <input
                  ref={inputRef}
                  type='file'
                  accept='.pdf,.doc,.docx'
                  style={{ display: 'none' }}
                  multiple
                  onChange={handleFileInput}
                />
                <p className='mb-2 text-gray-700 dark:text-gray-300'>
                  Drag & drop your resumes here, or{' '}
                  <span
                    className='text-blue-600 dark:text-blue-400 cursor-pointer underline'
                    onClick={(e) => {
                      e.stopPropagation()
                      inputRef.current?.click()
                    }}
                  >
                    browse
                  </span>
                </p>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-4'>
                  (PDF, DOC, or DOCX – multiple files allowed)
                </p>
              </div>

              {resumeFiles.length > 0 && (
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-4 text-center'>
                  select multiple files to enable the options below
                </p>
              )}

              {resumeFiles.length > 0 && (
                <div className='mt-2 space-y-2 text-left'>
                  {resumeFiles.map((file) => (
                    <div
                      key={file.name}
                      className={`flex items-center justify-between p-3 rounded-md bg-gray-100 dark:bg-gray-700 cursor-pointer ${
                        selectedFiles.includes(file.name) ? 'bg-blue-100 dark:bg-blue-900' : ''
                      }`}
                      onClick={() => toggleSelect(file.name)}
                    >
                      <div className='flex items-center'>
                        <input
                          type='checkbox'
                          checked={selectedFiles.includes(file.name)}
                          onChange={() => toggleSelect(file.name)}
                          className='mr-3'
                        />
                        <div className='flex-1'>
                          <p className='font-medium text-gray-800 dark:text-gray-200'>{file.name}</p>
                          {pdfData[file.name]?.text && (
                            <div className='flex items-center gap-2 mt-1'>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  optimizeResumeWithAI(file.name)
                                }}
                                className='text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors'
                              >
                                AI Optimize Resume
                              </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/job-search');
                                  }}
                                  className='text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors'
                                >
                                  Job Search
                                </button>
                              {pdfData[file.name]?.images?.length > 0 && (
                                <span className='text-xs text-green-600 bg-green-50 px-2 py-1 rounded'>
                                  {pdfData[file.name].images.length} image(s) extracted
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSingle(file.name)
                        }}
                        className='text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedFiles.length > 0 && (
                <div className='flex justify-center gap-4 mt-4'>
                  <button className='bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded' onClick={deleteSelected}>
                    Delete Selected
                  </button>
                  <button
                    className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded'
                    onClick={extractSelected}
                  >
                    Extract Text
                  </button>
                </div>
              )}

              {Object.keys(pdfData).map(
                (fileName) =>
                  pdfData[fileName]
                  && pdfData[fileName].text && (
                    <div key={fileName} className='mt-4 border border-gray-200 dark:border-gray-600 rounded-lg'>
                      <div className='bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600'>
                        <h4 className='font-semibold text-gray-800 dark:text-gray-200'>{fileName}</h4>
                      </div>

                      <div className='p-4'>
                        <h5 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Extracted Text:</h5>
                        <div className='bg-gray-50 dark:bg-gray-600 rounded p-3 max-h-40 overflow-y-auto text-xs'>
                          <pre className='whitespace-pre-wrap text-gray-900 dark:text-gray-100'>
                            {pdfData[fileName].text}
                          </pre>
                        </div>
                      </div>

                      {pdfData[fileName].images.length > 0 && (
                        <div className='px-4 pb-2'>
                          <h5 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                            Extracted Images:
                          </h5>
                          <div className='flex flex-wrap gap-2'>
                            {pdfData[fileName].images.map((imageUrl, index) => (
                              <img
                                key={index}
                                src={imageUrl || '/placeholder.svg'}
                                alt={`Extracted from ${fileName}`}
                                className='h-20 w-auto border border-gray-200 dark:border-gray-600 rounded'
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {aiOptimizedResumes[fileName] && (
                        <div className='px-4 pb-4'>
                          <h5 className='text-sm font-medium text-green-700 dark:text-green-400 mb-2'>
                            AI-Optimized Resume:
                          </h5>
                          <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded p-3 max-h-60 overflow-y-auto text-sm'>
                            <div className='prose prose-green dark:prose-invert max-w-none text-green-900 dark:text-green-100'>
                              <Markdown>{aiOptimizedResumes[fileName]}</Markdown>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
              )}

              <div className='mt-10'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>
                  Or enter your resume manually:
                </h3>
                <form className='space-y-4 text-left max-w-xl mx-auto' onSubmit={handleManualSubmit}>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Full Name</label>
                    <input
                      type='text'
                      name='name'
                      value={manualResume.name}
                      onChange={handleManualChange}
                      className='w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'
                      required
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Education</label>
                    <input
                      type='text'
                      name='education'
                      value={manualResume.education}
                      onChange={handleManualChange}
                      className='w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Previous Jobs
                    </label>
                    <textarea
                      name='jobs'
                      value={manualResume.jobs}
                      onChange={handleManualChange}
                      className='w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Skills</label>
                    <input
                      type='text'
                      name='skills'
                      value={manualResume.skills}
                      onChange={handleManualChange}
                      className='w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Summary</label>
                    <textarea
                      name='summary'
                      value={manualResume.summary}
                      onChange={handleManualChange}
                      className='w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'
                      rows={2}
                    />
                  </div>
                  <button
                    type='submit'
                    className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors'
                  >
                    Submit Resume
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResumeBuilder
