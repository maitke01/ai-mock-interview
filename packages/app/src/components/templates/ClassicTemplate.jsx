import React from 'react'

// Minimal ClassicTemplate component used by EditableTemplateEditor
// Props: data { header, sidebar, mainContent } and onChange(key, value)
export default function ClassicTemplate({ data = {}, onChange = () => {} }) {
  const handleChange = (key) => (e) => onChange(key, e.target.value)

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700">Header</label>
        <textarea
          className="w-full border rounded px-2 py-1 text-sm"
          rows={3}
          value={data.header || ''}
          onChange={handleChange('header')}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700">Sidebar</label>
        <textarea
          className="w-full border rounded px-2 py-1 text-sm"
          rows={6}
          value={data.sidebar || ''}
          onChange={handleChange('sidebar')}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700">Main Content</label>
        <textarea
          className="w-full border rounded px-2 py-1 text-sm"
          rows={10}
          value={data.mainContent || ''}
          onChange={handleChange('mainContent')}
        />
      </div>
    </div>
  )
}
