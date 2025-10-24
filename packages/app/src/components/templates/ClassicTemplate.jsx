import React from "react";

// Classic template follows the same data shape as ResumeBuilder.templatesData:
// { header: string, sidebar: string, mainContent: string }
// Props:
// - data: { header, sidebar, mainContent }
// - onChange: (section, value) => void
const ClassicTemplate = ({ data = {}, onChange = () => {} }) => {
  return (
    <div className="bg-gray-50 p-8 rounded-lg shadow-md max-w-[700px] mx-auto border border-gray-300">
      {/* Header - editable block (name + contact lines) */}
      <div
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange('header', e.currentTarget.textContent || '')}
        className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-900 whitespace-pre-line"
        aria-label="Resume header (name and contact)"
      >
        {data.header}
      </div>

      <div className="flex gap-6 mt-4">
        {/* Sidebar */}
        <div className="w-1/3 border-r pr-6">
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

export default ClassicTemplate;
