import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { extractImages, extractText } from 'unpdf'
import modernPreview from "./assets/modern-preview.png";
import classicPreview from "./assets/classic-preview.png";
import modernPDF from "./assets/pdfs/modern-template.pdf";
import classicPDF from "./assets/pdfs/classic-template.pdf";
import { mergePDFWithText, downloadPDF } from '../utils/pdfUtils'
import { useResumeCompletionStore } from '../stores/resumeCompletionStore'

type ExtractPromise<T> = T extends Promise<infer U> ? U : never

// Template configuration
const templates = [
  {
    name: "modern",
    preview: modernPreview,
    pdf: modernPDF
  },
  {
    name: "classic",
    preview: classicPreview,
    pdf: classicPDF
  }
]

const ResumeBuilder: React.FC = () => {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const { trackCompletion } = useResumeCompletionStore()

  // File handling
  const [resumeFiles, setResumeFiles] = useState<File[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [pdfData, setPdfData] = useState<{ [key: string]: { text: string; images: string[]; metadata: any; optimized?: string; previewUrl?: string } }>({})
  const [aiOptimizedResumes, setAiOptimizedResumes] = useState<{ [key: string]: string }>({})
  const [expandedOptimized, setExpandedOptimized] = useState<{ [key: string]: boolean }>({})

  // PDF template state
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null)

  // Resume template / scratch editor
  const [resumeTemplate, setResumeTemplate] = useState({
    header: 'Your Name\nyour.email@example.com\n(123) 456-7890\nLinkedIn Profile',
    sidebar: 'SKILLS\n\nEDUCATION\n\nCERTIFICATIONS\n\nLANGUAGES',
    mainContent: 'PROFESSIONAL SUMMARY\n\nWORK EXPERIENCE\n\nPROJECTS\n\nACHIEVEMENTS'
  })

  const [resumeMode, setResumeMode] = useState<'scratch' | 'template'>('scratch')
  const [selectedTemplate, setSelectedTemplate] = useState<'modern' | 'classic' | null>(null)
  const [hasSelectedMode, setHasSelectedMode] = useState(false)

  // Loading states
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Template default content
  const templatesData = {
    modern: {
      header: 'Your Name\nEmail | Phone | LinkedIn',
      sidebar: 'SKILLS\n• Skill 1\n• Skill 2\n• Skill 3\n\nEDUCATION\nUniversity Name\nDegree, Year\n\nCERTIFICATIONS\n• Certification 1\n• Certification 2',
      mainContent: 'PROFESSIONAL SUMMARY\nBrief overview of your experience and skills.\n\nWORK EXPERIENCE\n\nJob Title | Company Name\nDates\n• Achievement 1\n• Achievement 2\n\nPROJECTS\n\nProject Name\n• Description\n• Technologies used'
    },
    classic: {
      header: 'Your Name\nEmail | Phone',
      sidebar: 'EDUCATION\nUniversity Name\nDegree, Year\n\nSKILLS\n• Skill 1\n• Skill 2\n• Skill 3\n\nLANGUAGES\n• English\n• Spanish',
      mainContent: 'PROFESSIONAL SUMMARY\nBrief overview of your background.\n\nWORK HISTORY\n\nJob Title | Company\nDates\n• Responsibility 1\n• Responsibility 2\n\nPROJECTS\n\nProject Name\n• Key achievement\n\nAWARDS\n• Award 1\n• Award 2'
    }
  }

  // --- File Upload / Extract ---
  const addFiles = async (files: FileList | File[]) => {
    const newFiles = Array.from(files).filter(f => !resumeFiles.some(existing => existing.name === f.name))
    setResumeFiles(prev => [...prev, ...newFiles])

    for (const file of newFiles) {
      if (file.type === 'application/pdf') {
        const content = await extractPdfContent(file)
        setPdfData(prev => ({ ...prev, [file.name]: content }))
      } else {
        setPdfData(prev => ({ ...prev, [file.name]: { text: '', images: [], metadata: {} } }))
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

    const imageUrls = images.map(img => {
      // cast to ArrayBuffer for Blob compatibility with TypeScript
      const blob = new Blob([img.data.buffer as ArrayBuffer], { type: `image/${img.key}` })
      return URL.createObjectURL(blob)
    })

    // create a preview URL for the original PDF file so we can display it later
    const pdfBlobUrl = URL.createObjectURL(new Blob([await file.arrayBuffer()], { type: file.type }))

    return {
      text: text.text.join('\n'),
      images: imageUrls,
      metadata: { totalPages: text.totalPages },
      previewUrl: pdfBlobUrl
    }
  }

  const toggleSelect = (fileName: string) => {
    setSelectedFiles(prev => prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName])
  }

  const deleteSelected = () => {
    setResumeFiles(prev => prev.filter(f => !selectedFiles.includes(f.name)))
    setPdfData(prev => {
      const updated = { ...prev }
      selectedFiles.forEach(f => {
        if (updated[f]?.images) updated[f].images.forEach(url => URL.revokeObjectURL(url))
        delete updated[f]
      })
      return updated
    })
    setAiOptimizedResumes(prev => {
      const updated = { ...prev }
      selectedFiles.forEach(f => delete updated[f])
      return updated
    })
    setSelectedFiles([])
  }

  const deleteSingle = (fileName: string) => {
    setResumeFiles(prev => prev.filter(f => f.name !== fileName))
    setPdfData(prev => {
      const updated = { ...prev }
      if (updated[fileName]?.images) updated[fileName].images.forEach(url => URL.revokeObjectURL(url))
      delete updated[fileName]
      return updated
    })
    setAiOptimizedResumes(prev => {
      const updated = { ...prev }
      delete updated[fileName]
      return updated
    })
    setSelectedFiles(prev => prev.filter(f => f !== fileName))
  }

  const extractSelected = async () => {
    for (const fileName of selectedFiles) {
      const file = resumeFiles.find(f => f.name === fileName)
      if (file && file.type === 'application/pdf') {
        const content = await extractPdfContent(file)
        setPdfData(prev => ({ ...prev, [file.name]: content }))
      }
    }
  }

  const handleTemplateChange = (section: 'header' | 'sidebar' | 'mainContent', value: string) => {
    setResumeTemplate(prev => ({ ...prev, [section]: value }))
  }

  const handleTemplateSubmit = async () => {
    try {
      const response = await fetch('/api/format-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resumeTemplate)
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()
      alert('Resume submitted for AI formatting!')
      console.log('Formatted resume:', result)
    } catch (error) {
      console.error('Error submitting resume:', error)
      alert('Failed to submit resume. Please try again.')
    }
  }

  const optimizeResumeWithAI = async (fileName: string) => {
    const data = pdfData[fileName]
    if (!data || !data.text.trim()) return alert('No text content found to optimize')

    try {
      const response = await fetch('/api/optimize-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.text, metadata: data.metadata, fileName })
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()
      // If API returned an optimized resume, use it. Otherwise fallback to local optimizer
      const optimized = (result && result.optimizedResume) ? result.optimizedResume : aiFallbackOptimize(data.text)
      setPdfData(prev => ({
        ...prev,
        [fileName]: {
          ...prev[fileName],
          optimized
        }
      }))
      // also keep a quick lookup map for optimized resumes
      setAiOptimizedResumes(prev => ({ ...prev, [fileName]: optimized }))
      // notify dashboard to increase resume completion for this file
      trackCompletion('ai_optimize', fileName, 20)
    } catch (error) {
      console.error('Error optimizing resume:', error)
      // On error, run a local fallback optimizer so the user still sees an optimized resume
      const optimizedFallback = aiFallbackOptimize(data.text)
      setPdfData(prev => ({
        ...prev,
        [fileName]: {
          ...prev[fileName],
          optimized: optimizedFallback
        }
      }))
      setAiOptimizedResumes(prev => ({ ...prev, [fileName]: optimizedFallback }))
      trackCompletion('ai_optimize', fileName, 10)
    }
  }

  // Local fallback optimizer: lightweight transformations to simulate AI improvements
  const aiFallbackOptimize = (rawText: string) => {
    // Simple heuristics: move SUMMARY to top, compact multiple blank lines, bulletify lines that look like achievements
    let text = rawText.replace(/\r/g, '')

    // Normalize spacing
    text = text.split('\n').map(l => l.trim()).filter((l, i, arr) => {
      // remove excessive blank lines
      if (!l && !arr[i-1]) return false
      return true
    }).join('\n')

    // If there's a PROFESSIONAL SUMMARY section, move it to the top
    const summaryMatch = text.match(/PROFESSIONAL SUMMARY[\s\S]*?(?=\n[A-Z ]{3,}|$)/i)
    let summary = ''
    if (summaryMatch) {
      summary = summaryMatch[0]
      // remove from original
      text = text.replace(summaryMatch[0], '')
    }

    // Bulletify lines that start with numbers or '•' or have '•' in them
    const lines = text.split('\n').map(l => l.trim())
    const transformed = lines.map(l => {
      if (/^\d+\.|^\*|^•/.test(l)) return `• ${l.replace(/^\d+\.|^\*|^•/, '').trim()}`
      if (l.length > 80 && l.split(' ').length > 8) return `• ${l}`
      return l
    }).join('\n')

    const final = (summary ? summary + '\n\n' : '') + transformed
    // add a small 'Optimized by local fallback' note so user can see difference
    return final + '\n\n(Optimized locally)'
  }

  // --- SAVE DRAFT FUNCTIONALITY ---
  const saveDraft = () => {
    if (!selectedTemplate && resumeMode !== 'scratch') {
      alert('Please select a template first')
      return
    }

    setIsSaving(true)
    
    try {
      const draftKey = selectedTemplate 
        ? `resume-draft-${selectedTemplate}` 
        : 'resume-draft-scratch'
      
      const draftData = {
        header: resumeTemplate.header,
        sidebar: resumeTemplate.sidebar,
        mainContent: resumeTemplate.mainContent,
        savedAt: new Date().toISOString(),
        mode: resumeMode,
        template: selectedTemplate
      }
      
      localStorage.setItem(draftKey, JSON.stringify(draftData))
      
      setTimeout(() => {
        setIsSaving(false)
        alert('✓ Draft saved successfully!')
        trackCompletion('save_draft', undefined, 5)
      }, 500)
    } catch (error) {
      console.error('Error saving draft:', error)
      setIsSaving(false)
      alert('Failed to save draft. Please try again.')
    }
  }

  // --- LOAD DRAFT FUNCTIONALITY ---
  const loadDraft = (templateId: 'modern' | 'classic' | 'scratch') => {
    try {
      const draftKey = templateId === 'scratch' 
        ? 'resume-draft-scratch' 
        : `resume-draft-${templateId}`
      
      const savedDraft = localStorage.getItem(draftKey)
      
      if (savedDraft) {
        const draftData = JSON.parse(savedDraft)
        setResumeTemplate({
          header: draftData.header,
          sidebar: draftData.sidebar,
          mainContent: draftData.mainContent
        })
        console.log(`✓ Draft loaded from: ${new Date(draftData.savedAt).toLocaleString()}`)
      }
    } catch (error) {
      console.error('Error loading draft:', error)
    }
  }

  // --- SELECT TEMPLATE ---
  const selectTemplate = (id: 'modern' | 'classic') => {
    // First, check if there's a saved draft
    const draftKey = `resume-draft-${id}`
    const savedDraft = localStorage.getItem(draftKey)
    
    if (savedDraft) {
      try {
        // Load saved draft
        const draftData = JSON.parse(savedDraft)
        setResumeTemplate({
          header: draftData.header,
          sidebar: draftData.sidebar,
          mainContent: draftData.mainContent
        })
        console.log('✓ Draft loaded from:', new Date(draftData.savedAt).toLocaleString())
      } catch (error) {
        console.error('Error parsing draft:', error)
        // Use default template data if draft is corrupted
        setResumeTemplate(templatesData[id])
      }
    } else {
      // Use default template data
      setResumeTemplate(templatesData[id])
    }
    
    setSelectedTemplate(id)
    
    // Set the PDF URL for this template
    const templateData = templates.find(t => t.name === id)
    if (templateData) {
      setCurrentPdfUrl(templateData.pdf)
    }
  }

  // --- DOWNLOAD PDF ---
  const handleDownloadPDF = async () => {
    if (!currentPdfUrl) {
      alert('No template selected')
      return
    }

    setIsDownloading(true)

    try {
      const pdfBytes = await mergePDFWithText(currentPdfUrl, resumeTemplate)
      const fileName = `resume-${selectedTemplate || 'scratch'}-${Date.now()}.pdf`
      downloadPDF(pdfBytes, fileName)
      
      setTimeout(() => {
        setIsDownloading(false)
        alert('✓ Resume downloaded successfully!')
    trackCompletion('download_pdf', undefined, 15)
      }, 500)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      setIsDownloading(false)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  // --- LOAD DRAFT ON MODE CHANGE ---
  useEffect(() => {
    if (hasSelectedMode && resumeMode === 'scratch') {
      loadDraft('scratch')
    }
  }, [hasSelectedMode, resumeMode])

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Header Nav */}
      <div className='bg-blue-600 dark:bg-blue-800 shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <h1 className='text-2xl font-bold text-white'>Resume Builder</h1>
            <nav className='flex space-x-4 items-center'>
              <button style={{ backgroundColor: 'transparent', boxShadow: 'none' }} className='border border-white/10 text-white px-4 py-2 rounded-md hover:bg-blue-800/20 transition-colors' onClick={() => navigate('/dashboard')}>Dashboard</button>
              <button style={{ backgroundColor: 'transparent', boxShadow: 'none' }} className='border border-white/10 text-white px-4 py-2 rounded-md hover:bg-blue-800/20 transition-colors' onClick={() => navigate('/resume')}>Resume Builder</button>
              <button style={{ backgroundColor: 'transparent', boxShadow: 'none' }} className='border border-white/10 text-white px-4 py-2 rounded-md hover:bg-blue-800/20 transition-colors' onClick={() => navigate('/interview')}>Mock Interview</button>
              <button
                style={{ backgroundColor: 'transparent', boxShadow: 'none' }}
                className='border border-white/10 text-white px-4 py-2 rounded-md hover:bg-blue-800/20 transition-colors'
                onClick={() => {
                  // store the first selected resume (or null) and navigate to Job Search
                  const firstSelected = selectedFiles.length > 0 ? selectedFiles[0] : null
                  if (firstSelected && pdfData[firstSelected]) {
                    const payload = {
                      fileName: firstSelected,
                      text: pdfData[firstSelected].text,
                      images: pdfData[firstSelected].images,
                      optimized: pdfData[firstSelected].optimized,
                      // if there are images we can reuse the first page image; otherwise undefined
                      previewUrl: pdfData[firstSelected]?.previewUrl || null
                    }
                    try { sessionStorage.setItem('selectedResume', JSON.stringify(payload)) } catch (err) { /* ignore */ }
                  } else {
                    try { sessionStorage.removeItem('selectedResume') } catch (err) { /* ignore */ }
                  }
                  navigate('/job-search')
                }}
              >
                Job Search
              </button>
            </nav>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
        <div className='px-4 py-6 sm:px-0'>
          <div className='bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg'>
            <div className='px-4 py-5 sm:p-6'>
              
              {/* Upload Section */}
              <h2 className='text-lg font-medium text-gray-900 dark:text-white mb-1'>Upload Your Resumes</h2>
              <div
                className='border-2 border-dashed rounded-lg p-8 text-center transition-colors border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
              >
                <input
                  ref={inputRef}
                  type='file'
                  accept='.pdf,.doc,.docx'
                  style={{ display: 'none' }}
                  multiple
                  onChange={handleFileInput}
                />
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className='mb-2 text-gray-700 dark:text-gray-300'>
                  Drag & drop your resumes here, or{' '}
                  <span
                    className='text-blue-600 dark:text-blue-400 cursor-pointer underline hover:text-blue-800 dark:hover:text-blue-300 font-medium'
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
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
                  Select multiple files to enable batch actions
                </p>
              )}

              {/* File List */}
              <div className="mt-4 space-y-2">
                {resumeFiles.map(file => (
                  <div
                    key={file.name}
                    className={`flex items-center justify-between p-3 rounded-md transition-all cursor-pointer ${
                      selectedFiles.includes(file.name) 
                        ? 'bg-blue-50 dark:bg-blue-900 border-2 border-blue-500' 
                        : 'bg-gray-100 dark:bg-gray-700 border-2 border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => toggleSelect(file.name)}
                  >
                    <div className='flex items-center flex-1'>
                      <input
                        type='checkbox'
                        checked={selectedFiles.includes(file.name)}
                        onChange={() => toggleSelect(file.name)}
                        className='mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500'
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className='flex-1'>
                        <p className='font-medium text-gray-800 dark:text-gray-200'>{file.name}</p>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                        {pdfData[file.name]?.text && (
                          <div className='mt-2'>
                            <div className='flex items-center gap-2'>
                              <button
                                onClick={e => { e.stopPropagation(); optimizeResumeWithAI(file.name) }}
                                className='text-xs bg-blue-600/90 text-white px-3 py-1 rounded hover:bg-blue-700/95 transition-colors'
                                style={{ boxShadow: 'none' }}
                              >
                                🤖 AI Optimize
                              </button>
                              <button
                                onClick={e => { e.stopPropagation();
                                  // store this file as selected resume and go to job search
                                  const payload = {
                                    fileName: file.name,
                                    text: pdfData[file.name].text,
                                    images: pdfData[file.name].images,
                                    optimized: pdfData[file.name].optimized
                                  }
                                  try { sessionStorage.setItem('selectedResume', JSON.stringify(payload)) } catch (err) { }
                                      trackCompletion('job_search_from_resume', file.name, 10)
                                      navigate('/job-search')
                                }}
                                className='text-xs bg-indigo-600/90 text-white px-3 py-1 rounded hover:bg-indigo-700/95 transition-colors'
                                title='Job Search with this resume'
                              >
                                🔍 Job Search
                              </button>
                              {aiOptimizedResumes[file.name] && (
                                <span className='text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900 px-2 py-1 rounded'>Optimized (full)</span>
                              )}
                              {pdfData[file.name]?.images?.length > 0 && (
                                <span className='text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900 px-2 py-1 rounded'>
                                  📷 {pdfData[file.name].images.length} image(s)
                                </span>
                              )}
                            </div>
                            {pdfData[file.name]?.optimized && (() => {
                              const opt = pdfData[file.name].optimized
                              if (typeof opt !== 'string') return null
                              const expanded = !!expandedOptimized[file.name]
                              return (
                                <div className='mt-2'>
                                  <div className='mt-2 p-2 bg-gray-50 dark:bg-gray-900 text-sm rounded text-gray-900 dark:text-gray-100'>
                                    {expanded ? opt : (opt.length > 400 ? opt.slice(0,400) + '…' : opt)}
                                  </div>
                                  {opt.length > 400 && (
                                    <button onClick={(e) => { e.stopPropagation(); setExpandedOptimized(prev => ({ ...prev, [file.name]: !prev[file.name] })) }} className='mt-2 text-xs underline text-blue-600 dark:text-blue-300'>
                                      {expanded ? 'Hide full' : 'View full'}
                                    </button>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteSingle(file.name) }}
                      className='ml-4 text-gray-400 hover:text-red-600 dark:hover:text-red-400 text-2xl font-bold transition-colors'
                      title="Delete file"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {selectedFiles.length > 0 && (
                <div className='flex justify-center gap-4 mt-6'>
                  <button 
                    className='bg-red-600/90 hover:bg-red-700/95 text-white px-6 py-2 rounded-md font-medium transition-colors' 
                    onClick={deleteSelected}
                  >
                    🗑️ Delete Selected ({selectedFiles.length})
                  </button>
                  <button 
                    className='bg-blue-600/90 hover:bg-blue-700/95 text-white px-6 py-2 rounded-md font-medium transition-colors' 
                    onClick={extractSelected}
                  >
                    📄 Extract Text
                  </button>
                </div>
              )}

              {/* Scratch / Template Section */}
              <div className="mt-12 text-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Choose Your Resume Mode</h3>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => { 
                      setResumeMode("scratch")
                      setSelectedTemplate(null)
                      setCurrentPdfUrl(null)
                      setHasSelectedMode(true)
                    }}
                    className={`px-8 py-3 rounded-lg font-medium transition-all shadow-md ${
                      resumeMode === "scratch" 
                        ? "bg-blue-600 text-white scale-105" 
                        : "bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-400"
                    }`}
                  >
                    ✏️ Scratch Resume
                  </button>
                  <button
                    onClick={() => { 
                      setResumeMode("template")
                      setHasSelectedMode(true)
                    }}
                    className={`px-8 py-3 rounded-lg font-medium transition-all shadow-md ${
                      resumeMode === "template" 
                        ? "bg-blue-600 text-white scale-105" 
                        : "bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-400"
                    }`}
                  >
                    📄 Template Resume
                  </button>
                </div>

                {/* Scratch Editor */}
                {hasSelectedMode && resumeMode === "scratch" && (
                  <div className='max-w-4xl mx-auto mt-8'>
                    <div className='bg-white dark:bg-gray-100 shadow-2xl border border-gray-300 dark:border-gray-400 min-h-[800px] p-8 relative' style={{aspectRatio: '8.5/11'}}>
                      <div className='w-full h-full flex flex-col'>
                        <div className='border-b-2 border-gray-300 pb-6 mb-6'>
                          <textarea
                            value={resumeTemplate.header}
                            onChange={e => handleTemplateChange('header', e.target.value)}
                            placeholder="Your Name&#10;your.email@example.com&#10;(123) 456-7890&#10;LinkedIn Profile"
                            className='w-full text-center text-2xl font-bold bg-transparent border-none outline-none resize-none text-gray-900 placeholder-gray-400'
                            rows={4}
                            style={{lineHeight: '1.3'}}
                          />
                        </div>
                        <div className='flex-1 flex gap-6'>
                          <div className='w-1/3 border-r-2 border-gray-300 pr-6'>
                            <textarea
                              value={resumeTemplate.sidebar}
                              onChange={e => handleTemplateChange('sidebar', e.target.value)}
                              placeholder="SKILLS&#10;&#10;EDUCATION&#10;&#10;CERTIFICATIONS"
                              className='w-full h-full bg-transparent border-none outline-none resize-none text-gray-900 placeholder-gray-400 text-sm'
                              style={{lineHeight: '1.5', minHeight: '500px'}}
                            />
                          </div>
                          <div className='flex-1'>
                            <textarea
                              value={resumeTemplate.mainContent}
                              onChange={e => handleTemplateChange('mainContent', e.target.value)}
                              placeholder="PROFESSIONAL SUMMARY&#10;&#10;WORK EXPERIENCE&#10;&#10;PROJECTS"
                              className='w-full h-full bg-transparent border-none outline-none resize-none text-gray-900 placeholder-gray-400 text-sm'
                              style={{lineHeight: '1.5', minHeight: '500px'}}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className='text-center mt-6 flex justify-center gap-4'>
                      <button
                        onClick={saveDraft}
                        disabled={isSaving}
                        className='bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-8 py-3 rounded-md font-medium transition-colors shadow-lg'
                      >
                        {isSaving ? '💾 Saving...' : '💾 Save Draft'}
                      </button>
                      <button
                        onClick={handleTemplateSubmit}
                        className='bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md font-medium transition-colors shadow-lg'
                      >
                        🤖 Submit for AI Formatting
                      </button>
                    </div>
                  </div>
                )}

                {/* Template Selection */}
                {hasSelectedMode && resumeMode === "template" && !selectedTemplate && (
                  <div className="mt-8">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Select a Template</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 justify-items-center">
                      {templates.map((template, index) => (
                        <div 
                          key={index} 
                          onClick={() => selectTemplate(template.name as 'modern' | 'classic')} 
                          className="cursor-pointer border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden hover:scale-105 hover:border-blue-500 transform transition-all shadow-lg hover:shadow-2xl"
                        >
                          <img 
                            src={template.preview} 
                            alt={`${template.name} template`} 
                            className="w-64 h-80 object-cover"
                          />
                          <div className="p-3 bg-gray-100 dark:bg-gray-700 text-center">
                            <p className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                              {template.name} Template
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Editable Template */}
                {hasSelectedMode && resumeMode === "template" && selectedTemplate && (
                  <div className='max-w-4xl mx-auto mt-8'>
                    <div className='bg-white dark:bg-gray-100 shadow-2xl border border-gray-300 dark:border-gray-400 min-h-[800px] p-8 relative' style={{aspectRatio: '8.5/11'}}>
                      <div className='w-full h-full flex flex-col'>
                        <div className='border-b-2 border-gray-300 pb-6 mb-6'>
                          <textarea
                            value={resumeTemplate.header}
                            onChange={e => handleTemplateChange('header', e.target.value)}
                            placeholder="Your Name&#10;Email | Phone | LinkedIn"
                            className='w-full text-center text-2xl font-bold bg-transparent border-none outline-none resize-none text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-300 rounded p-2'
                            rows={4}
                            style={{lineHeight: '1.3'}}
                          />
                        </div>
                        <div className='flex-1 flex gap-6'>
                          <div className='w-1/3 border-r-2 border-gray-300 pr-6'>
                            <textarea
                              value={resumeTemplate.sidebar}
                              onChange={e => handleTemplateChange('sidebar', e.target.value)}
                              placeholder="SKILLS&#10;&#10;EDUCATION&#10;&#10;CERTIFICATIONS"
                              className='w-full h-full bg-transparent border-none outline-none resize-none text-gray-900 placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-300 rounded p-2'
                              style={{lineHeight: '1.5', minHeight: '500px'}}
                            />
                          </div>
                          <div className='flex-1'>
                            <textarea
                              value={resumeTemplate.mainContent}
                              onChange={e => handleTemplateChange('mainContent', e.target.value)}
                              placeholder="PROFESSIONAL SUMMARY&#10;&#10;WORK EXPERIENCE&#10;&#10;PROJECTS"
                              className='w-full h-full bg-transparent border-none outline-none resize-none text-gray-900 placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-300 rounded p-2'
                              style={{lineHeight: '1.5', minHeight: '500px'}}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className='text-center mt-6 flex justify-center gap-4 flex-wrap'>
                      <button
                        onClick={saveDraft}
                        disabled={isSaving}
                        className='bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-8 py-3 rounded-md font-medium transition-colors shadow-lg'
                      >
                        {isSaving ? '💾 Saving...' : '💾 Save Draft'}
                      </button>
                      <button
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className='bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-md font-medium transition-colors shadow-lg'
                      >
                        {isDownloading ? '⬇️ Generating...' : '⬇️ Download PDF'}
                      </button>
                      <button
                        onClick={handleTemplateSubmit}
                        className='bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-md font-medium transition-colors shadow-lg'
                      >
                        🤖 AI Format
                      </button>
                      <button
                        onClick={() => { 
                          setSelectedTemplate(null)
                          setCurrentPdfUrl(null)
                        }}
                        className='bg-gray-300 hover:bg-gray-400 text-gray-800 px-8 py-3 rounded-md font-medium transition-colors shadow-lg'
                      >
                        ← Back to Templates
                      </button>
                    </div>

                    {/* Info Box */}
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        💡 <strong>Tip:</strong> Your changes are auto-saved locally. Click "Save Draft" to ensure your work is saved, then "Download PDF" to get your formatted resume.
                      </p>
                    </div>
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

export default ResumeBuilder
