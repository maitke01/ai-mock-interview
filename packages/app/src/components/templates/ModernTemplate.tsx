import React, { useState } from 'react'

interface ModernTemplateProps {
  data: {
    header: string
    sidebar: string
    mainContent: string
  }
  onChange: (key: string, value: string) => void
}

const ModernTemplate: React.FC<ModernTemplateProps> = ({ data, onChange }) => {
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({})

  const formatSection = async (section: string, content: string) => {
    setLoadingStates((prev) => ({ ...prev, [section]: true }))
    try {
      const response = await fetch('/api/format-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionType: section, content })
      })
      if (!response.ok) throw new Error(`Status ${response.status}`)
      const data = await response.json()
      onChange(section, data.formattedContent || content)
    } catch (error) {
      console.error('Format failed:', error)
      alert('Failed to format section. Please try again.')
    } finally {
      setLoadingStates((prev) => ({ ...prev, [section]: false }))
    }
  }
  return (
    <div className='max-w-4xl mx-auto bg-white p-8 shadow-lg min-h-[800px]'>
      {/* Header */}
      <div className='text-center mb-6 relative'>
        <button
          onClick={() => formatSection('header', data.header)}
          disabled={loadingStates.header}
          className='absolute top-0 right-0 text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {loadingStates.header ? 'Formatting...' : 'Format'}
        </button>
        <h1
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onChange('header', e.currentTarget.textContent || '')}
          className='text-3xl font-bold text-gray-900 dark:text-gray-900'
        >
          {data.header}
        </h1>
      </div>

      <div className='flex gap-6'>
        {/* Sidebar */}
        <div className='w-1/3 border-r pr-6 relative'>
          <button
            onClick={() => formatSection('sidebar', data.sidebar)}
            disabled={loadingStates.sidebar}
            className='absolute top-0 right-2 text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed z-10'
          >
            {loadingStates.sidebar ? 'Formatting...' : 'Format'}
          </button>
          <div
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => onChange('sidebar', e.currentTarget.textContent || '')}
            className='text-sm min-h-[500px] text-gray-800 dark:text-gray-900 pt-8'
          >
            {data.sidebar}
          </div>
        </div>

        {/* Main Content */}
        <div className='flex-1 relative'>
          <button
            onClick={() => formatSection('mainContent', data.mainContent)}
            disabled={loadingStates.mainContent}
            className='absolute top-0 right-0 text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed z-10'
          >
            {loadingStates.mainContent ? 'Formatting...' : 'Format'}
          </button>
          <div
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => onChange('mainContent', e.currentTarget.textContent || '')}
            className='text-sm min-h-[500px] text-gray-800 dark:text-gray-900 pt-8'
          >
            {data.mainContent}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModernTemplate
