// src/components/templates/ClassicTemplate.jsx
import React, { useState } from 'react'

export default function ClassicTemplate() {
  const [resume, setResume] = useState({
    name: 'Jane Smith',
    title: 'Frontend Developer',
    summary: 'Write a brief summary about yourself here...'
  })

  const handleEdit = (field, e) => {
    setResume({ ...resume, [field]: e.target.innerText })
  }

  return (
    <div className='bg-gray-50 p-8 rounded-lg shadow-md max-w-[600px] mx-auto border border-gray-300'>
      <h1
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => handleEdit('name', e)}
        className='text-2xl font-bold mb-2 text-gray-900 dark:text-gray-900'
      >
        {resume.name}
      </h1>
      <h3
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => handleEdit('title', e)}
        className='text-md text-gray-800 dark:text-gray-900 mb-4'
      >
        {resume.title}
      </h3>
      <p
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => handleEdit('summary', e)}
        className='text-gray-700 dark:text-gray-900'
      >
        {resume.summary}
      </p>
    </div>
  )
}
