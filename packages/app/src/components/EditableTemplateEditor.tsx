import React, { useState, useEffect, useRef } from 'react'
import type { SelectedResume } from '../types/resume'
import { useResumeCompletionStore } from '../stores/resumeCompletionStore'
import modernPreview from './assets/modern-preview.png'
import classicPreview from './assets/classic-preview.png'
import ModernTemplate from './templates/ModernTemplate'
import modernPDF from './assets/pdfs/modern-template.pdf'
import classicPDF from './assets/pdfs/classic-template.pdf'
import { mergePDFWithText } from '../utils/pdfUtils'

interface Props {
    resume: SelectedResume | null
    suggestion?: string
    onSave: (updated: SelectedResume) => void
}

const ClassicPreview: React.FC<{ data: { header: string; sidebar: string; mainContent: string }; onChange: (k: string, v: string) => void }> = ({ data, onChange }) => {
    return (
        <div className="bg-gray-50 p-6 rounded shadow max-w-[680px] mx-auto border border-gray-200">
            <h1
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => onChange('header', e.currentTarget.textContent || '')}
                className="text-2xl font-bold mb-1 text-center text-gray-900 dark:text-gray-900"
            >
                {data.header}
            </h1>
            <div className="flex gap-6 mt-4">
                <div className="w-1/3 text-sm border-r pr-4 text-gray-800 dark:text-gray-900" contentEditable suppressContentEditableWarning onInput={(e) => onChange('sidebar', e.currentTarget.textContent || '')}>
                    {data.sidebar}
                </div>
                <div className="flex-1 text-sm text-gray-800 dark:text-gray-900" contentEditable suppressContentEditableWarning onInput={(e) => onChange('mainContent', e.currentTarget.textContent || '')}>
                    {data.mainContent}
                </div>
            </div>
        </div>
    )
}

const EditableTemplateEditor: React.FC<Props> = ({ resume, suggestion, onSave }) => {
    const [text, setText] = useState<string>('')
    const [mode, setMode] = useState<'scratch' | 'template'>('scratch')
    const [templateType, setTemplateType] = useState<'modern' | 'classic'>('modern')
    const [templateData, setTemplateData] = useState({ header: '', sidebar: '', mainContent: '' })
    const { trackCompletion } = useResumeCompletionStore()

    useEffect(() => {
        const base = resume?.text || ''
        setText(base)
        // naive parse for template: split into three chunks by double newline
        const parts = base.split('\n\n')
        setTemplateData({
            header: parts[0] || '',
            sidebar: parts[1] || '',
            mainContent: parts.slice(2).join('\n\n') || ''
        })
    }, [resume])

    const handleApplySuggestion = () => {
        if (!suggestion) return
        const merged = `<!-- AI SUGGESTION START -->\n${suggestion}\n<!-- AI SUGGESTION END -->\n\n${text}`
        setText(merged)
        // update template data as well
        const parts = merged.split('\n\n')
        setTemplateData({ header: parts[0] || '', sidebar: parts[1] || '', mainContent: parts.slice(2).join('\n\n') || '' })
    }

    const handleSave = () => {
        if (!resume) return
        // when in template mode, serialize templateData into text
        const finalText = mode === 'template' ? `${templateData.header}\n\n${templateData.sidebar}\n\n${templateData.mainContent}` : text
        onSave({ ...resume, text: finalText })
        trackCompletion('editor_save', resume.fileName, 3)
    }

    const handleDownload = () => {
        const finalText = mode === 'template' ? `${templateData.header}\n\n${templateData.sidebar}\n\n${templateData.mainContent}` : text
        const blob = new Blob([finalText], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = resume?.fileName ? `${resume.fileName.replace(/\.[^/.]+$/, '')}-edited.txt` : 'resume-edited.txt'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
    }

    const handleTemplateChange = (key: string, value: string) => {
        setTemplateData(prev => ({ ...prev, [key]: value }))
    }

    // Template defaults (small subset from ResumeBuilder)
    const templatesData: { [k: string]: { header: string; sidebar: string; mainContent: string } } = {
        modern: {
            header: 'Your Name\nEmail | Phone | LinkedIn',
            sidebar: 'SKILLS\n• Skill 1\n• Skill 2\n• Skill 3\n\nEDUCATION\nUniversity Name',
            mainContent: 'PROFESSIONAL SUMMARY\nBrief overview of your experience and skills.\n\nWORK EXPERIENCE\n\nJob Title | Company Name\nDates\n• Achievement 1'
        },
        classic: {
            header: 'Your Name\nEmail | Phone',
            sidebar: 'EDUCATION\nUniversity Name\nDegree, Year\n\nSKILLS\n• Skill 1\n• Skill 2',
            mainContent: 'PROFESSIONAL SUMMARY\nBrief overview of your background.\n\nWORK HISTORY\n\nJob Title | Company\nDates\n• Responsibility 1'
        }
    }

    const selectTemplate = (id: 'modern' | 'classic') => {
        setTemplateType(id)
        // if current template is empty or was previous template, set defaults
        setTemplateData(templatesData[id])
    }

    // PDF preview state
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [previewLoading, setPreviewLoading] = useState(false)
    const prevBlobRef = useRef<string | null>(null)
    const [optimizedPreviewUrl, setOptimizedPreviewUrl] = useState<string | null>(null)
    const [previewMode, setPreviewMode] = useState<'template' | 'optimized' | 'original'>('template')

    const generatePdfPreview = async () => {
        if (!resume) return alert('No resume loaded to preview')
        setPreviewLoading(true)
        try {
            const pdfUrl = templateType === 'modern' ? modernPDF : classicPDF
            const bytes = await mergePDFWithText(pdfUrl, templateData)
            const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
            const url = URL.createObjectURL(blob)
            // cleanup previous
            if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current)
            prevBlobRef.current = url
            setPreviewUrl(url)
        } catch (err) {
            console.error('Preview generation failed', err)
            alert('Failed to generate PDF preview')
        }
        setPreviewLoading(false)
    }

    useEffect(() => {
        return () => {
            if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current)
        }
    }, [])

    // When a resume with an original preview URL is loaded, automatically show it
    useEffect(() => {
        if (resume?.previewUrl) {
            setPreviewMode('original')
            // clear any optimized preview URL so the original is shown
            setOptimizedPreviewUrl(null)
        }
    }, [resume?.previewUrl])

    const saveDraft = () => {
        if (!resume) return alert('No resume loaded to save draft')
        try {
            const key = `resume-draft-${templateType}`
            const draft = { ...templateData, savedAt: new Date().toISOString(), template: templateType }
            localStorage.setItem(key, JSON.stringify(draft))
            alert('✓ Draft saved successfully!')
            trackCompletion('editor_save_draft', resume.fileName, 5)
        } catch (e) {
            console.error('Failed to save draft', e)
            alert('Failed to save draft')
        }
    }

    const submitForAIFormatting = async () => {
        if (!resume) return alert('No resume loaded to submit')
        try {
            const payload = { ...templateData, fileName: resume.fileName }
            // best-effort: call backend endpoint (may be mock)
            const res = await fetch('/api/format-resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            if (!res.ok) throw new Error(`Status ${res.status}`)
            const data = await res.json()
            alert('Resume submitted for AI formatting!')
            console.log('format result', data)
            trackCompletion('editor_submit_ai', resume.fileName, 20)
        } catch (err) {
            console.warn('format submit failed', err)
            alert('Failed to submit for formatting. Saved draft locally.')
            saveDraft()
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Editable Resume Template</h3>
                <div className="flex gap-2">
                    <button
                        className="text-sm px-2 py-1 bg-blue-600 text-white rounded"
                        onClick={handleApplySuggestion}
                        disabled={!suggestion}
                    >
                        Apply Suggestion
                    </button>
                    <button className="text-sm px-2 py-1 bg-green-600 text-white rounded" onClick={handleSave}>Save</button>
                    <button className="text-sm px-2 py-1 bg-gray-200 text-gray-800 rounded" onClick={handleDownload}>Download</button>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <label className="text-xs">Mode:</label>
                <select value={mode} onChange={e => setMode(e.target.value as any)} className="text-sm px-2 py-1 border rounded">
                    <option value="scratch">Scratch</option>
                    <option value="template">Template</option>
                </select>
                {mode === 'template' && (
                    <>
                        <label className="text-xs">Template:</label>
                        <select value={templateType} onChange={e => setTemplateType(e.target.value as any)} className="text-sm px-2 py-1 border rounded">
                            <option value="modern">Modern</option>
                            <option value="classic">Classic</option>
                        </select>
                    </>
                )}
            </div>

            {mode === 'scratch' && (
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={12}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm"
                />
            )}

            {mode === 'template' && (
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                            <button className={`border rounded p-1 ${templateType === 'modern' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => selectTemplate('modern')}>
                                <img src={modernPreview} alt="modern preview" className="h-12 w-16 object-cover" />
                            </button>
                            <button className={`border rounded p-1 ${templateType === 'classic' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => selectTemplate('classic')}>
                                <img src={classicPreview} alt="classic preview" className="h-12 w-16 object-cover" />
                            </button>
                        </div>
                        <div className="ml-auto flex gap-2">
                            <button className="text-sm px-3 py-1 bg-yellow-500 text-white rounded" onClick={saveDraft}>Save Draft</button>
                            <button className="text-sm px-3 py-1 bg-indigo-600 text-white rounded" onClick={submitForAIFormatting}>Submit for AI Formatting</button>
                            <button className="text-sm px-3 py-1 bg-gray-800 text-white rounded" onClick={generatePdfPreview}>{previewLoading ? 'Rendering...' : 'Render Preview'}</button>
                            <button className="text-sm px-3 py-1 bg-gray-200 text-gray-800 rounded" onClick={() => {
                                if (!previewUrl) return alert('Render preview first')
                                const a = document.createElement('a')
                                a.href = previewUrl
                                a.download = resume?.fileName ? `${resume.fileName.replace(/\.[^/.]+$/, '')}-preview.pdf` : 'resume-preview.pdf'
                                document.body.appendChild(a)
                                a.click()
                                a.remove()
                            }}>Download PDF</button>
                            {resume?.optimized && (
                                <>
                                    <button
                                        className="text-sm px-3 py-1 bg-emerald-600 text-white rounded"
                                        onClick={() => {
                                            // prepare optimized preview URL
                                            const opt = String(resume.optimized)
                                            if (!opt) return alert('No optimized PDF available')
                                            // if it's already a data URL or http URL
                                            if (opt.startsWith('data:application/pdf') || opt.startsWith('http')) {
                                                setOptimizedPreviewUrl(opt)
                                            } else {
                                                // assume base64 PDF string
                                                setOptimizedPreviewUrl(`data:application/pdf;base64,${opt}`)
                                            }
                                            setPreviewMode('optimized')
                                        }}
                                    >
                                        Show AI Optimized PDF
                                    </button>
                                    <button
                                        className="text-sm px-3 py-1 bg-gray-300 text-gray-900 rounded"
                                        onClick={() => {
                                            if (!optimizedPreviewUrl) return alert('No optimized preview rendered')
                                            const a = document.createElement('a')
                                            a.href = optimizedPreviewUrl
                                            a.download = resume?.fileName ? `${resume.fileName.replace(/\.[^/.]+$/, '')}-optimized.pdf` : 'resume-optimized.pdf'
                                            document.body.appendChild(a)
                                            a.click()
                                            a.remove()
                                        }}
                                    >
                                        Download AI PDF
                                    </button>
                                </>
                            )}
                            {resume?.previewUrl && (
                                <>
                                    <button className="text-sm px-3 py-1 bg-rose-600 text-white rounded" onClick={() => { setPreviewMode('original'); setOptimizedPreviewUrl(null) }}>Show Original PDF</button>
                                    <button className="text-sm px-3 py-1 bg-gray-200 text-gray-900 rounded" onClick={() => {
                                        const a = document.createElement('a')
                                        a.href = String(resume.previewUrl)
                                        a.download = resume?.fileName ? `${resume.fileName.replace(/\.[^/.]+$/, '')}-original.pdf` : 'resume-original.pdf'
                                        document.body.appendChild(a)
                                        a.click()
                                        a.remove()
                                    }}>Download Original</button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-6">
                        <div className="flex-1">
                            {templateType === 'modern' ? (
                                <ModernTemplate data={templateData} onChange={handleTemplateChange} />
                            ) : (
                                <ClassicPreview data={templateData} onChange={handleTemplateChange} />
                            )}
                        </div>
                        <div className="w-1/3 bg-white border rounded p-2">
                            <div className="text-xs font-semibold mb-2">PDF Preview</div>
                            {previewMode === 'original' ? (
                                resume?.previewUrl ? (
                                    <object data={String(resume.previewUrl)} type="application/pdf" width="100%" height={600} aria-label="Original PDF preview">
                                        <p>PDF preview not supported. <a href={String(resume.previewUrl)}>Open PDF</a></p>
                                    </object>
                                ) : (
                                    <div className="text-xs text-gray-500">No original PDF available.</div>
                                )
                            ) : previewMode === 'optimized' ? (
                                optimizedPreviewUrl ? (
                                    <object data={optimizedPreviewUrl} type="application/pdf" width="100%" height={600} aria-label="Optimized PDF preview">
                                        <p>PDF preview not supported. <a href={optimizedPreviewUrl}>Open PDF</a></p>
                                    </object>
                                ) : (
                                    <div className="text-xs text-gray-500">No AI optimized preview available.</div>
                                )
                            ) : (
                                previewUrl ? (
                                    <object data={previewUrl} type="application/pdf" width="100%" height={600} aria-label="PDF preview">
                                        <p>PDF preview not supported. <a href={previewUrl}>Open PDF</a></p>
                                    </object>
                                ) : (
                                    <div className="text-xs text-gray-500">No preview yet. Edit template and click Render Preview.</div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}

            {!resume && <div className="text-xs text-gray-500">No resume loaded.</div>}
        </div>
    )
}

export default EditableTemplateEditor
