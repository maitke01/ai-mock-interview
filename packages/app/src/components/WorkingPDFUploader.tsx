import React, { useState, useCallback, useRef } from 'react';

// Import PDF.js directly in the component
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Configure PDF.js worker - use local worker file
GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

interface PDFResult {
  text: string;
  pageCount: number;
  fileSize: number;
  title?: string;
  author?: string;
  pages: Array<{
    pageNumber: number;
    text: string;
  }>;
  success: boolean;
  error?: string;
}

export default function WorkingPDFUploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<PDFResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please select a PDF file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setError('');
      setResult(null);
      setPreview(null);

      // Generate preview immediately
      try {
        await generatePreview(file);
      } catch (err) {
        console.warn('Preview generation failed:', err);
      }
    }
  }, []);

  const generatePreview = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);

      const loadingTask = getDocument({
        data: typedArray,
        cMapUrl: '/cmaps/',
        cMapPacked: true,
      });

      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.2 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No canvas context');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;

      const imageUrl = canvas.toDataURL('image/png', 0.8);
      setPreview(imageUrl);
    } catch (err) {
      console.warn('Preview failed:', err);
    }
  };

  const processPDF = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Starting PDF processing...');

      const arrayBuffer = await selectedFile.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);

      console.log('Loading PDF document...');
      const loadingTask = getDocument({
        data: typedArray,
        cMapUrl: '/cmaps/',
        cMapPacked: true,
      });

      const pdf = await loadingTask.promise;
      console.log(`PDF loaded. Pages: ${pdf.numPages}`);

      const pages: Array<{ pageNumber: number; text: string }> = [];
      let fullText = '';

      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`Processing page ${pageNum}...`);

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Extract text with proper spacing
        const textItems = textContent.items;
        const pageText = textItems
          .filter((item: any) => item.str && item.str.trim())
          .map((item: any) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        console.log(`Page ${pageNum} extracted ${pageText.length} characters`);

        pages.push({
          pageNumber: pageNum,
          text: pageText,
        });

        fullText += pageText + '\n\n';
      }

      // Get metadata
      const metadata = await pdf.getMetadata();
      console.log('PDF metadata:', metadata.info);

      const result: PDFResult = {
        text: fullText.trim(),
        pageCount: pdf.numPages,
        fileSize: selectedFile.size,
        title: (metadata.info as any)?.Title || undefined,
        author: (metadata.info as any)?.Author || undefined,
        pages,
        success: true,
      };

      console.log('PDF processing completed. Total text length:', result.text.length);
      setResult(result);

    } catch (err) {
      console.error('PDF processing error:', err);
      const errorMsg = err instanceof Error ? err.message : 'PDF processing failed';
      setError(errorMsg);
      setResult({
        text: '',
        pageCount: 0,
        fileSize: selectedFile.size,
        pages: [],
        success: false,
        error: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6">PDF Text Extractor with PDF.js</h2>
        <p className="text-gray-600 mb-6">
          Upload a PDF resume to extract text using real PDF.js library implementation.
        </p>

        {/* File Upload Area */}
        <div className="mb-6">
          <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-8 text-center">
            {selectedFile ? (
              <div className="space-y-4">
                <div className="text-4xl">📄</div>
                <p className="text-lg font-semibold text-gray-700">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>

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
                    Drop your PDF resume here or click to browse
                  </p>
                  <p className="text-sm text-gray-500 mb-4">Maximum file size: 5MB</p>
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
          onClick={processPDF}
          disabled={!selectedFile || loading}
          className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mb-6"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Extracting text with PDF.js...</span>
            </div>
          ) : (
            'Extract Text with PDF.js'
          )}
        </button>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            <div className="border-t pt-6">
              <h3 className="text-xl font-bold mb-4">Extraction Results</h3>

              {/* PDF Information */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-semibold mb-2">PDF Information</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Pages:</span> {result.pageCount}
                  </div>
                  <div>
                    <span className="font-medium">File Size:</span> {formatFileSize(result.fileSize)}
                  </div>
                  {result.title && (
                    <div>
                      <span className="font-medium">Title:</span> {result.title}
                    </div>
                  )}
                  {result.author && (
                    <div>
                      <span className="font-medium">Author:</span> {result.author}
                    </div>
                  )}
                </div>

                <div className="mt-3 px-3 py-2 bg-green-100 border border-green-200 rounded">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-sm font-medium text-green-800">
                      Processed with real PDF.js library
                    </span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Extracted {result.text.length} characters from {result.pages.length} pages
                  </p>
                </div>
              </div>

              {/* Extracted Text */}
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Full Extracted Text</h4>
                <div className="bg-white border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap">{result.text}</pre>
                </div>

                {/* Page-by-page view */}
                {result.pages.length > 1 && (
                  <div className="mt-4">
                    <h5 className="font-medium mb-2">Text by Page:</h5>
                    <div className="space-y-2">
                      {result.pages.map((page, index) => (
                        <details key={index} className="border border-gray-200 rounded">
                          <summary className="cursor-pointer p-3 bg-gray-50 font-medium text-sm">
                            Page {page.pageNumber} ({page.text.length} characters)
                          </summary>
                          <div className="p-3 text-sm bg-white max-h-32 overflow-y-auto">
                            <pre className="whitespace-pre-wrap">{page.text}</pre>
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex space-x-4">
                  <button
                    onClick={() => navigator.clipboard.writeText(result.text)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Copy Text
                  </button>
                  <button
                    onClick={() => {
                      const event = new CustomEvent('loadResumeText', {
                        detail: result.text
                      });
                      window.dispatchEvent(event);
                      alert('Text loaded into Resume Editor! Go to /resume-editor to continue.');
                    }}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Use in Resume Editor
                  </button>
                  <button
                    onClick={() => setResult(null)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Clear Results
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Technical Info */}
        <div className="mt-8 bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 text-blue-800">PDF.js Implementation Details</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>✅ Using pdfjs-dist library v4.0.379</li>
            <li>✅ Real text extraction with getTextContent()</li>
            <li>✅ Canvas-based PDF preview rendering</li>
            <li>✅ Character map support for better text recognition</li>
            <li>✅ Page-by-page processing with metadata</li>
            <li>✅ Console logging for debugging</li>
          </ul>
        </div>
      </div>
    </div>
  );
}