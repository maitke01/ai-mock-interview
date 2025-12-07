import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

interface SimplePdfEditorProps {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
}

const SimplePdfEditor: React.FC<SimplePdfEditorProps> = ({ file, isOpen, onClose }) => {
  const [pdfPages, setPdfPages] = useState<HTMLCanvasElement[]>([]);
  const [extractedText, setExtractedText] = useState('');
  const [editedText, setEditedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (file && isOpen) {
      loadAndExtractPDF(file);
    }
  }, [file, isOpen]);

  const loadAndExtractPDF = async (pdfFile: File) => {
    setIsLoading(true);
    setError(null);

    try {
      // Set up PDF.js worker
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
      } catch (workerError) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      }

      // Read PDF file
      const arrayBuffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 });
      const pdfDocument = await loadingTask.promise;

      console.log(`✓ PDF loaded: ${pdfDocument.numPages} pages`);

      // Render all pages to canvases
      const canvases: HTMLCanvasElement[] = [];
      let allText = '';

      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);

        // Render page to canvas
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        canvases.push(canvas);

        // Extract text
        const textContent = await page.getTextContent();
        const lines: { [key: number]: string[] } = {};

        textContent.items.forEach((item: any) => {
          if (item.str && item.str.trim()) {
            const y = Math.round(item.transform[5]);
            if (!lines[y]) lines[y] = [];
            lines[y].push(item.str);
          }
        });

        const sortedY = Object.keys(lines).map(Number).sort((a, b) => b - a);
        const pageText = sortedY.map(y => lines[y].join(' ')).join('\n');

        if (pageText.trim()) {
          allText += (allText ? '\n\n--- Page ' + pageNum + ' ---\n\n' : '') + pageText;
        }
      }

      setPdfPages(canvases);

      if (allText.trim()) {
        setExtractedText(allText);
        setEditedText(allText);
        console.log(`✓ Extracted ${allText.length} characters`);
      } else {
        setError('No text found. This PDF may be scanned or image-based. OCR feature coming soon.');
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('PDF processing error:', err);
      setError('Failed to process PDF: ' + (err.message || 'Unknown error'));
      setIsLoading(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(editedText);
    alert('Text copied to clipboard!');
  };

  const handleDownload = () => {
    const blob = new Blob([editedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file?.name?.replace('.pdf', '.txt') || 'extracted-text.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          PDF Editor - {file.name}
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyText}
            disabled={!editedText}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Copy Text
          </button>
          <button
            onClick={handleDownload}
            disabled={!editedText}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Download as TXT
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Two-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: PDF Viewer */}
        <div className="w-1/2 bg-gray-100 dark:bg-gray-900 overflow-auto p-8">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Original PDF
            </h3>
            {isLoading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading PDF...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 dark:text-red-300 font-medium mb-2">Error Loading PDF</p>
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            ) : (
              <div ref={canvasContainerRef} className="space-y-6">
                {pdfPages.map((canvas, index) => (
                  <div key={index} className="bg-white shadow-xl rounded-lg overflow-hidden">
                    <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 font-medium">
                      Page {index + 1}
                    </div>
                    <img
                      src={canvas.toDataURL()}
                      alt={`Page ${index + 1}`}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Editable Text */}
        <div className="w-1/2 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Extracted Text
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Edit the text below. Use Copy or Download buttons to save your changes.
            </p>
            {!isLoading && !error && !extractedText && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  ⚠️ No text could be extracted. This might be a scanned PDF or contain only images.
                </p>
              </div>
            )}
          </div>

          <div className="flex-1 p-6">
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              placeholder={isLoading ? "Extracting text..." : "Text will appear here..."}
              disabled={isLoading || !!error}
              className="w-full h-full p-4 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '500px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplePdfEditor;
