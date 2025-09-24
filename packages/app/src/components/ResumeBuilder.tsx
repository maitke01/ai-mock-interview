import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import * as pdfjsLib from 'pdfjs-dist'


pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const ResumeBuilder: React.FC = () => {
  const navigate = useNavigate()

  // Drag and drop state
  const [dragActive, setDragActive] = useState(false)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [pdfText, setPdfText] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Manual entry state
  const [manualResume, setManualResume] = useState({
    name: '',
    education: '',
    jobs: '',
    skills: '',
    summary: ''
  })

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setResumeFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setResumeFile(file)
      if (file.type === 'application/pdf') {
        await extractPdfText(file)
      } else {
        setPdfText('')
      }
    }
  }

  const extractPdfText = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let text = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      text += content.items
        .map(item => 'str' in item ? (item as { str: string }).str : '')
        .join(' ') + '\n'
    }
    setPdfText(text)
  }

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setManualResume(prev => ({ ...prev, [name]: value }))
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // You can process or save manualResume here
    alert('Resume submitted!')
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='bg-white shadow-sm border-b'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <h1 className='text-2xl font-bold text-gray-900'>Resume Builder</h1>
            <button
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black'
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
        <div className='px-4 py-6 sm:px-0'>
          <div className='bg-white overflow-hidden shadow rounded-lg'>
            <div className='px-4 py-5 sm:p-6'>
              <h2 className='text-lg font-medium text-gray-900 mb-4'>Welcome to your Resume Builder</h2>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white'}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={inputRef}
                  type='file'
                  accept='.pdf,.doc,.docx'
                  style={{ display: 'none' }}
                  onChange={handleChange}
                />
                <p className='mb-2 text-gray-700'>Drag & drop your resume here, or <span className='text-blue-600 cursor-pointer underline' onClick={() => inputRef.current?.click()}>browse</span></p>
                <p className='text-xs text-gray-500 mb-4'>(PDF, DOC, or DOCX)</p>
                {resumeFile && (
                  <div className='mt-4 text-green-700 font-medium'>
                    Uploaded: {resumeFile.name}
                  </div>
                )}
                {pdfText && (
                  <div className='mt-6 text-left'>
                    <h4 className='text-md font-semibold mb-2'>Extracted PDF Text:</h4>
                    <pre className='bg-gray-100 p-4 rounded text-xs whitespace-pre-wrap'>{pdfText}</pre>
                  </div>
                )}
              </div>

              <div className='mt-10'>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>Or enter your resume manually:</h3>
                <form className='space-y-4 text-left max-w-xl mx-auto' onSubmit={handleManualSubmit}>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Full Name</label>
                    <input
                      type='text'
                      name='name'
                      value={manualResume.name}
                      onChange={handleManualChange}
                      className='w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                      required
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Education</label>
                    <input
                      type='text'
                      name='education'
                      value={manualResume.education}
                      onChange={handleManualChange}
                      className='w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Previous Jobs</label>
                    <textarea
                      name='jobs'
                      value={manualResume.jobs}
                      onChange={handleManualChange}
                      className='w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Skills</label>
                    <input
                      type='text'
                      name='skills'
                      value={manualResume.skills}
                      onChange={handleManualChange}
                      className='w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Summary</label>
                    <textarea
                      name='summary'
                      value={manualResume.summary}
                      onChange={handleManualChange}
                      className='w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                      rows={2}
                    />
                  </div>
                  <button type='submit' className='bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors'>Submit Resume</button>
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