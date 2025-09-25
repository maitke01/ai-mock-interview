import React, { useState, useCallback, useRef } from 'react';
import { ClientPDFProcessor, ClientPDFProcessingResult } from '../utils/pdfProcessor';

interface PDFResult {
  pdfData: {
    text: string;
    metadata: {
      pageCount: number;
      fileSize: number;
      title?: string;
      author?: string;
    };
  };
  optimization?: {
    success: boolean;
    optimizations: string[];
  };
  parsedResume?: any;
  clientProcessing?: ClientPDFProcessingResult;
}

export default function PDFUploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<PDFResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [extractText, setExtractText] = useState(true);
  const [optimizeForATS, setOptimizeForATS] = useState(true);
  const [useClientProcessing, setUseClientProcessing] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = ClientPDFProcessor.validatePDF(file);
      if (!validation.isValid) {
        setError(validation.issues.join(', '));
        return;
      }

      setSelectedFile(file);
      setError('');

      // Show warnings if any
      if (validation.warnings.length > 0) {
        console.warn('PDF warnings:', validation.warnings);
      }

      // Generate preview
      try {
        const previewResult = await ClientPDFProcessor.generatePreview(file, 1);
        if (previewResult.success && previewResult.imageUrl) {
          setPreview(previewResult.imageUrl);
        }
      } catch (err) {
        console.warn('Preview generation failed:', err);
      }
    }
  }, []);

  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;
    const file = files[0];

    if (file) {
      const validation = ClientPDFProcessor.validatePDF(file);
      if (!validation.isValid) {
        setError(validation.issues.join(', '));
        return;
      }

      setSelectedFile(file);
      setError('');

      // Generate preview
      try {
        const previewResult = await ClientPDFProcessor.generatePreview(file, 1);
        if (previewResult.success && previewResult.imageUrl) {
          setPreview(previewResult.imageUrl);
        }
      } catch (err) {
        console.warn('Preview generation failed:', err);
      }
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleProcessPDF = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select a PDF file first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let clientResult: ClientPDFProcessingResult | null = null;
      let serverResult: any = null;

      // Client-side processing (always available)
      if (useClientProcessing && extractText) {
        clientResult = await ClientPDFProcessor.processPDFFile(selectedFile);

        if (!clientResult.success) {
          throw new Error(clientResult.error || 'Client-side PDF processing failed');
        }
      }

      // Server-side processing (for optimization and advanced features)
      if (optimizeForATS || !useClientProcessing) {
        try {
          const formData = new FormData();
          formData.append('pdf', selectedFile);
          formData.append('extractText', extractText.toString());
          formData.append('optimizeForATS', optimizeForATS.toString());

          const response = await fetch('/resume/process-pdf', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            serverResult = await response.json();
          } else {
            console.warn('Server processing failed, using client-side only');
          }
        } catch (serverErr) {
          console.warn('Server processing unavailable, using client-side only:', serverErr);
        }
      }

      // Combine results
      const combinedResult: PDFResult = {
        pdfData: {
          text: clientResult?.text || serverResult?.pdfData?.text || '',
          metadata: {
            pageCount: clientResult?.metadata?.pageCount || serverResult?.pdfData?.metadata?.pageCount || 0,
            fileSize: selectedFile.size,
            title: clientResult?.metadata?.title,
            author: clientResult?.metadata?.author
          }
        },
        clientProcessing: clientResult || undefined,
        optimization: serverResult?.optimization,
        parsedResume: serverResult?.parsedResume
      };

      setResult(combinedResult);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF processing failed');
    } finally {
      setLoading(false);
    }
  }, [selectedFile, extractText, optimizeForATS, useClientProcessing]);

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
        <h2 className="text-2xl font-bold mb-6">PDF Resume Processor</h2>

        {/* File Upload Area */}
        <div className="mb-8">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              loading
                ? 'border-gray-300 bg-gray-50'
                : 'border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <div className="text-4xl">📄</div>
                <p className="text-lg font-semibold text-gray-700">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>

                {/* PDF Preview */}
                {preview && (
                  <div className="max-w-xs mx-auto">
                    <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                    <img
                      src={preview}
                      alt="PDF Preview"
                      className="w-full border border-gray-300 rounded shadow-sm"
                    />
                  </div>
                )}

                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setResult(null);
                    setPreview(null);
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
                    Drop your PDF resume here
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Or click to browse files (max 5MB)
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

        {/* Processing Options */}
        <div className="mb-6 space-y-4">
          <h3 className="text-lg font-semibold">Processing Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={extractText}
                onChange={(e) => setExtractText(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="font-medium">Extract Text</span>
                <p className="text-sm text-gray-600">Extract and parse resume content from PDF</p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={optimizeForATS}
                onChange={(e) => setOptimizeForATS(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="font-medium">ATS Optimization</span>
                <p className="text-sm text-gray-600">Server-side optimization for ATS compatibility</p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={useClientProcessing}
                onChange={(e) => setUseClientProcessing(e.target.checked)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-green-700">Client-side Processing</span>
                <p className="text-sm text-gray-600">Fast, local PDF processing (recommended)</p>
              </div>
            </label>
          </div>

          {useClientProcessing && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✓</span>
                <span className="text-sm text-green-800 font-medium">Client-side processing enabled</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                PDF will be processed locally in your browser for faster performance and better privacy.
              </p>
            </div>
          )}
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
          className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mb-8"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing PDF...</span>
            </div>
          ) : (
            'Process PDF'
          )}
        </button>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            <div className="border-t pt-6">
              <h3 className="text-xl font-bold mb-4">Processing Results</h3>

              {/* PDF Metadata */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-semibold mb-2">PDF Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Pages:</span> {result.pdfData.metadata.pageCount}
                  </div>
                  <div>
                    <span className="font-medium">File Size:</span> {formatFileSize(result.pdfData.metadata.fileSize)}
                  </div>
                  {result.pdfData.metadata.title && (
                    <div>
                      <span className="font-medium">Title:</span> {result.pdfData.metadata.title}
                    </div>
                  )}
                  {result.pdfData.metadata.author && (
                    <div>
                      <span className="font-medium">Author:</span> {result.pdfData.metadata.author}
                    </div>
                  )}
                </div>

                {result.clientProcessing && (
                  <div className="mt-3 px-3 py-2 bg-green-100 border border-green-200 rounded">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">⚡</span>
                      <span className="text-sm font-medium text-green-800">Processed locally in browser</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      {result.clientProcessing.pages.length} pages processed client-side
                    </p>
                  </div>
                )}
              </div>

              {/* ATS Optimizations */}
              {result.optimization && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold mb-2 text-blue-800">ATS Optimizations Applied</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {result.optimization.optimizations.map((opt, index) => (
                      <li key={index} className="text-sm text-blue-700">{opt}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extracted Text */}
              {result.pdfData.text && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Extracted Text</h4>
                  <div className="bg-white border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap">{result.pdfData.text}</pre>
                  </div>

                  {/* Page-by-page view for client processing */}
                  {result.clientProcessing && result.clientProcessing.pages.length > 1 && (
                    <div className="mt-4">
                      <h5 className="font-medium mb-2">Text by Page:</h5>
                      <div className="space-y-2">
                        {result.clientProcessing.pages.map((page, index) => (
                          <details key={index} className="border border-gray-200 rounded">
                            <summary className="cursor-pointer p-2 bg-gray-50 font-medium text-sm">
                              Page {page.pageNumber} ({page.width} × {page.height})
                            </summary>
                            <div className="p-3 text-sm bg-white max-h-32 overflow-y-auto">
                              <pre className="whitespace-pre-wrap">{page.text}</pre>
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-2 flex space-x-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(result.pdfData.text)}
                      className="text-blue-500 hover:text-blue-700 text-sm underline"
                    >
                      Copy Text
                    </button>
                  </div>
                </div>
              )}

              {/* Parsed Resume Structure */}
              {result.parsedResume && (
                <div>
                  <h4 className="font-semibold mb-2">Parsed Resume Structure</h4>
                  <div className="bg-white border border-gray-300 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">Contact Info:</h5>
                        <p>Name: {result.parsedResume.sections?.personalInfo?.name || 'Not found'}</p>
                        <p>Email: {result.parsedResume.sections?.personalInfo?.email || 'Not found'}</p>
                        <p>Phone: {result.parsedResume.sections?.personalInfo?.phone || 'Not found'}</p>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">Structure:</h5>
                        <p>Experience entries: {result.parsedResume.sections?.experience?.length || 0}</p>
                        <p>Education entries: {result.parsedResume.sections?.education?.length || 0}</p>
                        <p>Skills: {result.parsedResume.sections?.skills?.length || 0}</p>
                      </div>
                    </div>

                    {result.parsedResume.sections?.skills?.length > 0 && (
                      <div className="mt-4">
                        <h5 className="font-medium text-gray-700 mb-2">Skills Found:</h5>
                        <div className="flex flex-wrap gap-2">
                          {result.parsedResume.sections.skills.slice(0, 10).map((skill: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {skill}
                            </span>
                          ))}
                          {result.parsedResume.sections.skills.length > 10 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                              +{result.parsedResume.sections.skills.length - 10} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4 mt-6">
                {result.pdfData.text && (
                  <button
                    onClick={() => {
                      // You could integrate this with the main resume editor
                      const event = new CustomEvent('loadResumeText', {
                        detail: result.pdfData.text
                      });
                      window.dispatchEvent(event);
                    }}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Use in Editor
                  </button>
                )}
                <button
                  onClick={() => setResult(null)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Clear Results
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}