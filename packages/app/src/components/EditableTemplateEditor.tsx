import React, { useState, useEffect } from 'react'

type MinimalSelectedResume = {
  fileName?: string
  text?: string
  optimized?: string | null
  images?: string[]
}

type Props = {
  resume: MinimalSelectedResume
  suggestion?: string
  onSave: (updated: MinimalSelectedResume) => void
}

const EditableTemplateEditor: React.FC<Props> = ({ resume, suggestion, onSave }) => {
  const [edited, setEdited] = useState<string>(String(resume.optimized ?? resume.text ?? ''))

  useEffect(() => {
    setEdited(String(resume.optimized ?? resume.text ?? ''))
  }, [resume])

  return (
    <div className='space-y-2'>
      <label className='block text-xs font-medium text-gray-600 dark:text-gray-300'>Editable Resume Text</label>
      <textarea
        value={edited}
        onChange={(e) => setEdited(e.target.value)}
        className='w-full border rounded p-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100'
        rows={8}
      />
      {suggestion && (
        <div className='text-sm text-gray-600 dark:text-gray-300 p-2 bg-yellow-50 dark:bg-yellow-900/10 rounded'>
          <strong>Suggestion:</strong> {suggestion}
        </div>
      )}
      <div className='flex gap-2'>
        <button
          onClick={() => onSave({ ...resume, optimized: edited })}
          className='bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white px-3 py-1 rounded-md font-medium transition-colors border-2 border-transparent'
        >
          Save
        </button>
        <button
          onClick={() => setEdited(String(resume.optimized ?? resume.text ?? ''))}
          className='px-3 py-1 border rounded font-medium underline'
        >
          Reset
        </button>
      </div>
    </div>
  )
}

export default EditableTemplateEditor
