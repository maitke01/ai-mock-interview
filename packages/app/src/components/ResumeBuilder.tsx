import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SelectedResume } from '../types/resume'
import { extractImages, extractText } from 'unpdf'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import modernPreview from "./assets/modern-preview.png"
import classicPreview from "./assets/classic-preview.png"
import modernPDF from "./assets/pdfs/modern-template.pdf"
import classicPDF from "./assets/pdfs/classic-template.pdf"
import { mergePDFWithText, downloadPDF } from '../utils/pdfUtils'

type ExtractPromise<T> = T extends Promise<infer U> ? U : never

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
  const colorInputRef = useRef<HTMLInputElement>(null)
  const highlightInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)
  const headerQuill = useRef<Quill | null>(null)
  const sidebarQuill = useRef<Quill | null>(null)
  const mainContentQuill = useRef<Quill | null>(null)

  // File handling states
  const [resumeFiles, setResumeFiles] = useState<File[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [pdfData, setPdfData] = useState<{ [key: string]: { text: string; images: string[]; metadata: any } }>({})
  const [aiOptimizedResumes, setAiOptimizedResumes] = useState<{ [key: string]: string }>({})
  const [optimizingFiles, setOptimizingFiles] = useState<string[]>([])
  const [lastOptimizedFile, setLastOptimizedFile] = useState<string | null>(null)

  // Template states
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null)
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
  const [showMoreTools, setShowMoreTools] = useState(false)
  const [lastFocusedEditor, setLastFocusedEditor] = useState<'header' | 'sidebar' | 'mainContent'>('header')

  const quillFormats = [
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'indent',
    'link', 'image'
  ]

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

  // File operations
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
    } catch (error) {
      console.error('Error optimizing resume:', error)
      alert('Failed to optimize resume. Please try again.')
    } finally {
      setOptimizingFiles(prev => prev.filter(n => n !== fileName))
    }
  }

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
    }

    if (mainContentRef.current && !mainContentQuill.current) {
      mainContentQuill.current = new Quill(mainContentRef.current, {
        theme: 'snow',
        modules: { toolbar: false },
        formats: quillFormats,
        placeholder: 'PROFESSIONAL SUMMARY\n\nWORK EXPERIENCE\n\nPROJECTS'
      })
      
      mainContentQuill.current.on('text-change', () => {
        if (mainContentQuill.current) {
          handleTemplateChange('mainContent', mainContentQuill.current.root.innerHTML)
        }
      })

      mainContentQuill.current.on('selection-change', (range) => {
        if (range) {
          setLastFocusedEditor('mainContent')
        }
      })
    }

    return () => {
      if (headerQuill.current) {
        headerQuill.current.off('text-change')
        headerQuill.current.off('selection-change')
        headerQuill.current = null
      }
      if (sidebarQuill.current) {
        sidebarQuill.current.off('text-change')
        sidebarQuill.current.off('selection-change')
        sidebarQuill.current = null
      }
      if (mainContentQuill.current) {
        mainContentQuill.current.off('text-change')
        mainContentQuill.current.off('selection-change')
        mainContentQuill.current = null
      }
    }
  }, [hasSelectedMode, selectedTemplate])

  // Update Quill editors when template content changes (but not from user typing)
  useEffect(() => {
    if (headerQuill.current && resumeTemplate.header) {
      const currentText = headerQuill.current.getText().trim()
      const templateText = resumeTemplate.header.replace(/<[^>]*>/g, '').trim() // Strip HTML tags
      if (currentText !== templateText) {
        headerQuill.current.setText(resumeTemplate.header)
      }
    }
    if (sidebarQuill.current && resumeTemplate.sidebar) {
      const currentText = sidebarQuill.current.getText().trim()
      const templateText = resumeTemplate.sidebar.replace(/<[^>]*>/g, '').trim()
      if (currentText !== templateText) {
        sidebarQuill.current.setText(resumeTemplate.sidebar)
      }
    }
    if (mainContentQuill.current && resumeTemplate.mainContent) {
      const currentText = mainContentQuill.current.getText().trim()
      const templateText = resumeTemplate.mainContent.replace(/<[^>]*>/g, '').trim()
      if (currentText !== templateText) {
        mainContentQuill.current.setText(resumeTemplate.mainContent)
      }
    }
  }, [selectedTemplate]) // Only run when template changes, not on every text change

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

  const applyBold = () => {
    const quill = getActiveQuill()
    if (!quill) return
    
    const range = quill.getSelection()
    if (range && range.length > 0) {
      const currentFormat = quill.getFormat(range)
      quill.format('bold', !currentFormat.bold)
    }
    setIsBold(!isBold)
  }

  const applyItalic = () => {
    const quill = getActiveQuill()
    if (!quill) return
    
    const range = quill.getSelection()
    if (range && range.length > 0) {
      const currentFormat = quill.getFormat(range)
      quill.format('italic', !currentFormat.italic)
    }
    setIsItalic(!isItalic)
  }

  const applyUnderline = () => {
    const quill = getActiveQuill()
    if (!quill) return
    
    const range = quill.getSelection()
    if (range && range.length > 0) {
      const currentFormat = quill.getFormat(range)
      quill.format('underline', !currentFormat.underline)
    }
    setIsUnderline(!isUnderline)
  }

  const applyStrikethrough = () => {
    const quill = getActiveQuill()
    if (!quill) return
    
    const range = quill.getSelection()
    if (range && range.length > 0) {
      const currentFormat = quill.getFormat(range)
      quill.format('strike', !currentFormat.strike)
    }
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
        alert('Draft saved successfully!')
      }, 500)
    } catch (error) {
      console.error('Error saving draft:', error)
      setIsSaving(false)
      alert('Failed to save draft. Please try again.')
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

  const selectTemplate = (id: 'modern' | 'classic') => {
    const draftKey = `resume-draft-${id}`
    const savedDraft = localStorage.getItem(draftKey)
    
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
        setResumeTemplate(templatesData[id])
      }
    } else {
      setResumeTemplate(templatesData[id])
    }
    
    setSelectedTemplate(id)
    
    const templateData = templates.find(t => t.name === id)
    if (templateData) {
      setCurrentPdfUrl(templateData.pdf)
    }
  }

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
        alert('Resume downloaded successfully!')
      }, 500)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      setIsDownloading(false)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  useEffect(() => {
    if (hasSelectedMode && resumeMode === 'scratch') {
      loadDraft('scratch')
    }
  }, [hasSelectedMode, resumeMode])

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
          onChange={(e) => setFontFamily(e.target.value)}
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
          onChange={(e) => setFontSize(e.target.value)}
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
            <div className="w-4 h-1 rounded" style={{backgroundColor: textColor}}></div>
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
            <div className="w-4 h-1 rounded" style={{backgroundColor: highlightColor}}></div>
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
            onClick={() => setTextAlign('left')}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${textAlign === 'left' ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
            title="Align Left"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => setTextAlign('center')}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${textAlign === 'center' ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
            title="Align Center"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => setTextAlign('right')}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${textAlign === 'right' ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
            title="Align Right"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm4 4a1 1 0 011-1h8a1 1 0 110 2H8a1 1 0 01-1-1zm-4 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm4 4a1 1 0 011-1h8a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => setTextAlign('justify')}
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
          onChange={(e) => setLineHeight(e.target.value)}
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

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

        {/* More Tools Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMoreTools(!showMoreTools)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center gap-1"
            title="More Tools"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showMoreTools && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
              <button
                onClick={() => { applySuperscript(); setShowMoreTools(false) }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm flex items-center gap-2"
              >
                <span>x<sup>2</sup></span>
                <span>Superscript</span>
              </button>
              <button
                onClick={() => { applySubscript(); setShowMoreTools(false) }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm flex items-center gap-2"
              >
                <span>x<sub>2</sub></span>
                <span>Subscript</span>
              </button>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
              <button
                onClick={() => { insertHorizontalLine(); setShowMoreTools(false) }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
              >
                Horizontal Line
              </button>
              <button
                onClick={() => { clearFormatting(); setShowMoreTools(false) }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
              >
                Clear Formatting
              </button>
            </div>
          )}
        </div>
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
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Header Nav */}
      <div className='bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 shadow-lg'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h1 className='text-2xl font-bold text-white'>Resume Builder Pro</h1>
            </div>
            <nav className='flex space-x-6'>
              <button className='text-white font-medium hover:text-blue-100 transition-colors flex items-center gap-2' onClick={() => navigate('/dashboard')}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </button>
              <button className='text-white font-medium hover:text-blue-100 transition-colors flex items-center gap-2' onClick={() => navigate('/resume')}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                Resume Builder
              </button>
              <button className='text-white font-medium hover:text-blue-100 transition-colors flex items-center gap-2' onClick={() => navigate('/interview')}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Mock Interview
              </button>
            </nav>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto py-8 sm:px-6 lg:px-8'>
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

              {resumeFiles.length > 0 && (
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
                        className={`flex items-center justify-between p-4 rounded-lg transition-all cursor-pointer ${
                          selectedFiles.includes(file.name) 
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
                            {pdfData[file.name]?.text && (
                              <div className='flex items-center gap-2 mt-2'>
                                <button
                                  onClick={e => { e.stopPropagation(); optimizeResumeWithAI(file.name) }}
                                  className='text-xs bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-md hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm font-medium'
                                  disabled={optimizingFiles.includes(file.name)}
                                >
                                  {optimizingFiles.includes(file.name) ? 'Optimizing...' : 'AI Optimize'}
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
                                  className='text-xs bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-md hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm font-medium ml-2'
                                >
                                  Job Search
                                </button>
                                {pdfData[file.name]?.images?.length > 0 && (
                                  <span className='text-xs text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-md font-medium'>
                                    {pdfData[file.name].images.length} images extracted
                                  </span>
                                )}
                              </div>
                            )}
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
                        className='bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2' 
                        onClick={deleteSelected}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Selected ({selectedFiles.length})
                      </button>
                      <button 
                        className='bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2' 
                        onClick={extractSelected}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Extract Text
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
                  <div className='bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 overflow-auto' style={{maxHeight: '280px'}}>
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
                      className='bg-gray-500 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-md'
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
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Start from scratch or use a professional template</p>
            </div>
            <div className='px-6 py-8'>
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                <button
                  onClick={() => { 
                    setResumeMode("scratch")
                    setSelectedTemplate(null)
                    setCurrentPdfUrl(null)
                    setHasSelectedMode(true)
                  }}
                  className={`flex-1 max-w-xs px-8 py-6 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl ${
                    resumeMode === "scratch" 
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
                    setHasSelectedMode(true)
                  }}
                  className={`flex-1 max-w-xs px-8 py-6 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl ${
                    resumeMode === "template" 
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
                <div className='bg-white dark:bg-gray-100 shadow-2xl border-2 border-gray-200 dark:border-gray-400 min-h-[1056px] max-w-[816px] mx-auto' style={{aspectRatio: '8.5/11'}}>
                  <div className='w-full h-full flex flex-col p-12'>
                    <div className='border-b-2 border-gray-300 pb-8 mb-8'>
                      <div
                        ref={headerRef}
                        style={{
                          fontFamily,
                          fontSize: `${fontSize}px`,
                          lineHeight,
                          textAlign,
                          color: textColor,
                          minHeight: '100px'
                        }}
                      />
                    </div>
                    <div className='flex-1 flex gap-8'>
                      <div className='w-1/3 border-r-2 border-gray-300 pr-8'>
                        <div
                          ref={sidebarRef}
                          style={{
                            fontFamily,
                            fontSize: `${fontSize}px`,
                            lineHeight,
                            textAlign,
                            color: textColor,
                            minHeight: '700px'
                          }}
                        />
                      </div>
                      <div className='flex-1'>
                        <div
                          ref={mainContentRef}
                          style={{
                            fontFamily,
                            fontSize: `${fontSize}px`,
                            lineHeight,
                            textAlign,
                            color: textColor,
                            minHeight: '700px'
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {templates.map((template, index) => (
                    <div 
                      key={index} 
                      onClick={() => selectTemplate(template.name as 'modern' | 'classic')} 
                      className="group cursor-pointer bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden hover:border-blue-500 hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                    >
                      <div className="relative">
                        <img 
                          src={template.preview} 
                          alt={`${template.name} template`} 
                          className="w-full h-96 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                          <span className="text-white font-semibold text-lg">Select Template</span>
                        </div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                        <p className="font-bold text-lg text-gray-900 dark:text-gray-100 capitalize text-center">
                          {template.name} Template
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-1">
                          Professional & ATS-friendly
                        </p>
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
                <h2 className='text-xl font-semibold text-gray-900 dark:text-white capitalize'>{selectedTemplate} Template Editor</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Customize your professional resume template</p>
              </div>
              
              <ProfessionalToolbar />
              
              <div className='p-6'>
                <div className='bg-white dark:bg-gray-100 shadow-2xl border-2 border-gray-200 dark:border-gray-400 min-h-[1056px] max-w-[816px] mx-auto' style={{aspectRatio: '8.5/11'}}>
                  <div className='w-full h-full flex flex-col p-12'>
                    <div className='border-b-2 border-gray-300 pb-8 mb-8'>
                      <div
                        ref={headerRef}
                        className='focus:ring-2 focus:ring-blue-300 rounded-lg'
                        style={{
                          fontFamily,
                          fontSize: `${fontSize}px`,
                          lineHeight,
                          textAlign,
                          color: textColor,
                          minHeight: '100px'
                        }}
                      />
                    </div>
                    <div className='flex-1 flex gap-8'>
                      <div className='w-1/3 border-r-2 border-gray-300 pr-8'>
                        <div
                          ref={sidebarRef}
                          className='focus:ring-2 focus:ring-blue-300 rounded-lg'
                          style={{
                            fontFamily,
                            fontSize: `${fontSize}px`,
                            lineHeight,
                            textAlign,
                            color: textColor,
                            minHeight: '700px'
                          }}
                        />
                      </div>
                      <div className='flex-1'>
                        <div
                          ref={mainContentRef}
                          className='focus:ring-2 focus:ring-blue-300 rounded-lg'
                          style={{
                            fontFamily,
                            fontSize: `${fontSize}px`,
                            lineHeight,
                            textAlign,
                            color: textColor,
                            minHeight: '700px'
                          }}
                        />
                      </div>
                    </div>
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
        </div>
      </div>
    </div>
  )
}

export default ResumeBuilder
