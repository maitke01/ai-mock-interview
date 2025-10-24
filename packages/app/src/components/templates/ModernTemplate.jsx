import React from "react";

const ModernTemplate = ({ data = {}, onChange = () => {} }) => {
  return (
    <div className="bg-gray-50 p-6 rounded shadow max-w-[680px] mx-auto border border-gray-200">
      {/* Header */}
      <div className="text-center mb-2">
        <h1
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onChange('header', e.currentTarget.textContent || '')}
          className="text-2xl font-bold text-gray-900 dark:text-gray-900 whitespace-pre-line"
          aria-label="Resume header (name and contact)"
        >
          {data.header}
        </h1>
      </div>

      <div className="flex gap-6 mt-4">
        {/* Sidebar */}
        <div className="w-1/3 border-r pr-4">
          <div
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => onChange('sidebar', e.currentTarget.textContent || '')}
            className="text-sm min-h-[400px] text-gray-800 dark:text-gray-900 whitespace-pre-line"
            aria-label="Resume sidebar (skills, education, etc)"
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
            className="text-sm min-h-[400px] text-gray-800 dark:text-gray-900 whitespace-pre-line"
            aria-label="Resume main content (summary, experience, projects)"
          >
            {data.mainContent}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernTemplate;
