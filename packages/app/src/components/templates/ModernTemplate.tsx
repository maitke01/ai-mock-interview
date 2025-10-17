import React from 'react'

interface ModernTemplateProps {
  data: {
    header: string
    sidebar: string
    mainContent: string
  }
  onChange: (key: string, value: string) => void
}

const ModernTemplate: React.FC<ModernTemplateProps> = ({ data, onChange }) => {
  return (
    <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg min-h-[800px]">
      {/* Header */}
      <div className="text-center mb-6">
        <h1
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onChange('header', e.currentTarget.textContent || '')}
          className="text-3xl font-bold text-gray-900 dark:text-gray-900"
        >
          {data.header}
        </h1>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-1/3 border-r pr-6">
          <div
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => onChange('sidebar', e.currentTarget.textContent || '')}
            className="text-sm min-h-[500px] text-gray-800 dark:text-gray-900"
          >
            {data.sidebar}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => onChange('mainContent', e.currentTarget.textContent || '')}
            className="text-sm min-h-[500px] text-gray-800 dark:text-gray-900"
          >
            {data.mainContent}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernTemplate
