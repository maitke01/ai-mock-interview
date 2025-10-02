import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const ResumeBuilder: React.FC = () => {
  const navigate = useNavigate();

  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [pdfTexts, setPdfTexts] = useState<{ [key: string]: string }>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const [manualResume, setManualResume] = useState({
    name: '',
    education: '',
    jobs: '',
    skills: '',
    summary: ''
  });

  const addFiles = async (files: FileList | File[]) => {
    const newFiles = Array.from(files).filter(
      f => !resumeFiles.some(existing => existing.name === f.name)
    );
    setResumeFiles(prev => [...prev, ...newFiles]);

    for (const file of newFiles) {
      if (file.type === 'application/pdf') {
        const text = await extractPdfText(file);
        setPdfTexts(prev => ({ ...prev, [file.name]: text }));
      } else {
        setPdfTexts(prev => ({ ...prev, [file.name]: '' }));
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const extractPdfText = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items
          .map(item => ('str' in item ? (item as { str: string }).str : ''))
          .join(' ') + '\n';
      }
      return text;
    } catch (err) {
      console.error('Error extracting PDF:', err);
      return '';
    }
  };

  const toggleSelect = (fileName: string) => {
    setSelectedFiles(prev =>
      prev.includes(fileName)
        ? prev.filter(f => f !== fileName)
        : [...prev, fileName]
    );
  };

  const deleteSelected = () => {
    setResumeFiles(prev => prev.filter(f => !selectedFiles.includes(f.name)));
    setPdfTexts(prev => {
      const updated = { ...prev };
      selectedFiles.forEach(f => delete updated[f]);
      return updated;
    });
    setSelectedFiles([]);
  };

  const deleteSingle = (fileName: string) => {
    setResumeFiles(prev => prev.filter(f => f.name !== fileName));
    setPdfTexts(prev => {
      const updated = { ...prev };
      delete updated[fileName];
      return updated;
    });
    setSelectedFiles(prev => prev.filter(f => f !== fileName));
  };

  const extractSelected = async () => {
    for (const fileName of selectedFiles) {
      const file = resumeFiles.find(f => f.name === fileName);
      if (file && file.type === 'application/pdf') {
        const text = await extractPdfText(file);
        setPdfTexts(prev => ({ ...prev, [file.name]: text }));
      }
    }
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setManualResume(prev => ({ ...prev, [name]: value }));
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Resume submitted!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Resume Builder</h1>
            <button
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-1">Upload Your Resumes</h2>

              <div
                className="border-2 border-dashed rounded-lg p-8 text-center transition-colors border-gray-300 bg-white"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  style={{ display: 'none' }}
                  multiple
                  onChange={handleFileInput}
                />
                <p className="mb-2 text-gray-700">
                  Drag & drop your resumes here, or{' '}
                  <span
                    className="text-blue-600 cursor-pointer underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      inputRef.current?.click();
                    }}
                  >
                    browse
                  </span>
                </p>
                <p className="text-xs text-gray-500 mb-4">(PDF, DOC, or DOCX – multiple files allowed)</p>
              </div>

              {/* Selection info above files, centered */}
              {resumeFiles.length > 0 && (
                <p className="text-xs text-gray-500 mt-4 text-center">
                  select multiple files to enable the options below
                </p>
              )}

              {/* Uploaded files list */}
              {resumeFiles.length > 0 && (
                <div className="mt-2 space-y-2 text-left">
                  {resumeFiles.map(file => (
                    <div
                      key={file.name}
                      className={`flex items-center justify-between p-3 rounded-md bg-gray-100 cursor-pointer ${
                        selectedFiles.includes(file.name) ? 'bg-blue-100' : ''
                      }`}
                      onClick={() => toggleSelect(file.name)}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file.name)}
                          onChange={() => toggleSelect(file.name)}
                          className="mr-3"
                        />
                        <p className="font-medium text-gray-800">{file.name}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSingle(file.name);
                        }}
                        className="text-gray-600 hover:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Options buttons below files */}
              {selectedFiles.length > 0 && (
                <div className="flex justify-center gap-4 mt-4">
                  <button
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    onClick={deleteSelected}
                  >
                    Delete Selected
                  </button>
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    onClick={extractSelected}
                  >
                    Extract Text
                  </button>
                </div>
              )}

              {/* PDF text display */}
              {Object.keys(pdfTexts).map(fileName => pdfTexts[fileName] && (
                <div key={fileName} className="mt-3 p-2 bg-gray-50 rounded max-h-40 overflow-y-auto text-xs">
                  <p className="font-semibold">{fileName}</p>
                  <pre className="whitespace-pre-wrap">{pdfTexts[fileName]}</pre>
                </div>
              ))}

              {/* Manual entry */}
              <div className="mt-10">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Or enter your resume manually:</h3>
                <form className="space-y-4 text-left max-w-xl mx-auto" onSubmit={handleManualSubmit}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={manualResume.name}
                      onChange={handleManualChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Education</label>
                    <input
                      type="text"
                      name="education"
                      value={manualResume.education}
                      onChange={handleManualChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Previous Jobs</label>
                    <textarea
                      name="jobs"
                      value={manualResume.jobs}
                      onChange={handleManualChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                    <input
                      type="text"
                      name="skills"
                      value={manualResume.skills}
                      onChange={handleManualChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                    <textarea
                      name="summary"
                      value={manualResume.summary}
                      onChange={handleManualChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
                  >
                    Submit Resume
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilder;
