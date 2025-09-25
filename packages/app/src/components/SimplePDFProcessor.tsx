import React, { useState, useCallback, useRef } from 'react';

export default function SimplePDFProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simple file to text extraction using server endpoint only
  const handleProcessPDF = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select a PDF file first');
      return;
    }

    setLoading(true);
    setError('');
    setExtractedText('');

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);
      formData.append('extractText', 'true');
      formData.append('optimizeForATS', 'false');

      const response = await fetch('/resume/process-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server processing failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setExtractedText(data.pdfData?.text || 'No text extracted');
      } else {
        throw new Error(data.error || 'PDF processing failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF processing failed');
    } finally {
      setLoading(false);
    }
  }, [selectedFile]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please select a PDF file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setError('');
      setExtractedText('');
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6">Simple PDF Text Extractor</h2>
        <p className="text-gray-600 mb-6">
          Upload a PDF resume to extract text using server-side processing only.
        </p>

        {/* File Upload */}
        <div className="mb-6">
          <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-8 text-center">
            {selectedFile ? (
              <div className="space-y-2">
                <div className="text-4xl">📄</div>
                <p className="text-lg font-semibold text-gray-700">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setExtractedText('');
                    setError('');
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="text-red-500 hover:text-red-700 underline text-sm"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-6xl text-blue-400">📎</div>
                <div>
                  <p className="text-lg font-semibold text-gray-700 mb-2">
                    Select your PDF resume
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Maximum file size: 5MB
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Choose File
                  </button>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Process Button */}
        <button
          onClick={handleProcessPDF}
          disabled={!selectedFile || loading}
          className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mb-6"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing PDF...</span>
            </div>
          ) : (
            'Extract Text from PDF'
          )}
        </button>

        {/* Results */}
        {extractedText && (
          <div className="space-y-4">
            <div className="border-t pt-6">
              <h3 className="text-xl font-bold mb-4">Extracted Text</h3>

              <div className="bg-white border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap">{extractedText}</pre>
              </div>

              <div className="mt-4 flex space-x-4">
                <button
                  onClick={() => navigator.clipboard.writeText(extractedText)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Copy Text
                </button>
                <button
                  onClick={() => {
                    const event = new CustomEvent('loadResumeText', {
                      detail: extractedText
                    });
                    window.dispatchEvent(event);
                    alert('Text loaded into Resume Editor! Go to /resume-editor to continue.');
                  }}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Use in Resume Editor
                </button>
                <button
                  onClick={() => setExtractedText('')}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Clear Results
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">How to Use:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>Select a PDF resume file (max 5MB)</li>
            <li>Click "Extract Text from PDF"</li>
            <li>Review the extracted text content</li>
            <li>Click "Use in Resume Editor" to analyze with AI</li>
            <li>Go to /resume-editor to run comprehensive analysis</li>
          </ol>
        </div>
      </div>
    </div>
  );
}