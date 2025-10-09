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

  const [resumeTemplate, setResumeTemplate] = useState({
    header: 'Your Name\nyour.email@example.com\n(123) 456-7890\nLinkedIn Profile',
    sidebar: 'SKILLS\n\nEDUCATION\n\nCERTIFICATIONS\n\nLANGUAGES',
    mainContent: 'PROFESSIONAL SUMMARY\n\nWORK EXPERIENCE\n\nPROJECTS\n\nACHIEVEMENTS'
  })

  const [formattedSections, setFormattedSections] = useState<{
    header?: string
    sidebar?: string
    mainContent?: string
  }>({})

  const [loadingStates, setLoadingStates] = useState<{
    header: boolean
    sidebar: boolean
    mainContent: boolean
    overall: boolean
  }>({
    header: false,
    sidebar: false,
    mainContent: false,
    overall: false
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
      // Convert the possibly-non-ArrayBuffer-backed typed array into a plain ArrayBuffer
      // Uint8Array.from will create a new ArrayBuffer-backed typed array.
      const arr = Uint8Array.from((img as any).data || [])
      const blob = new Blob([arr.buffer], { type: `image/${img.key}` })
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

  const handleTemplateChange = (section: 'header' | 'sidebar' | 'mainContent', value: string) => {
    setResumeTemplate((prev) => ({ ...prev, [section]: value }))
  }

  const formatSection = async (sectionType: 'header' | 'sidebar' | 'mainContent') => {
    setLoadingStates((prev) => ({ ...prev, [sectionType]: true }))

    try {
      const response = await fetch('/api/format-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sectionType: sectionType,
          content: resumeTemplate[sectionType]
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        setFormattedSections((prev) => ({
          ...prev,
          [sectionType]: result.formattedContent
        }))
      } else {
        throw new Error(result.error || 'Failed to format section')
      }
    } catch (error) {
      console.error(`Error formatting ${sectionType}:`, error)
      alert(`Failed to format ${sectionType}. Please try again.`)
    } finally {
      setLoadingStates((prev) => ({ ...prev, [sectionType]: false }))
    }
  }

  const formatAllSections = async () => {
    setLoadingStates((prev) => ({ ...prev, overall: true }))

    try {
      await Promise.all([
        formatSection('header'),
        formatSection('sidebar'),
        formatSection('mainContent')
      ])
      alert('All sections formatted successfully!')
    } catch (error) {
      console.error('Error formatting all sections:', error)
      alert('Some sections failed to format. Please try individual sections.')
    } finally {
      setLoadingStates((prev) => ({ ...prev, overall: false }))
    }
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
      // After optimizing, calculate ATS score using server route
      try {
        const atsResp = await fetch('/api/ats-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeText: data.text, keywords: [] })
        })
        if (atsResp.ok) {
          const atsResult = await atsResp.json()
          if (atsResult?.atsScore !== undefined) {
            // store in localStorage so Dashboard can read it
            localStorage.setItem('atsScore', String(atsResult.atsScore))
          }
        }
      } catch (e) {
        console.warn('Failed to calculate ATS score after optimize:', e)
      }
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
                                    // store selected resume info in sessionStorage so JobSearch can show it
                                    try {
                                      const payload = {
                                        fileName: file.name,
                                        text: pdfData[file.name]?.text || '',
                                        images: pdfData[file.name]?.images || [],
                                        optimized: aiOptimizedResumes[file.name] || null
                                      }
                                      sessionStorage.setItem('selectedResume', JSON.stringify(payload))
                                    } catch (err) {
                                      console.warn('Failed to store selected resume in sessionStorage', err)
                                    }
                                    navigate('/job-search')
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
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-6 text-center'>
                  Create Your Resume
                </h3>
                
                <div className='max-w-4xl mx-auto'>
                  <div className='bg-white dark:bg-gray-100 shadow-2xl border border-gray-300 dark:border-gray-400 min-h-[800px] p-8 relative' style={{aspectRatio: '8.5/11'}}>
                    <div className='w-full h-full flex flex-col'>
                      
                      <div className='border-b-2 border-gray-300 pb-6 mb-6'>
                        <div className='flex justify-between items-start mb-2'>
                          <h4 className='text-sm font-medium text-gray-600'>Header Section</h4>
                          <button
                            onClick={() => formatSection('header')}
                            disabled={loadingStates.header}
                            className='text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors'
                          >
                            {loadingStates.header ? 'Formatting...' : 'Format Header'}
                          </button>
                        </div>
                        <textarea
                          value={formattedSections.header || resumeTemplate.header}
                          onChange={(e) => {
                            if (formattedSections.header) {
                              setFormattedSections(prev => ({ ...prev, header: e.target.value }))
                            } else {
                              handleTemplateChange('header', e.target.value)
                            }
                          }}
                          className={`w-full text-center text-2xl font-bold bg-transparent border-none outline-none resize-none placeholder-gray-400 ${
                            formattedSections.header ? 'text-green-800' : 'text-gray-900'
                          }`}
                          placeholder='Your Name&#10;your.email@example.com&#10;(123) 456-7890&#10;LinkedIn Profile'
                          rows={4}
                          style={{lineHeight: '1.3'}}
                        />
                        {formattedSections.header && (
                          <div className='text-xs text-green-600 mt-1 text-center'>✓ AI Formatted</div>
                        )}
                      </div>

                      <div className='flex-1 flex gap-6'>
                        <div className='w-1/3 border-r-2 border-gray-300 pr-6'>
                          <div className='flex justify-between items-start mb-2'>
                            <h4 className='text-sm font-medium text-gray-600'>Sidebar</h4>
                            <button
                              onClick={() => formatSection('sidebar')}
                              disabled={loadingStates.sidebar}
                              className='text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors'
                            >
                              {loadingStates.sidebar ? 'Formatting...' : 'Format Sidebar'}
                            </button>
                          </div>
                          <textarea
                            value={formattedSections.sidebar || resumeTemplate.sidebar}
                            onChange={(e) => {
                              if (formattedSections.sidebar) {
                                setFormattedSections(prev => ({ ...prev, sidebar: e.target.value }))
                              } else {
                                handleTemplateChange('sidebar', e.target.value)
                              }
                            }}
                            className={`w-full h-full bg-transparent border-none outline-none resize-none text-sm placeholder-gray-400 ${
                              formattedSections.sidebar ? 'text-green-800' : 'text-gray-900'
                            }`}
                            placeholder='SKILLS&#10;&#10;EDUCATION&#10;&#10;CERTIFICATIONS&#10;&#10;LANGUAGES'
                            style={{lineHeight: '1.5', minHeight: '460px'}}
                          />
                          {formattedSections.sidebar && (
                            <div className='text-xs text-green-600 mt-1'>✓ AI Formatted</div>
                          )}
                        </div>

                        <div className='flex-1'>
                          <div className='flex justify-between items-start mb-2'>
                            <h4 className='text-sm font-medium text-gray-600'>Main Content</h4>
                            <button
                              onClick={() => formatSection('mainContent')}
                              disabled={loadingStates.mainContent}
                              className='text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors'
                            >
                              {loadingStates.mainContent ? 'Formatting...' : 'Format Content'}
                            </button>
                          </div>
                          <textarea
                            value={formattedSections.mainContent || resumeTemplate.mainContent}
                            onChange={(e) => {
                              if (formattedSections.mainContent) {
                                setFormattedSections(prev => ({ ...prev, mainContent: e.target.value }))
                              } else {
                                handleTemplateChange('mainContent', e.target.value)
                              }
                            }}
                            className={`w-full h-full bg-transparent border-none outline-none resize-none text-sm placeholder-gray-400 ${
                              formattedSections.mainContent ? 'text-green-800' : 'text-gray-900'
                            }`}
                            placeholder='PROFESSIONAL SUMMARY&#10;&#10;WORK EXPERIENCE&#10;&#10;PROJECTS&#10;&#10;ACHIEVEMENTS'
                            style={{lineHeight: '1.5', minHeight: '460px'}}
                          />
                          {formattedSections.mainContent && (
                            <div className='text-xs text-green-600 mt-1'>✓ AI Formatted</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className='text-center mt-6 space-y-4'>
                    <div className='flex justify-center gap-4'>
                      <button
                        onClick={formatAllSections}
                        disabled={loadingStates.overall}
                        className='bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-md font-medium transition-colors shadow-lg'
                      >
                        {loadingStates.overall ? 'Formatting All...' : 'Format All Sections'}
                      </button>
                    </div>

                    {(formattedSections.header || formattedSections.sidebar || formattedSections.mainContent) && (
                      <div className='bg-green-50 border border-green-200 rounded-lg p-4'>
                        <h4 className='text-green-800 font-medium mb-2'>✓ AI-Formatted Sections Available</h4>
                        <p className='text-green-700 text-sm'>
                          Your resume sections have been professionally formatted. The green text shows AI-improved content.
                          You can continue editing or use this formatted version.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResumeBuilder


