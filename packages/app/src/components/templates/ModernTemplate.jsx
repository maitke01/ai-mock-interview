// src/components/templates/ModernTemplate.jsx
import React, { useState } from "react";

export default function ModernTemplate() {
  const [resume, setResume] = useState({
    name: "John Doe",
    title: "Software Engineer",
    summary: "Write a brief summary about yourself here...",
  });

  const handleEdit = (field, e) => {
    setResume({ ...resume, [field]: e.target.innerText });
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-[600px] mx-auto">
      <h1
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => handleEdit("name", e)}
        className="text-3xl font-bold mb-2"
      >
        {resume.name}
      </h1>
      <h3
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => handleEdit("title", e)}
        className="text-lg text-gray-600 mb-4"
      >
        {resume.title}
      </h3>
      <p
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => handleEdit("summary", e)}
        className="text-gray-700"
      >
        {resume.summary}
      </p>
    </div>
  );
}
