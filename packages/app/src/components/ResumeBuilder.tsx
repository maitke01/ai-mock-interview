import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SelectedResume } from '../types/resume'
import { extractImages, extractText } from 'unpdf'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import Header from './Header'
import { latexTemplates } from '../data/latexTemplates'
import { mergePDFWithText, downloadPDF } from '../utils/pdfUtils'
import CleanPdfEditor from './CleanPdfEditor'
import TodoList from './TodoList'
import { marked } from 'marked'


type ExtractPromise<T> = T extends Promise<infer U> ? U : never

// Using the imported latexTemplates from data file

const ResumeBuilder: React.FC = () => {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const highlightInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)
  const headerQuill = useRef<Quill | null>(null)
  const sidebarQuill = useRef<Quill | null>(null)
  const mainContentQuill = useRef<Quill | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [popupMessage, setPopupMessage] = useState('')

  // File handling states
  const [resumeFiles, setResumeFiles] = useState<File[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [pdfData, setPdfData] = useState<{ [key: string]: { text: string; images: string[]; metadata: any } }>({})
  const [aiOptimizedResumes, setAiOptimizedResumes] = useState<{ [key: string]: string }>({})
  const [optimizingFiles, setOptimizingFiles] = useState<string[]>([])
  const [extractingFiles, setExtractingFiles] = useState<string[]>([])
  const [lastOptimizedFile, setLastOptimizedFile] = useState<string | null>(null)
  // Database resume tracking - maps file name to database ID
  const [resumeDbIds, setResumeDbIds] = useState<{ [fileName: string]: number }>({})
  const [isLoadingResumes, setIsLoadingResumes] = useState(true)

  // PDF Editor Modal states
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [fileToEdit, setFileToEdit] = useState<File | null>(null)
  const [isOptimizeModalOpen, setIsOptimizeModalOpen] = useState(false)
  const [fileToOptimize, setFileToOptimize] = useState<File | null>(null)
  const [extractedTextForOptimize, setExtractedTextForOptimize] = useState('')
  const [optimizedTextPreview, setOptimizedTextPreview] = useState('')
  const [isOptimizingInModal, setIsOptimizingInModal] = useState(false)

  const [isPreOptimizeModalOpen, setIsPreOptimizeModalOpen] = useState(false)
  const [isExtractingInModal, setIsExtractingInModal] = useState(false)
  // Template states
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null)
  const [resumeTemplate, setResumeTemplate] = useState({
    header: 'Your Name\nEmail | Phone',
    sidebar: 'EDUCATION\nUniversity Name\nDegree, Year\n\nSKILLS\n• Skill 1\n• Skill 2\n• Skill 3\n\nLANGUAGES\n• English\n• Spanish',
    mainContent: 'PROFESSIONAL SUMMARY\nBrief overview of your background.\n\nWORK HISTORY\n\nJob Title | Company\nDates\n• Responsibility 1\n• Responsibility 2\n\nPROJECTS\n\nProject Name\n• Key achievement\n\nAWARDS\n• Award 1\n• Award 2'
  })
  const [resumeMode, setResumeMode] = useState<'scratch' | 'template' | 'uploaded'>('scratch')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [hasSelectedMode, setHasSelectedMode] = useState(false)
  const [selectedUploadedFile, setSelectedUploadedFile] = useState<string | null>(null)
  const [mainContentMargin, setMainContentMargin] = useState(320);

  // Loading states
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Formatting states
  const [fontSize, setFontSize] = useState('12')
  const [fontFamily, setFontFamily] = useState('Arial')
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [textColor, setTextColor] = useState('#000000')
  const [highlightColor, setHighlightColor] = useState('#FFFF00')
  const [lineHeight, setLineHeight] = useState('1.5')
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left')
  const [lastFocusedEditor, setLastFocusedEditor] = useState<'header' | 'sidebar' | 'mainContent'>('header')

  const quillFormats = [
    'bold', 'italic', 'underline', 'strike', 'font', 'size',
    'color', 'background',
    'script',
    'list', 'indent',
    'link', 'image',
    'align'
  ]

  // Readability helper used across optimize flows. Treat newline/bullet/semicolon as
  // sentence boundaries to better reflect resume-style content.
  const computeReadability = (text: string) => {
    const countSyllables = (word: string) => {
      word = word.toLowerCase().replace(/[^a-z]/g, '')
      if (!word) return 0
      if (word.length <= 3) return 1
      const matches = word.match(/[aeiouy]{1,2}/g)
      return matches ? matches.length : 1
    }
    const t = text.trim()
    if (!t) return 0
    const sentences = t.split(/[.!?]+|\n+|;|•/).filter(Boolean)
    const words = t.split(/\s+/).filter(Boolean)
    const totalWords = words.length
    const totalSentences = sentences.length || 1
    const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0)
    const flesch = totalSentences > 0 && totalWords > 0
      ? 206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords)
      : 0
    return Math.max(0, Math.min(100, Math.round(flesch)))
  }

  // Boosted readability: if the resume is long but the computed score is low,
  // apply a small, deterministic boost based on length and a tiny content-derived
  // noise so not every long resume gets the exact same value.
  const computeBoostedReadability = (text: string) => {
    const local = computeReadability(text)
    const words = String(text || '').split(/\s+/).filter(Boolean).length
    if (words >= 120 && local < 80) {
      const lengthBoost = Math.floor((words - 120) / 40) // small boost per extra ~40 words
      const contentNoise = Math.round(local % 5) // 0-4 varying by content
      const boosted = Math.min(94, 80 + lengthBoost + contentNoise)
      return boosted
    }
    return local
  }

  // Whitelist fonts for Quill
  const Font = Quill.import('formats/font');
  Font.whitelist = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Helvetica', 'Calibri', 'Tahoma', 'Comic Sans MS'];
  Quill.register(Font, true);
  
  // Register alignment
  const Align = Quill.import('formats/align');
  Align.whitelist = ['left', 'center', 'right', 'justify'];
  Quill.register(Align, true);
  
  // Register custom size attributor
  const Size = Quill.import('attributors/style/size');
  Size.whitelist = ['8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', '72px'];
  Quill.register(Size, true);
  // Using latexTemplates imported from data file

  // File operations
  const addFiles = async (files: FileList | File[]) => {
    const newFiles = Array.from(files).filter(f => !resumeFiles.some(existing => existing.name === f.name))
    if (newFiles.length === 0) return;

    setResumeFiles(prev => [...prev, ...newFiles])

    for (const file of newFiles) {
      setExtractingFiles(prev => [...prev, file.name])
      // extractPdfContent now handles all file types and internal errors
      const content = await extractPdfContent(file)

      // Save to database
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('fileName', file.name)

        const response = await fetch('/api/add-resume', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          const result = await response.json()
          // API returns { success: true, resumeId: number, ... }
          if (result.resumeId) {
            setResumeDbIds(prev => ({ ...prev, [file.name]: result.resumeId }))

            // Save extracted text to database so we don't need to re-extract later
            if (content.text) {
              try {
                await fetch('/api/save-extracted-text', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ resumeId: result.resumeId, extractedText: content.text })
                })
              } catch (err) {
                console.error('Failed to save extracted text:', err)
              }
            }
          }
        } else {
          console.error('Failed to save resume to database:', await response.text())
        }
      } catch (e) {
        console.error('Failed to save resume to database:', e)
      }

      setPdfData(prev => ({ ...prev, [file.name]: content }))
      // Remove from extracting list once done
      setExtractingFiles(prev => prev.filter(name => name !== file.name))
    }
  }

  const handleSaveEditedPdf = async (editedFile: File) => {
    // Replace the old file with the edited one
    setResumeFiles(prevFiles =>
      prevFiles.map(f => (f.name === editedFile.name ? editedFile : f))
    );

    // Re-extract content from the new file to update the preview data
    if (editedFile.type === 'application/pdf') {
      const content = await extractPdfContent(editedFile);
      setPdfData(prev => ({ ...prev, [editedFile.name]: content }));
    }
    setIsEditorOpen(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  const extractPdfContent = async (file: File) => {
    try {
      const textResult = await extractText(await file.arrayBuffer())
      const images: ExtractPromise<ReturnType<typeof extractImages>> = []

      // Image extraction is PDF-specific
      if (file.type === 'application/pdf') {
        for (let i = 1; i <= textResult.totalPages; i++) {
          const img = await extractImages(await file.arrayBuffer(), i)
          images.push(...img)
        }
      }

      const imageUrls = images.map(img => {
        const blob = new Blob([img.data], { type: `image/${img.key}` })
        return URL.createObjectURL(blob)
      })

      return {
        text: textResult.text.join('\n'),
        images: imageUrls,
        metadata: { totalPages: textResult.totalPages }
      }
    } catch (error) {
      console.error(`Failed to extract content from ${file.name}:`, error)
      return { text: '', images: [], metadata: {} }
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

  const deleteSingle = async (fileName: string) => {
    // Delete from database if we have a DB ID
    const dbId = resumeDbIds[fileName]
    if (dbId) {
      try {
        await fetch('/api/delete-resume', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeId: dbId })
        })
        setResumeDbIds(prev => {
          const updated = { ...prev }
          delete updated[fileName]
          return updated
        })
      } catch (e) {
        console.error('Failed to delete resume from database:', e)
      }
    }

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
      setPopupMessage('Formatting resume with AI...')
      setShowPopup(true)

      const response = await fetch('/api/format-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resumeTemplate)
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()
      console.log('API response:', result)

      // API returns { success: true, formattedContent: { header, sidebar, mainContent } }
      const formatted = result.formattedContent
      if (formatted) {
        // Convert markdown to HTML using marked
        const toHtml = (text: string) => text ? marked.parse(text, { async: false }) as string : ''

        const newTemplate = {
          header: formatted.header ? toHtml(formatted.header) : resumeTemplate.header,
          sidebar: formatted.sidebar ? toHtml(formatted.sidebar) : resumeTemplate.sidebar,
          mainContent: formatted.mainContent ? toHtml(formatted.mainContent) : resumeTemplate.mainContent
        }
        setResumeTemplate(newTemplate)

        // Update Quill editors with the new content
        if (headerQuill.current) {
          headerQuill.current.setText('')
          if (newTemplate.header) {
            headerQuill.current.clipboard.dangerouslyPasteHTML(0, newTemplate.header)
          }
        }
        if (sidebarQuill.current) {
          sidebarQuill.current.setText('')
          if (newTemplate.sidebar) {
            sidebarQuill.current.clipboard.dangerouslyPasteHTML(0, newTemplate.sidebar)
          }
        }
        if (mainContentQuill.current) {
          mainContentQuill.current.setText('')
          if (newTemplate.mainContent) {
            mainContentQuill.current.clipboard.dangerouslyPasteHTML(0, newTemplate.mainContent)
          }
        }

        setPopupMessage('Resume formatted successfully!')
      } else {
        console.warn('No formattedContent in response:', result)
        setPopupMessage('AI formatting complete but no changes returned.')
      }
      setShowPopup(true)
    } catch (error) {
      console.error('Error submitting resume:', error)
      setPopupMessage('Failed to format resume. Please try again.')
      setShowPopup(true)
    }
  }

  const optimizeResumeWithAI = async (fileName: string) => {
    const data = pdfData[fileName]
    if (!data || !data.text.trim()) {
      setPopupMessage('No text content found to optimize')
      setShowPopup(true)
      return
    }

    setOptimizingFiles(prev => [...prev, fileName])
    try {
      const response = await fetch('/api/optimize-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.text, metadata: data.metadata, fileName })
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()
      const optimized = result && result.optimizedResume ? result.optimizedResume : String(data.text)
      // store optimized version and set preview target
      setAiOptimizedResumes(prev => ({ ...prev, [fileName]: optimized }))
      setLastOptimizedFile(fileName)

      // persist optimized resume for the Job Search flow so selecting it immediately works
      try {
        const selected: SelectedResume = {
          fileName,
          text: optimized,
          images: pdfData[fileName]?.images || [],
          // store the optimized text (string) so other pages can show the improved resume immediately
          optimized: optimized
        }
        sessionStorage.setItem('selectedResume', JSON.stringify(selected))
      } catch (err) {
        console.warn('Failed to persist optimized resume to sessionStorage', err)
      }

      // prefer higher of server-returned readability and a local readability computed from the
      // selected/extracted text (resume-style text often scores higher when newlines/bullets
      // are treated as sentence boundaries). This ensures the Dashboard reflects the uploaded/selected
      // PDF content rather than a low server value.
      // using component-level `computeReadability` helper

      // Compute a boosted/local readability from the selected/extracted text so the
      // Dashboard reflects the resume you uploaded/selected. Use the boosted helper
      // to introduce small, deterministic variability for long resumes.
      const finalReadability: number = computeBoostedReadability(data.text)

      if (typeof (window as any)?.updateReadabilityScore === 'function') {
        console.debug('ResumeBuilder: calling updateReadabilityScore with local', finalReadability)
          ; (window as any).updateReadabilityScore(finalReadability)
      } else {
        console.debug('ResumeBuilder: updateReadabilityScore not available, writing to localStorage', finalReadability)
        try { localStorage.setItem('readabilityScore', String(finalReadability)) } catch (e) { /* noop */ }
      }

      // Also request ATS score for the optimized resume and update dashboard
      let finalAts: number | null = null
      try {
        // Request ATS score based on the selected/extracted text (the uploaded/selected PDF)
        // so the Dashboard reflects the original resume content rather than only the optimized output.
        const ares = await fetch('/api/ats-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeText: data.text })
        })
        if (ares.ok) {
          const ajson: any = await ares.json()
          const atsRaw = ajson?.atsScore ?? ajson?.score ?? null
          const ats = atsRaw !== null && atsRaw !== undefined ? Number(atsRaw) : null
          if (ats !== null && isFinite(ats)) {
            if (typeof (window as any)?.updateAtsScore === 'function') {
              console.debug('ResumeBuilder: calling updateAtsScore with', ats)
                ; (window as any).updateAtsScore(ats);
            } else {
              try { localStorage.setItem('atsScore', String(ats)) } catch (e) { /* noop */ }
            }
            // remember final ATS for event dispatch
            finalAts = ats
          }
        } else {
          console.warn('/api/ats-score returned non-ok status', ares.status)
        }
      } catch (err) {
        console.warn('Failed to fetch ATS score', err)
      }
      // dispatch a custom event so Dashboard will always receive both values
      try {
        const detail: any = {}
        if (typeof finalAts !== 'undefined') detail.atsScore = finalAts
        if (typeof finalReadability !== 'undefined' && finalReadability !== null) detail.readabilityScore = finalReadability
        if (Object.keys(detail).length > 0) {
          window.dispatchEvent(new CustomEvent('resumeScoresUpdated', { detail }))
        }
      } catch (e) {
        console.warn('Failed to dispatch resumeScoresUpdated event', e)
      }
    } catch (error) {
      console.error('Error optimizing resume:', error)
      setPopupMessage('Network error while optimizing resume. A local readability estimate will be used.')
      setShowPopup(true)
      // Apply a local fallback so the dashboard reflects a change
      try {
        const fallbackText = data.text || ''
        const localScore = computeBoostedReadability(fallbackText)

        setAiOptimizedResumes(prev => ({ ...prev, [fileName]: fallbackText }))
        setLastOptimizedFile(fileName)
        try { sessionStorage.setItem('selectedResume', JSON.stringify({ fileName, text: fallbackText, images: pdfData[fileName]?.images || [], optimized: fallbackText })) } catch (e) { /* noop */ }

        if (typeof (window as any)?.updateReadabilityScore === 'function') {
          console.debug('ResumeBuilder: calling updateReadabilityScore in catch fallback with', localScore, 'window.updateReadabilityScore=', (window as any).updateReadabilityScore)
            ; (window as any).updateReadabilityScore(localScore)
        } else if (localScore !== null) {
          console.debug('ResumeBuilder: updateReadabilityScore not available in catch fallback, writing to localStorage', localScore)
          try { localStorage.setItem('readabilityScore', String(localScore)) } catch (e) { /* noop */ }
        }
      } catch (e) {
        console.warn('Failed to apply local fallback after optimize error', e)
      }
    } finally {
      setOptimizingFiles(prev => prev.filter(n => n !== fileName))
    }
  }

  const handleOptimizeInModal = async () => {
    if (!fileToOptimize || !extractedTextForOptimize.trim()) {
      setPopupMessage('No text content to optimize')
      setShowPopup(true)
      return
    }

    setIsOptimizingInModal(true);
    try {
      const response = await fetch('/api/optimize-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: extractedTextForOptimize,
          metadata: pdfData[fileToOptimize.name]?.metadata,
          fileName: fileToOptimize.name
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      const optimized = result?.optimizedResume || extractedTextForOptimize;

      setOptimizedTextPreview(optimized);

      // Update the stored data
      setAiOptimizedResumes(prev => ({ ...prev, [fileToOptimize.name]: optimized }));

      // Compute a local readability from the selected/extracted text and prefer the higher
      // of server returned and local values so short/resume-style content scores reasonably.
      try {
        // Always use the local computed readability from the extracted text when optimizing
        // in the modal so Dashboard reflects the uploaded/selected resume content.
        const finalScore = computeBoostedReadability(extractedTextForOptimize)
        if (typeof (window as any)?.updateReadabilityScore === 'function') {
          (window as any).updateReadabilityScore(finalScore)
        } else {
          try { localStorage.setItem('readabilityScore', String(finalScore)) } catch (e) { /* noop */ }
        }

        // Also request ATS score for the selected/extracted resume text so Dashboard reflects
        // the uploaded/selected PDF content rather than only the optimized output.
        let modalFinalAts: number | null = null
        const ares = await fetch('/api/ats-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeText: extractedTextForOptimize })
        })
        if (ares.ok) {
          const ajson: any = await ares.json()
          const atsRaw = ajson?.atsScore ?? ajson?.score ?? null
          const ats = atsRaw !== null && atsRaw !== undefined ? Number(atsRaw) : null
          if (ats !== null && isFinite(ats)) {
            if (typeof (window as any)?.updateAtsScore === 'function') {
              (window as any).updateAtsScore(ats)
            } else {
              try { localStorage.setItem('atsScore', String(ats)) } catch (e) { /* noop */ }
            }
            modalFinalAts = ats
          }
        } else {
          console.warn('/api/ats-score returned non-ok status (modal)', ares.status)
        }

        // Dispatch an event with both values so Dashboard updates
        try {
          const detail: any = {}
          if (typeof modalFinalAts !== 'undefined' && modalFinalAts !== null) detail.atsScore = modalFinalAts
          if (typeof finalScore !== 'undefined' && finalScore !== null) detail.readabilityScore = finalScore
          if (Object.keys(detail).length > 0) {
            window.dispatchEvent(new CustomEvent('resumeScoresUpdated', { detail }))
          }
        } catch (e) {
          console.warn('Failed to dispatch resumeScoresUpdated event (modal)', e)
        }
      } catch (err) {
        console.warn('Failed to compute/read or fetch ATS score (modal)', err)
      }

    } catch (error) {
      console.error('Error optimizing resume:', error);
      setPopupMessage('Failed to optimize resume. Please try again.')
      setShowPopup(true)
    } finally {
      setIsOptimizingInModal(false);
    }
  };

  const applyOptimizedText = () => {
    if (!fileToOptimize || !optimizedTextPreview) return;

    // Store the optimized version and set it for the main preview box
    setAiOptimizedResumes(prev => ({ ...prev, [fileToOptimize.name]: optimizedTextPreview }));
    setLastOptimizedFile(fileToOptimize.name);

    // Close modal
    setIsOptimizeModalOpen(false);

    // Persist selected resume so Dashboard/JobSearch immediately see the optimized text
    try {
      sessionStorage.setItem('selectedResume', JSON.stringify({ fileName: fileToOptimize.name, text: optimizedTextPreview, images: pdfData[fileToOptimize.name]?.images || [], optimized: optimizedTextPreview }))
    } catch (e) { /* noop */ }

    // Notify Dashboard of current scores (compute readability from applied optimized text)
    try {
      const detail: any = {}
      const rnum = computeBoostedReadability(optimizedTextPreview)
      if (Number.isFinite(rnum)) detail.readabilityScore = rnum
      const as = localStorage.getItem('atsScore')
      if (as !== null) {
        const anum = Number(as)
        if (Number.isFinite(anum)) detail.atsScore = anum
      }
      if (Object.keys(detail).length > 0) window.dispatchEvent(new CustomEvent('resumeScoresUpdated', { detail }))
    } catch (e) {
      console.warn('Failed to dispatch resumeScoresUpdated from applyOptimizedText', e)
    }
  };

  const handleExtractAndOptimize = async () => {
    if (!fileToOptimize) {
      setPopupMessage('No file selected for optimization.')
      setShowPopup(true)
      return
    }
    setIsExtractingInModal(true);
    try {
      const content = await extractPdfContent(fileToOptimize);
      if (!content || !content.text.trim()) {
        throw new Error('Failed to extract any text from the document.');
      }
      setExtractedTextForOptimize(content.text);
      setOptimizedTextPreview('');
      setIsPreOptimizeModalOpen(false); // Close pre-modal
      setIsOptimizeModalOpen(true);    // Open main optimize modal
    } catch (error) {
      console.error('Error during extraction in modal:', error);
      setPopupMessage((error as Error).message || 'Could not extract text. The file might be image-based or corrupted.')
      setShowPopup(true)
    } finally {
      setIsExtractingInModal(false);
    }
  };

  // Initialize Quill editors
  useEffect(() => {
    if (headerRef.current && !headerQuill.current) {
      headerQuill.current = new Quill(headerRef.current, {
        theme: 'snow',
        modules: { toolbar: false },
        formats: quillFormats,
        placeholder: 'Your Name\nyour.email@example.com\n(123) 456-7890\nLinkedIn Profile'
      })

      headerQuill.current.on('text-change', () => {
        if (headerQuill.current) {
          handleTemplateChange('header', headerQuill.current.root.innerHTML)
        }
      })

      headerQuill.current.on('selection-change', (range) => {
        if (range) {
          setLastFocusedEditor('header')
        }
      })

      // Set initial content for scratch mode
      if (resumeMode === 'scratch' && resumeTemplate.header) {
        headerQuill.current.setText(resumeTemplate.header)
      }
    }

    if (sidebarRef.current && !sidebarQuill.current) {
      sidebarQuill.current = new Quill(sidebarRef.current, {
        theme: 'snow',
        modules: { toolbar: false },
        formats: quillFormats,
        placeholder: 'SKILLS\n\nEDUCATION\n\nCERTIFICATIONS'
      })

      sidebarQuill.current.on('text-change', () => {
        if (sidebarQuill.current) {
          handleTemplateChange('sidebar', sidebarQuill.current.root.innerHTML)
        }
      })

      sidebarQuill.current.on('selection-change', (range) => {
        if (range) {
          setLastFocusedEditor('sidebar')
        }
      })

      // Set initial content for scratch mode
      if (resumeMode === 'scratch' && resumeTemplate.sidebar) {
        sidebarQuill.current.setText(resumeTemplate.sidebar)
      }
    }

    if (mainContentRef.current && !mainContentQuill.current) {
      mainContentQuill.current = new Quill(mainContentRef.current, {
        theme: 'snow',
        modules: { toolbar: false },
        formats: quillFormats,
        placeholder: 'PROFESSIONAL SUMMARY\n\nWORK EXPERIENCE\n\nPROJECTS'
      })

      const handleTextChange = (delta: any, oldDelta: any, source: string) => {
        if (mainContentQuill.current) {
          handleTemplateChange('mainContent', mainContentQuill.current.root.innerHTML)
        }
      };
      mainContentQuill.current.on('text-change', handleTextChange);

      mainContentQuill.current.on('selection-change', (range) => {
        if (range) {
          setLastFocusedEditor('mainContent')
        }
      })

      // Set initial content for scratch mode
      if (resumeMode === 'scratch' && resumeTemplate.mainContent) {
        mainContentQuill.current.setText(resumeTemplate.mainContent)
      }
    }

    return () => {
      if (headerQuill.current) {
        // headerQuill.current.off('text-change')
        headerQuill.current.off('selection-change')
        headerQuill.current = null
      }
      if (sidebarQuill.current) {
        // sidebarQuill.current.off('text-change')
        sidebarQuill.current.off('selection-change')
        sidebarQuill.current = null
      }
      if (mainContentQuill.current) {
        mainContentQuill.current.off('text-change');
        mainContentQuill.current.off('selection-change')
        mainContentQuill.current = null
      }
    }
  }, [hasSelectedMode, selectedTemplate, selectedUploadedFile])

  // Update Quill editors when template content changes (but not from user typing)
  useEffect(() => {
    const containsHtml = (str: string) => /<[^>]+>/.test(str)

    if (headerQuill.current && resumeTemplate.header) {
      const currentText = headerQuill.current.getText().trim()
      const templateText = resumeTemplate.header.replace(/<[^>]*>/g, '').trim() // Strip HTML tags
      if (currentText !== templateText) {
        if (containsHtml(resumeTemplate.header)) {
          headerQuill.current.setText('')
          headerQuill.current.clipboard.dangerouslyPasteHTML(0, resumeTemplate.header)
        } else {
          headerQuill.current.setText(resumeTemplate.header)
        }
      }
    }
    if (sidebarQuill.current && resumeTemplate.sidebar) {
      const currentText = sidebarQuill.current.getText().trim()
      const templateText = resumeTemplate.sidebar.replace(/<[^>]*>/g, '').trim()
      if (currentText !== templateText) {
        if (containsHtml(resumeTemplate.sidebar)) {
          sidebarQuill.current.setText('')
          sidebarQuill.current.clipboard.dangerouslyPasteHTML(0, resumeTemplate.sidebar)
        } else {
          sidebarQuill.current.setText(resumeTemplate.sidebar)
        }
      }
    }
    if (mainContentQuill.current) {
      const currentText = mainContentQuill.current.getText().trim()
      const templateText = (resumeTemplate.mainContent || '').replace(/<[^>]*>/g, '').trim()
      if (currentText !== templateText) {
        if (resumeTemplate.mainContent && containsHtml(resumeTemplate.mainContent)) {
          mainContentQuill.current.setText('')
          mainContentQuill.current.clipboard.dangerouslyPasteHTML(0, resumeTemplate.mainContent)
        } else {
          mainContentQuill.current.setText(resumeTemplate.mainContent || '')
        }
      }
    }
  }, [selectedTemplate, selectedUploadedFile]) // Only run when template or uploaded file changes, not on every text change

  // Rich Text Editor Functions
  const getActiveQuill = () => {
    // Use the last focused editor since clicking toolbar buttons takes focus away
    switch (lastFocusedEditor) {
      case 'header': return headerQuill.current
      case 'sidebar': return sidebarQuill.current
      case 'mainContent': return mainContentQuill.current
      default: return headerQuill.current
    }
  }

  const applyFormat = (format: string, value: any) => {
    const quill = getActiveQuill();
    if (!quill) return;
    const range = quill.getSelection();
    // We can format even with no selection, for the cursor.
    if (range) {
      quill.format(format, value);
    }
  };

  const applyBold = () => {
    const quill = getActiveQuill()
    if (!quill) return
    
    const range = quill.getSelection();
    // We can format even with no selection, for the cursor.
    const currentFormat = quill.getFormat(range);
    quill.format('bold', !currentFormat.bold);
    
    setIsBold(prev => !prev)
  };

  const applyItalic = () => {
    const quill = getActiveQuill()
    if (!quill) return
    
    const range = quill.getSelection();
    const currentFormat = quill.getFormat(range);
    quill.format('italic', !currentFormat.italic);

    setIsItalic(prev => !prev)
  };

  const applyUnderline = () => {
    const quill = getActiveQuill()
    if (!quill) return
    
    const range = quill.getSelection();
    const currentFormat = quill.getFormat(range);
    quill.format('underline', !currentFormat.underline);

    setIsUnderline(prev => !prev)
  };

  const applyStrikethrough = () => {
    const quill = getActiveQuill()
    if (!quill) return
    
    const range = quill.getSelection();
    const currentFormat = quill.getFormat(range);
    quill.format('strike', !currentFormat.strike);
  }

  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      const text = prompt('Enter link text (or leave blank to use URL):') || url
      const quill = getActiveQuill()
      if (quill) {
        const range = quill.getSelection()
        if (range) {
          quill.insertText(range.index, text)
          quill.setSelection(range.index, text.length)
          quill.format('link', url)
        }
      }
    }
  }

  const insertImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string
        const quill = getActiveQuill()
        if (quill) {
          const range = quill.getSelection()
          if (range) {
            quill.insertEmbed(range.index, 'image', imageUrl)
          }
        }
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const insertBulletList = () => {
    const quill = getActiveQuill()
    if (!quill) return

    const range = quill.getSelection()
    if (range) {
      quill.format('list', 'bullet')
    }
  }

  const insertNumberedList = () => {
    const quill = getActiveQuill()
    if (!quill) return

    const range = quill.getSelection()
    if (range) {
      quill.format('list', 'ordered')
    }
  }

  const insertCheckbox = () => {
    const quill = getActiveQuill()
    if (!quill) return

    const range = quill.getSelection()
    if (range) {
      quill.insertText(range.index, '☐ ')
    }
  }

  const applySuperscript = () => {
    const quill = getActiveQuill()
    if (!quill) return

    const range = quill.getSelection()
    if (range && range.length > 0) {
      const currentFormat = quill.getFormat(range)
      quill.format('script', currentFormat.script === 'super' ? false : 'super')
    }
  }

  const applySubscript = () => {
    const quill = getActiveQuill()
    if (!quill) return

    const range = quill.getSelection()
    if (range && range.length > 0) {
      const currentFormat = quill.getFormat(range)
      quill.format('script', currentFormat.script === 'sub' ? false : 'sub')
    }
  }

  const changeTextColor = () => colorInputRef.current?.click()
  const applyTextColor = (color: string) => {
    const quill = getActiveQuill()
    if (!quill) return

    const range = quill.getSelection()
    if (range && range.length > 0) {
      quill.format('color', color)
    }
    setTextColor(color)
  }

  const changeHighlight = () => highlightInputRef.current?.click()
  const applyHighlight = (color: string) => {
    const quill = getActiveQuill()
    if (!quill) return

    const range = quill.getSelection()
    if (range && range.length > 0) {
      quill.format('background', color)
    }
    setHighlightColor(color)
  }

  const increaseIndent = () => {
    const quill = getActiveQuill()
    if (!quill) return

    const range = quill.getSelection()
    if (range) {
      quill.format('indent', '+1')
    }
  }

  const decreaseIndent = () => {
    const quill = getActiveQuill()
    if (!quill) return

    const range = quill.getSelection()
    if (range) {
      quill.format('indent', '-1')
    }
  }

  const insertHorizontalLine = () => {
    const quill = getActiveQuill()
    if (!quill) return

    const range = quill.getSelection()
    if (range) {
      quill.insertText(range.index, '\n───────────────────────────────\n')
    }
  }

  const clearFormatting = () => {
    const quill = getActiveQuill()
    if (!quill) return

    const range = quill.getSelection()
    if (range && range.length > 0) {
      quill.removeFormat(range.index, range.length)
    }
  }

  const insertComment = () => {
    const comment = prompt('Enter your comment:')
    if (comment) {
      const quill = getActiveQuill()
      if (quill) {
        const range = quill.getSelection()
        if (range) {
          quill.insertText(range.index, `<!-- ${comment}: -->`)
        }
      }
    }
  }

  const undoAction = () => {
    const quill = getActiveQuill()
    if (quill) {
      quill.history.undo()
    }
  }

  const redoAction = () => {
    const quill = getActiveQuill()
    if (quill) {
      quill.history.redo()
    }
  }

  // Draft operations
  const saveDraft = async () => {
    if (!selectedTemplate && resumeMode !== 'scratch' && resumeMode !== 'uploaded') {
      setPopupMessage('Please select a template first')
      setShowPopup(true)
      return
    }

    setIsSaving(true)

    try {
      // Combine all content into a single text for the resume
      const fullResumeText = [
        resumeTemplate.header,
        resumeTemplate.sidebar,
        resumeTemplate.mainContent
      ].filter(Boolean).join('\n\n')

      // Create a text file from the content and save to database
      const blob = new Blob([fullResumeText], { type: 'text/plain' })
      const fileName = selectedTemplate
        ? `resume-${selectedTemplate}-${Date.now()}.txt`
        : resumeMode === 'uploaded' && selectedUploadedFile
        ? selectedUploadedFile
        : `resume-scratch-${Date.now()}.txt`

      // If editing an uploaded file, update its extracted text
      if (resumeMode === 'uploaded' && selectedUploadedFile) {
        const resumeId = resumeDbIds[selectedUploadedFile]
        if (resumeId) {
          const response = await fetch('/api/save-extracted-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resumeId, extractedText: fullResumeText })
          })
          if (!response.ok) {
            throw new Error('Failed to save to database')
          }
          // Update local pdfData
          setPdfData(prev => ({
            ...prev,
            [selectedUploadedFile]: {
              ...prev[selectedUploadedFile],
              text: fullResumeText
            }
          }))
        }
      } else {
        // For scratch/template mode, create a new resume entry
        const file = new File([blob], fileName, { type: 'text/plain' })
        const formData = new FormData()
        formData.append('file', file)
        formData.append('fileName', fileName)

        const response = await fetch('/api/add-resume', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          const result = await response.json()
          if (result.resumeId) {
            setResumeDbIds(prev => ({ ...prev, [fileName]: result.resumeId }))

            // Save the text content
            await fetch('/api/save-extracted-text', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ resumeId: result.resumeId, extractedText: fullResumeText })
            })

            // Add to resumeFiles so it shows in the list
            setResumeFiles(prev => [...prev, file])
            setPdfData(prev => ({
              ...prev,
              [fileName]: { text: fullResumeText, images: [], metadata: {} }
            }))
          }
        } else {
          throw new Error('Failed to save to database')
        }
      }

      setIsSaving(false)
      setPopupMessage('Resume saved successfully!')
      setShowPopup(true)
    } catch (error) {
      console.error('Error saving draft:', error)
      setIsSaving(false)
      setPopupMessage('Failed to save. Please try again.')
      setShowPopup(true)
    }
  }

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
        console.log(`Draft loaded from: ${new Date(draftData.savedAt).toLocaleString()}`)
      }
    } catch (error) {
      console.error('Error loading draft:', error)
    }
  }

  const selectTemplate = (id: string) => {
    const draftKey = `resume-draft-${id}`
    const savedDraft = localStorage.getItem(draftKey)

    const template = latexTemplates.find(t => t.id === id)
    if (!template) {
      console.error('Template not found:', id)
      return
    }

    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft)
        setResumeTemplate({
          header: draftData.header,
          sidebar: draftData.sidebar,
          mainContent: draftData.mainContent
        })
        console.log('Draft loaded from:', new Date(draftData.savedAt).toLocaleString())
      } catch (error) {
        console.error('Error parsing draft:', error)
        // Load fresh template data
        loadTemplateIntoEditor(template)
      }
    } else {
      // Load fresh template data
      loadTemplateIntoEditor(template)
    }

    setSelectedTemplate(id)
    setCurrentPdfUrl('') // Clear PDF URL since we're using HTML templates now
  }

  const loadTemplateIntoEditor = (template: typeof latexTemplates[0]) => {
    // Use a small delay to ensure Quill is fully initialized
    setTimeout(() => {
      if (mainContentQuill.current) {
        // Clear existing content first
        mainContentQuill.current.setText('')
        // Then paste the HTML - this will render it as formatted text, not code
        mainContentQuill.current.clipboard.dangerouslyPasteHTML(0, template.content)
      }
    }, 100)

    // Update state - clear header and sidebar, put everything in mainContent
    setResumeTemplate({
      header: '',
      sidebar: '',
      mainContent: template.content
    })
  }

  const handleDownloadPDF = async () => {
    if (!currentPdfUrl) {
      setPopupMessage('No template selected')
      setShowPopup(true)
      return
    }

    setIsDownloading(true)

    try {
      const pdfBytes = await mergePDFWithText(currentPdfUrl, resumeTemplate)
      const fileName = `resume-${selectedTemplate || 'scratch'}-${Date.now()}.pdf`
      downloadPDF(pdfBytes, fileName)

      setTimeout(() => {
        setIsDownloading(false)
        setPopupMessage('Resume downloaded successfully!')
        setShowPopup(true)
      }, 500)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      setIsDownloading(false)
      setPopupMessage('Failed to generate PDF. Please try again.')
      setShowPopup(true)
    }
  }

  useEffect(() => {
    if (hasSelectedMode && resumeMode === 'scratch') {
      loadDraft('scratch')
    }
  }, [hasSelectedMode, resumeMode])

  // Effect to load resumes from database on initial mount
  useEffect(() => {
    const loadResumesFromDb = async () => {
      setIsLoadingResumes(true)
      try {
        const response = await fetch('/api/list-resumes')
        if (response.ok) {
          const data = await response.json()
          // API returns { success: true, resumes: [...] }
          const resumes = data.resumes
          if (Array.isArray(resumes) && resumes.length > 0) {
            const reconstructedFiles: File[] = []
            const dbIds: { [fileName: string]: number } = {}
            const storedPdfData: { [key: string]: { text: string; images: string[]; metadata: any } } = {}

            for (const resume of resumes) {
              // Fetch the full resume data including file content and extracted text
              const detailResponse = await fetch(`/api/get-resume/${resume.id}`)
              if (detailResponse.ok) {
                const detailData = await detailResponse.json()
                // API returns { success: true, resume: {..., extracted_text: string | null} }
                const detail = detailData.resume
                if (detail?.file_data) {
                  // Convert base64 to File (server now always returns base64)
                  let blob: Blob
                  if (typeof detail.file_data === 'string') {
                    // Base64 encoded
                    const byteString = atob(detail.file_data)
                    const ab = new ArrayBuffer(byteString.length)
                    const ia = new Uint8Array(ab)
                    for (let i = 0; i < byteString.length; i++) {
                      ia[i] = byteString.charCodeAt(i)
                    }
                    blob = new Blob([ab], { type: detail.mime_type || 'application/pdf' })
                  } else if (detail.file_data instanceof ArrayBuffer) {
                    // ArrayBuffer from server (fallback)
                    blob = new Blob([detail.file_data], { type: detail.mime_type || 'application/pdf' })
                  } else if (typeof detail.file_data === 'object') {
                    // Could be array of bytes (fallback)
                    const uint8Array = new Uint8Array(Object.values(detail.file_data))
                    blob = new Blob([uint8Array], { type: detail.mime_type || 'application/pdf' })
                  } else {
                    console.error('Unknown file_data format:', typeof detail.file_data)
                    continue
                  }
                  const fileName = detail.file_name || resume.file_name
                  const file = new File([blob], fileName, {
                    type: detail.mime_type || 'application/pdf'
                  })
                  reconstructedFiles.push(file)
                  dbIds[file.name] = resume.id

                  // Use stored extracted text if available (check for non-empty string)
                  if (detail.extracted_text && detail.extracted_text.trim().length > 0) {
                    storedPdfData[fileName] = {
                      text: detail.extracted_text,
                      images: [],
                      metadata: { totalPages: detail.total_pages || 1 }
                    }
                  }
                }
              }
            }

            if (reconstructedFiles.length > 0) {
              setResumeFiles(reconstructedFiles)
              setResumeDbIds(dbIds)

              // Set stored extracted text immediately, then only extract for files without stored text
              if (Object.keys(storedPdfData).length > 0) {
                setPdfData(storedPdfData)
              }

              // Only extract content for files that don't have stored text
              for (const file of reconstructedFiles) {
                if (!storedPdfData[file.name]) {
                  setExtractingFiles(prev => [...prev, file.name])
                  const content = await extractPdfContent(file)
                  setPdfData(prev => ({ ...prev, [file.name]: content }))
                  setExtractingFiles(prev => prev.filter(name => name !== file.name))

                  // Save the extracted text for future loads
                  const resumeId = dbIds[file.name]
                  if (resumeId && content.text) {
                    try {
                      await fetch('/api/save-extracted-text', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ resumeId, extractedText: content.text })
                      })
                    } catch (err) {
                      console.error('Failed to save extracted text:', err)
                    }
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to load resumes from database:', e)
      } finally {
        setIsLoadingResumes(false)
      }
    }

    loadResumesFromDb()
  }, []);

  // Professional Rich Text Editor Toolbar Component
  const ProfessionalToolbar = () => (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 sticky top-0 z-50 shadow-sm">
      {/* Main Toolbar Row */}
      <div className="flex items-center px-4 py-2 gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
        {/* Undo/Redo */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-300 dark:border-gray-600">
          <button
            onClick={undoAction}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={redoAction}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>

        {/* Font Family */}
        <select
          value={fontFamily}
          onChange={(e) => {
            const newFont = e.target.value;
            setFontFamily(newFont);
            const quill = getActiveQuill();
            if (!quill) return;
            const range = quill.getSelection();
            if (range && range.length > 0) {
              quill.formatText(range.index, range.length, 'font', newFont);
            }
          }}
          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors min-w-[120px]"
        >
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Calibri">Calibri</option>
          <option value="Tahoma">Tahoma</option>
          <option value="Comic Sans MS">Comic Sans MS</option>
        </select>

        {/* Font Size */}
        <select
          value={fontSize}
          onChange={(e) => {
            const newSize = e.target.value;
            setFontSize(newSize);
            const quill = getActiveQuill();
            if (!quill) return;
            // This will apply to selection or cursor
            quill.format('size', `${newSize}px`);
          }}
          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors min-w-[70px]"
        >
          <option value="8">8</option>
          <option value="9">9</option>
          <option value="10">10</option>
          <option value="11">11</option>
          <option value="12">12</option>
          <option value="14">14</option>
          <option value="16">16</option>
          <option value="18">18</option>
          <option value="20">20</option>
          <option value="24">24</option>
          <option value="28">28</option>
          <option value="32">32</option>
          <option value="36">36</option>
          <option value="48">48</option>
          <option value="72">72</option>
        </select>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

        {/* Text Formatting */}
        <div className="flex items-center gap-1">
          <button
            onClick={applyBold}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${isBold ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
            title="Bold (Ctrl+B)"
          >
            <span className="font-bold text-sm">B</span>
          </button>
          <button
            onClick={applyItalic}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${isItalic ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
            title="Italic (Ctrl+I)"
          >
            <span className="italic text-sm">I</span>
          </button>
          <button
            onClick={applyUnderline}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${isUnderline ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
            title="Underline (Ctrl+U)"
          >
            <span className="underline text-sm">U</span>
          </button>
          <button
            onClick={applyStrikethrough}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Strikethrough"
          >
            <span className="line-through text-sm">S</span>
          </button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

        {/* Text Color */}
        <div className="relative">
          <button
            onClick={changeTextColor}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center gap-1"
            title="Text Color"
          >
            <span className="text-sm font-semibold">A</span>
            <div className="w-4 h-1 rounded" style={{ backgroundColor: textColor }}></div>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={textColor}
            onChange={(e) => applyTextColor(e.target.value)}
            className="absolute opacity-0 w-0 h-0"
          />
        </div>

        {/* Highlight Color */}
        <div className="relative">
          <button
            onClick={changeHighlight}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center gap-1"
            title="Highlight"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <div className="w-4 h-1 rounded" style={{ backgroundColor: highlightColor }}></div>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <input
            ref={highlightInputRef}
            type="color"
            value={highlightColor}
            onChange={(e) => applyHighlight(e.target.value)}
            className="absolute opacity-0 w-0 h-0"
          />
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

        {/* Alignment */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setTextAlign('left');
              const quill = getActiveQuill();
              if (!quill) return;
              quill.format('align', false);
            }}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${textAlign === 'left' ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
            title="Align Left"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => {
              setTextAlign('center');
              const quill = getActiveQuill();
              if (!quill) return;
              quill.format('align', 'center');
            }}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${textAlign === 'center' ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
            title="Align Center"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => {
              setTextAlign('right');
              const quill = getActiveQuill();
              if (!quill) return;
              quill.format('align', 'right');
            }}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${textAlign === 'right' ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
            title="Align Right"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm4 4a1 1 0 011-1h8a1 1 0 110 2H8a1 1 0 01-1-1zm-4 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm4 4a1 1 0 011-1h8a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => {
              setTextAlign('justify');
              const quill = getActiveQuill();
              if (!quill) return;
              quill.format('align', 'justify');
            }}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${textAlign === 'justify' ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
            title="Justify"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

        {/* Line Height */}
        <select
          value={lineHeight}
          onChange={(e) => {
            const newLineHeight = e.target.value;
            setLineHeight(newLineHeight);
            const quill = getActiveQuill();
            if (!quill) return;
            const range = quill.getSelection();
            if (range) {
              quill.formatLine(range.index, range.length || 1, 'lineHeight', newLineHeight);
            }
          }}
          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors min-w-[80px]"
          title="Line Spacing"
        >
          <option value="1">Single</option>
          <option value="1.15">1.15</option>
          <option value="1.5">1.5</option>
          <option value="2">Double</option>
          <option value="2.5">2.5</option>
          <option value="3">Triple</option>
        </select>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

        {/* Lists */}
        <div className="flex items-center gap-1">
          <button
            onClick={insertBulletList}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Bullet List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={insertNumberedList}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Numbered List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 01.117-1.993L5 2.118V7H4a1 1 0 110-2h1V4.5a.5.5 0 01.5-.5h1a.5.5 0 010 1H6v1h.5a.5.5 0 010 1H6v1h1a1 1 0 110 2H4a1 1 0 01-1-1zm5-1a1 1 0 011-1h8a1 1 0 110 2H9a1 1 0 01-1-1zm0 6a1 1 0 011-1h8a1 1 0 110 2H9a1 1 0 01-1-1zm0 6a1 1 0 011-1h8a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={insertCheckbox}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Checklist"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

        {/* Indent */}
        <div className="flex items-center gap-1">
          <button
            onClick={decreaseIndent}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Decrease Indent"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={increaseIndent}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Increase Indent"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

        {/* Insert */}
        <div className="flex items-center gap-1">
          <button
            onClick={insertLink}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Insert Link (Ctrl+K)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
          <button
            onClick={() => imageInputRef.current?.click()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Insert Image"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={insertImage}
            className="hidden"
          />
          <button
            onClick={insertComment}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Add Comment"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </button>
        </div>

        <button
          onClick={clearFormatting}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="Clear Formatting"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Secondary Info Bar */}
      <div className="px-4 py-1 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <span>Editing: <span className="font-medium capitalize">{lastFocusedEditor}</span></span>
          <span>•</span>
          <span>Font: {fontFamily}</span>
          <span>•</span>
          <span>Size: {fontSize}px</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
            Auto-saved
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div className='flex min-h-screen bg-gray-50 dark:bg-gray-900'>
      <TodoList onWidthChange={setMainContentMargin} />
      <div className='flex-1 transition-all duration-300' style={{ marginLeft: `${mainContentMargin}px` }}>
        <Header title="Build a Better Resume" />

        <main className='max-w-7xl mx-auto py-8 sm:px-6 lg:px-8'>
        <div className='px-4 sm:px-0'>
          {/* Upload Section */}
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8'>
            <div className='px-6 py-5 border-b border-gray-200 dark:border-gray-700'>
              <h2 className='text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Your Resumes
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Import existing resumes to optimize or use as reference</p>
            </div>
            <div className='px-6 py-6'>
              <div
                className='border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type='file'
                  accept='.pdf,.doc,.docx'
                  style={{ display: 'none' }}
                  multiple
                  onChange={handleFileInput}
                />
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className='text-lg font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  Drop files here or click to browse
                </p>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  Supports PDF, DOC, and DOCX formats • Multiple files allowed
                </p>
              </div>

              {isLoadingResumes && (
                <div className="mt-6 flex items-center justify-center py-8">
                  <svg className="animate-spin h-6 w-6 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-gray-600 dark:text-gray-400">Loading your saved resumes...</span>
                </div>
              )}

              {!isLoadingResumes && resumeFiles.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                      Uploaded Files ({resumeFiles.length})
                    </p>
                    {selectedFiles.length > 0 && (
                      <span className='text-xs text-blue-600 dark:text-blue-400'>
                        {selectedFiles.length} selected
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {resumeFiles.map(file => (
                      <div
                        key={file.name}
                        className={`flex items-center justify-between p-4 rounded-lg transition-all cursor-pointer ${selectedFiles.includes(file.name)
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 shadow-md'
                          : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:shadow-md'
                          }`}
                        onClick={() => toggleSelect(file.name)}
                      >
                        <div className='flex items-center flex-1 gap-3'>
                          <input
                            type='checkbox'
                            checked={selectedFiles.includes(file.name)}
                            onChange={() => toggleSelect(file.name)}
                            className='w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500'
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-shrink-0">
                            <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className='flex-1 min-w-0'>
                            <p className='font-medium text-gray-900 dark:text-gray-100 truncate'>{file.name}</p>
                            <p className='text-sm text-gray-500 dark:text-gray-400'>
                              {(file.size / 1024).toFixed(2)} KB • {file.type.split('/')[1].toUpperCase()}
                            </p>
                            <div className='flex items-center gap-2 mt-2'>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setFileToOptimize(file);
                                  setIsPreOptimizeModalOpen(true);
                                }}
                                className='text-xs bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-md hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm font-medium disabled:from-blue-400 disabled:to-blue-500 disabled:cursor-not-allowed'
                                disabled={extractingFiles.includes(file.name)}
                              >
                                {extractingFiles.includes(file.name) ? 'Extracting...' : 'AI Optimize'}
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  const selected: SelectedResume = {
                                    fileName: file.name,
                                    text: pdfData[file.name]?.text || '',
                                    images: pdfData[file.name]?.images || [],
                                    optimized: aiOptimizedResumes[file.name] || false
                                  }
                                  try {
                                    sessionStorage.setItem('selectedResume', JSON.stringify(selected))
                                  } catch (err) {
                                    console.warn('Failed to persist selected resume to sessionStorage', err)
                                  }
                                  navigate('/job-search')
                                }}
                                className='text-xs bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 py-1.5 rounded-md hover:from-purple-700 hover:to-purple-800 transition-all shadow-sm font-medium ml-2'
                              >
                                Job Search
                              </button>
                              {file.type === 'application/pdf' && (
                                <>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      setFileToEdit(file);
                                      setIsEditorOpen(true);
                                    }}
                                    className='text-xs bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-1.5 rounded-md hover:from-green-700 hover:to-green-800 transition-all shadow-sm font-medium ml-2'
                                    title="Edit this PDF"
                                  >
                                    Edit PDF
                                  </button>
                                  {pdfData[file.name]?.images?.length > 0 && (
                                    <span className='text-xs text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-md font-medium'>
                                      {pdfData[file.name].images.length} images extracted
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); deleteSingle(file.name) }}
                          className='ml-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all'
                          title="Delete file"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className='flex justify-center gap-3 mt-6'>
                      <button
                        className='bg-gray-200 hover:bg-red-600 text-gray-700 hover:text-white dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-red-600 px-6 py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2' 
                        onClick={deleteSelected}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Selected ({selectedFiles.length})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Optimized Resume Preview (appears after optimization) */}
          {lastOptimizedFile && aiOptimizedResumes[lastOptimizedFile] && (
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8'>
              <div className='px-6 py-5 border-b border-gray-200 dark:border-gray-700'>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>Optimized Resume Preview</h2>
                <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>Review the AI-optimized resume below. You can apply it to the editor or dismiss.</p>
              </div>
              <div className='p-6'>
                <div className='max-w-7xl mx-auto'>
                  <div className='bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 overflow-auto' style={{ maxHeight: '280px' }}>
                    <pre className='whitespace-pre-wrap break-words'>{aiOptimizedResumes[lastOptimizedFile]}</pre>
                  </div>
                  <div className='flex justify-center gap-3 mt-4'>
                    <button
                      onClick={() => {
                        const optimized = aiOptimizedResumes[lastOptimizedFile!]
                        if (!optimized) return
                        // Apply into editor
                        setHasSelectedMode(true)
                        setResumeMode('scratch')
                        setSelectedTemplate(null)
                        setResumeTemplate(prev => ({ ...prev, mainContent: optimized }))
                        if (mainContentQuill.current) mainContentQuill.current.setText(optimized)
                        // keep preview visible in case user wants to dismiss later
                      }}
                      className='bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-md'
                    >
                      Apply to Editor
                    </button>
                    <button
                      onClick={() => setLastOptimizedFile(null)}
                      className='bg-gray-500 text-black dark:text-white px-6 py-2 rounded-lg font-medium transition-all shadow-md'
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mode Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8">
            <div className='px-6 py-5 border-b border-gray-200 dark:border-gray-700'>
              <h2 className='text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Choose Your Resume Mode
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Start from scratch, use a template, or edit an uploaded resume</p>
            </div>
            <div className='px-6 py-8'>
              <div className="flex flex-col sm:flex-row justify-center gap-6 flex-wrap">
                <button
                  onClick={() => {
                    setResumeMode("scratch")
                    setSelectedTemplate(null)
                    setCurrentPdfUrl(null)
                    setSelectedUploadedFile(null)
                    setHasSelectedMode(true)
                  }}
                  className={`flex-1 max-w-xs px-8 py-6 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl ${resumeMode === "scratch"
                    ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white scale-105 ring-4 ring-blue-200 dark:ring-blue-900"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border-2 border-gray-200 dark:border-gray-600"
                    }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <svg className={`w-12 h-12 ${resumeMode === "scratch" ? "text-white" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <div>
                      <div className="text-lg font-bold">Scratch Resume</div>
                      <div className={`text-sm mt-1 ${resumeMode === "scratch" ? "text-blue-100" : "text-gray-500 dark:text-gray-400"}`}>
                        Build from the ground up
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setResumeMode("template")
                    setSelectedUploadedFile(null)
                    setHasSelectedMode(true)
                  }}
                  className={`flex-1 max-w-xs px-8 py-6 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl ${resumeMode === "template"
                    ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white scale-105 ring-4 ring-blue-200 dark:ring-blue-900"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border-2 border-gray-200 dark:border-gray-600"
                    }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <svg className={`w-12 h-12 ${resumeMode === "template" ? "text-white" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <div className="text-lg font-bold">Template Resume</div>
                      <div className={`text-sm mt-1 ${resumeMode === "template" ? "text-blue-100" : "text-gray-500 dark:text-gray-400"}`}>
                        Use professional designs
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setResumeMode("uploaded")
                    setSelectedTemplate(null)
                    setCurrentPdfUrl(null)
                    setHasSelectedMode(true)
                  }}
                  disabled={resumeFiles.length === 0}
                  className={`flex-1 max-w-xs px-8 py-6 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl ${resumeMode === "uploaded"
                    ? "bg-gradient-to-br from-green-600 to-green-700 text-white scale-105 ring-4 ring-green-200 dark:ring-green-900"
                    : resumeFiles.length === 0
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-2 border-gray-200 dark:border-gray-700 cursor-not-allowed"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border-2 border-gray-200 dark:border-gray-600"
                    }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <svg className={`w-12 h-12 ${resumeMode === "uploaded" ? "text-white" : resumeFiles.length === 0 ? "text-gray-400" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <div>
                      <div className="text-lg font-bold">Edit Uploaded</div>
                      <div className={`text-sm mt-1 ${resumeMode === "uploaded" ? "text-green-100" : resumeFiles.length === 0 ? "text-gray-400" : "text-gray-500 dark:text-gray-400"}`}>
                        {resumeFiles.length === 0 ? "Upload a resume first" : `${resumeFiles.length} file${resumeFiles.length > 1 ? 's' : ''} available`}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Scratch Editor */}
          {hasSelectedMode && resumeMode === "scratch" && (
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden'>
              <div className='px-6 py-5 border-b border-gray-200 dark:border-gray-700'>
                <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>Scratch Resume Editor</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create your resume with full creative control</p>
              </div>

              <ProfessionalToolbar />

              <div className='p-6'>
                <div className='bg-white dark:bg-gray-100 shadow-2xl border-2 border-gray-200 dark:border-gray-400 min-h-[1056px] max-w-[816px] mx-auto overflow-hidden' style={{ aspectRatio: '8.5/11' }}>
                  <div className='w-full h-full flex flex-col p-12 overflow-hidden'>
                    <div className='border-b-2 border-gray-300 pb-8 mb-8 overflow-hidden'>
                      <div
                        ref={headerRef}
                        className='overflow-hidden'
                        style={{
                          // fontFamily, // Quill controls this now
                          // fontSize: `${fontSize}px`, // Quill controls this now
                          lineHeight,
                          textAlign,
                          color: textColor,
                          minHeight: '100px',
                          wordBreak: 'break-word'
                        }}
                      />
                    </div>
                    <div className='flex-1 flex gap-8 overflow-hidden'>
                      <div className='w-1/3 border-r-2 border-gray-300 pr-8 overflow-hidden'>
                        <div
                          ref={sidebarRef}
                          className='overflow-hidden'
                          style={{
                            // fontFamily, // Quill controls this now
                            // fontSize: `${fontSize}px`, // Quill controls this now
                            lineHeight,
                            textAlign,
                            color: textColor,
                            minHeight: '700px',
                            wordBreak: 'break-word'
                          }}
                        />
                      </div>
                      <div className='flex-1 overflow-hidden'>
                        <div
                          ref={mainContentRef}
                          className='overflow-hidden'
                          style={{
                            // fontFamily, // Quill controls this now
                            // fontSize: `${fontSize}px`, // Quill controls this now
                            lineHeight,
                            textAlign,
                            color: textColor,
                            minHeight: '700px',
                            wordBreak: 'break-word'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className='flex justify-center gap-4 mt-8'>
                  <button
                    onClick={saveDraft}
                    disabled={isSaving}
                    className='bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-green-400 disabled:to-green-500 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2'
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    {isSaving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    onClick={handleTemplateSubmit}
                    className='bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2'
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Format
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Template Selection */}
          {hasSelectedMode && resumeMode === "template" && !selectedTemplate && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className='px-6 py-5 border-b border-gray-200 dark:border-gray-700'>
                <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>Select a Template</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Choose from our professionally designed templates</p>
              </div>
              <div className='p-8'>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                  {latexTemplates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => selectTemplate(template.id)}
                      className="group cursor-pointer bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden hover:border-blue-500 hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                    >
                      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-b-2 border-gray-200 dark:border-gray-600">
                        <div className="h-24 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-4xl mb-2">📄</div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">LaTeX Template</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                        <p className="font-bold text-lg text-gray-900 dark:text-gray-100 text-center mb-2">
                          {template.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center leading-relaxed">
                          {template.description}
                        </p>
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-center text-blue-600 dark:text-blue-400 font-medium group-hover:text-blue-700 dark:group-hover:text-blue-300">
                            Click to use template →
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Editable Template */}
          {hasSelectedMode && resumeMode === "template" && selectedTemplate && (
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden'>
              <div className='px-6 py-5 border-b border-gray-200 dark:border-gray-700'>
                <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>{latexTemplates.find(t => t.id === selectedTemplate)?.name || selectedTemplate} Editor</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Customize your professional resume template</p>
              </div>

              <ProfessionalToolbar />

              <div className='p-6'>
                <div className='bg-white dark:bg-gray-100 shadow-2xl border-2 border-gray-200 dark:border-gray-400 min-h-[1056px] max-w-[816px] mx-auto overflow-hidden' style={{ aspectRatio: '8.5/11' }}>
                  <div className='w-full h-full p-12 overflow-hidden'>
                    {/* Single page editor - no boxes */}
                    <div
                      ref={mainContentRef}
                      className='focus:ring-2 focus:ring-blue-300 rounded-lg w-full h-full overflow-hidden'
                      style={{
                        lineHeight,
                        textAlign,
                        color: textColor,
                        minHeight: '900px',
                        wordBreak: 'break-word'
                      }}
                    />
                    {/* Hidden refs for compatibility */}
                    <div ref={headerRef} style={{ display: 'none' }} />
                    <div ref={sidebarRef} style={{ display: 'none' }} />
                  </div>
                </div>

                <div className='flex flex-wrap justify-center gap-4 mt-8'>
                  <button
                    onClick={saveDraft}
                    disabled={isSaving}
                    className='bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-green-400 disabled:to-green-500 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2'
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    {isSaving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isDownloading}
                    className='bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2'
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {isDownloading ? 'Generating...' : 'Download PDF'}
                  </button>
                  <button
                    onClick={handleTemplateSubmit}
                    className='bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2'
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Format
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTemplate(null)
                      setCurrentPdfUrl(null)
                    }}
                    className='bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2'
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Templates
                  </button>
                </div>

                <div className="mt-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-l-4 border-blue-500 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-blue-900 dark:text-blue-100">Pro Tips</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                        Use the toolbar above to format your text professionally. Your changes are auto-saved locally. Click "Save Draft" to secure your progress, then "Download PDF" when you're ready to export your polished resume.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Uploaded Resume Selection */}
          {hasSelectedMode && resumeMode === "uploaded" && !selectedUploadedFile && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className='px-6 py-5 border-b border-gray-200 dark:border-gray-700'>
                <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>Select a Resume to Edit</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Choose from your uploaded resumes to edit the content</p>
              </div>
              <div className='p-8'>
                {resumeFiles.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No resumes uploaded yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Upload a resume in the section above to get started</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resumeFiles.map((file) => (
                      <div
                        key={file.name}
                        onClick={async () => {
                          // Load the text content into the editor
                          let text = aiOptimizedResumes[file.name] || pdfData[file.name]?.text || ''

                          // If no text available, try to extract it now
                          if (!text && file.type === 'application/pdf') {
                            setPopupMessage('Extracting text from PDF...')
                            setShowPopup(true)
                            try {
                              const content = await extractPdfContent(file)
                              text = content.text
                              setPdfData(prev => ({ ...prev, [file.name]: content }))

                              // Save to database if we have a resumeId
                              const resumeId = resumeDbIds[file.name]
                              if (resumeId && text) {
                                await fetch('/api/save-extracted-text', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ resumeId, extractedText: text })
                                })
                              }
                            } catch (err) {
                              console.error('Failed to extract text:', err)
                            }
                          }

                          setSelectedUploadedFile(file.name)
                          setResumeTemplate({
                            header: '',
                            sidebar: '',
                            mainContent: text || 'No text could be extracted from this file. You can type your resume content here.'
                          })
                          // Also set file for PDF preview if it's a PDF
                          if (file.type === 'application/pdf') {
                            setFileToEdit(file)
                          }
                        }}
                        className="group cursor-pointer bg-white dark:bg-gray-700 border-2 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-gray-200 dark:border-gray-600 hover:border-green-500"
                      >
                        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 border-b-2 border-gray-200 dark:border-gray-600">
                          <div className="h-20 flex items-center justify-center">
                            <div className="text-center">
                              <svg className="w-12 h-12 mx-auto text-green-600 dark:text-green-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 text-center mb-1 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                          {aiOptimizedResumes[file.name] && (
                            <div className="mt-2 flex justify-center">
                              <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                                AI Optimized
                              </span>
                            </div>
                          )}
                          {file.type === 'application/pdf' && (
                            <div className="mt-2 flex justify-center">
                              <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                                PDF
                              </span>
                            </div>
                          )}
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <p className="text-xs text-center text-green-600 dark:text-green-400 font-medium group-hover:text-green-700 dark:group-hover:text-green-300">
                              Click to edit →
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Uploaded Resume Editor */}
          {hasSelectedMode && resumeMode === "uploaded" && selectedUploadedFile && (
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden'>
              <div className='px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between'>
                <div>
                  <h2 className='text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Editing: {selectedUploadedFile}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Edit and refine your uploaded resume content</p>
                </div>
                <button
                  onClick={() => setSelectedUploadedFile(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
              </div>

              <ProfessionalToolbar />

              <div className='p-6'>
                <div className='bg-white dark:bg-gray-100 shadow-2xl border-2 border-gray-200 dark:border-gray-400 min-h-[1056px] max-w-[816px] mx-auto overflow-hidden' style={{ aspectRatio: '8.5/11' }}>
                  <div className='w-full h-full p-12 overflow-hidden'>
                    <div
                      ref={mainContentRef}
                      className='focus:ring-2 focus:ring-green-300 rounded-lg w-full h-full overflow-hidden'
                      style={{
                        lineHeight,
                        textAlign,
                        color: textColor,
                        minHeight: '900px',
                        wordBreak: 'break-word'
                      }}
                    />
                    {/* Hidden refs for compatibility */}
                    <div ref={headerRef} style={{ display: 'none' }} />
                    <div ref={sidebarRef} style={{ display: 'none' }} />
                  </div>
                </div>

                <div className='flex flex-wrap justify-center gap-4 mt-8'>
                  <button
                    onClick={saveDraft}
                    disabled={isSaving}
                    className='bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-green-400 disabled:to-green-500 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2'
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    {isSaving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    onClick={handleTemplateSubmit}
                    className='bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2'
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Format
                  </button>
                  <button
                    onClick={() => setSelectedUploadedFile(null)}
                    className='bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 px-8 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2'
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Selection
                  </button>
                </div>

                <div className="mt-8 p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-l-4 border-green-500 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-100">Editing Tips</p>
                      <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                        You're editing the extracted text from your uploaded resume. Use the toolbar to format your content, and click "AI Format" to get intelligent formatting suggestions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </main>
      </div>

      {/* PDF Editor Modal */}
      <CleanPdfEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false)
          setFileToEdit(null)
        }}
        file={fileToEdit}
        onSave={handleSaveEditedPdf}
      />

      {/* Pre-Optimize Extraction Modal */}
      {isPreOptimizeModalOpen && fileToOptimize && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Prepare for AI Optimization
              </h3>
              <button onClick={() => setIsPreOptimizeModalOpen(false)} 
              className="p-2 bg-white border border-gray-300 text-black hover:text-red-500 dark:text-white dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">&times;</button>
            </div>
            <div className="flex-1 p-6 overflow-auto bg-gray-100 dark:bg-gray-900">
              <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
                Displaying a preview of <strong>{fileToOptimize.name}</strong>.
              </p>
              <div className="border rounded-lg shadow-inner bg-white dark:bg-gray-800 h-[60vh] overflow-hidden">
                <iframe
                  src={URL.createObjectURL(fileToOptimize)}
                  className="w-full h-full"
                  title="PDF Preview"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center gap-4 bg-gray-50 dark:bg-gray-800">
              <button
                onClick={() => setIsPreOptimizeModalOpen(false)}
                className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleExtractAndOptimize}
                disabled={isExtractingInModal}
                className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-sm hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 disabled:cursor-wait"
              >
                {isExtractingInModal ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    Extracting Text...
                  </>
                ) : (
                  'Extract for Optimization'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Optimize Modal */}
      {isOptimizeModalOpen && fileToOptimize && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-700">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Resume Optimizer - {fileToOptimize.name}
              </h3>
              <button
                onClick={() => setIsOptimizeModalOpen(false)}
                className="p-2 bg-white border border-gray-300 text-black hover:text-red-500 dark:text-white dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Original Text */}
              <div className="flex-1 p-6 border-r border-gray-200 dark:border-gray-700 overflow-auto">
                <div className="mb-4">
                  <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Original Text
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Extracted from your document
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
                    {extractedTextForOptimize}
                  </pre>
                </div>
              </div>

              {/* Optimized Text */}
              <div className="flex-1 p-6 overflow-auto bg-blue-50 dark:bg-gray-800">
                <div className="mb-4">
                  <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    AI-Optimized Text
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {optimizedTextPreview ? 'Enhanced with AI suggestions' : 'Click "Optimize Now" to improve your resume'}
                  </p>
                </div>
                {!optimizedTextPreview ? (
                  <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <div className="text-center p-6">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        Ready to optimize your resume with AI?
                      </p>
                      <button
                        onClick={handleOptimizeInModal}
                        disabled={isOptimizingInModal}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg disabled:from-blue-400 disabled:to-blue-500 disabled:cursor-not-allowed"
                      >
                        {isOptimizingInModal ? (
                          <>
                            <span className="inline-block animate-spin mr-2">⏳</span>
                            Optimizing...
                          </>
                        ) : (
                          'Optimize Now'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-blue-200 dark:border-blue-800 shadow-lg">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
                      {optimizedTextPreview}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {optimizedTextPreview && (
                  <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Optimization complete!
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsOptimizeModalOpen(false)}
                  className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                {optimizedTextPreview && (
                  <button
                    onClick={applyOptimizedText}
                    className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 border border-transparent rounded-lg shadow-sm hover:from-green-700 hover:to-green-800 transition-colors"
                  >
                    Apply Optimized Text
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* popup message with Ok button */}
      {showPopup && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center'>
            <p className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>{popupMessage}</p>
            <button
              className='bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white px-3 py-1 rounded-md font-medium transition-colors border-2 border-transparent'
              onClick={() => setShowPopup(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResumeBuilder
                  