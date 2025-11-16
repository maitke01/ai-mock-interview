import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Use the Vite-compatible worker entry point
// The worker is now imported and set differently for Vite compatibility
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();

interface TextElement {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  fontFamily: string;
  width?: number;
}

interface PdfEditorModalProps {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newFile: File) => void;
}

const PdfEditorModal: React.FC<PdfEditorModalProps> = ({ file, isOpen, onClose, onSave }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tool, setTool] = useState<'text' | 'erase'>('text');
  const [pageScale, setPageScale] = useState(1.5);
  const pageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Text properties
  const [textInput, setTextInput] = useState('');
  const [fontSize, setFontSize] = useState(12);
  const [fontColor, setFontColor] = useState('#000000');
  const [fontFamily, setFontFamily] = useState('Helvetica');

  useEffect(() => {
    if (file) {
      setNumPages(null);
      setTextElements([]);
      setSelectedElement(null);
      setCurrentPage(1);
    }
  }, [file]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
    if (tool === 'text' && textInput.trim()) {
      const pageDiv = pageRefs.current[pageIndex];
      if (!pageDiv) return;

      const rect = pageDiv.getBoundingClientRect();
      const x = (e.clientX - rect.left) / pageScale;
      const y = (e.clientY - rect.top) / pageScale;

      const newElement: TextElement = {
        id: `text-${Date.now()}`,
        pageIndex,
        x,
        y,
        text: textInput,
        fontSize,
        color: fontColor,
        fontFamily,
      };

      setTextElements([...textElements, newElement]);
      setTextInput('');
    }
  };

  const handleElementClick = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    setSelectedElement(elementId);
    const element = textElements.find(el => el.id === elementId);
    if (element) {
      setTextInput(element.text);
      setFontSize(element.fontSize);
      setFontColor(element.color);
      setFontFamily(element.fontFamily);
    }
  };

  const updateSelectedElement = () => {
    if (selectedElement) {
      setTextElements(textElements.map(el =>
        el.id === selectedElement
          ? { ...el, text: textInput, fontSize, color: fontColor, fontFamily }
          : el
      ));
    }
  };

  const deleteSelectedElement = () => {
    if (selectedElement) {
      setTextElements(textElements.filter(el => el.id !== selectedElement));
      setSelectedElement(null);
      setTextInput('');
    }
  };

  const handleSave = async () => {
    if (!file) {
      alert('No file to save.');
      return;
    }

    setIsSaving(true);
    try {
      const existingPdfBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();

      // Embed fonts
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const courier = await pdfDoc.embedFont(StandardFonts.Courier);

      const fontMap: { [key: string]: any } = {
        'Helvetica': helveticaFont,
        'Helvetica-Bold': helveticaBold,
        'Times-Roman': timesRoman,
        'Courier': courier,
      };

      // Add all text elements
      textElements.forEach(element => {
        const targetPage = pages[element.pageIndex];
        if (targetPage) {
          const { height } = targetPage.getSize();
          const y_pdf = height - element.y;

          const colorR = parseInt(element.color.slice(1, 3), 16) / 255;
          const colorG = parseInt(element.color.slice(3, 5), 16) / 255;
          const colorB = parseInt(element.color.slice(5, 7), 16) / 255;

          const font = fontMap[element.fontFamily] || helveticaFont;

          targetPage.drawText(element.text, {
            x: element.x,
            y: y_pdf,
            font: font,
            size: element.fontSize,
            color: rgb(colorR, colorG, colorB),
          });
        }
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const newFile = new File([blob], file.name, { type: 'application/pdf' });
      onSave(newFile);
      onClose();
    } catch (error) {
      console.error('Error saving PDF:', error);
      alert('Failed to save the PDF. Please check the console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-[98vw] h-[98vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            PDF Editor - {file.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Toolbar Sidebar */}
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 overflow-y-auto">
            <div className="space-y-6">
              {/* Tools */}
              <div>
                <h4 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Tools</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTool('text')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      tool === 'text'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    Text
                  </button>
                  <button
                    onClick={() => setTool('erase')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      tool === 'erase'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    Erase
                  </button>
                </div>
              </div>

              {/* Text Input */}
              {tool === 'text' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Text Content
                    </label>
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Enter text to add..."
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      rows={3}
                    />
                    {selectedElement && (
                      <button
                        onClick={updateSelectedElement}
                        className="mt-2 w-full px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                      >
                        Update Selected
                      </button>
                    )}
                  </div>

                  {/* Font Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Font Family
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="Helvetica">Helvetica</option>
                      <option value="Helvetica-Bold">Helvetica Bold</option>
                      <option value="Times-Roman">Times Roman</option>
                      <option value="Courier">Courier</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Font Size
                      </label>
                      <input
                        type="number"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        min="6"
                        max="72"
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Color
                      </label>
                      <input
                        type="color"
                        value={fontColor}
                        onChange={(e) => setFontColor(e.target.value)}
                        className="w-full h-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <h5 className="font-semibold text-sm text-blue-900 dark:text-blue-300 mb-2">
                  How to Use
                </h5>
                <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
                  <li>1. Select Text tool and enter content</li>
                  <li>2. Click on PDF to place text</li>
                  <li>3. Click existing text to edit it</li>
                  <li>4. Click Save when done</li>
                </ul>
              </div>

              {/* Selected Element Actions */}
              {selectedElement && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                  <h5 className="font-semibold text-sm text-yellow-900 dark:text-yellow-300 mb-2">
                    Selected Element
                  </h5>
                  <button
                    onClick={deleteSelectedElement}
                    className="w-full px-3 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                  >
                    Delete Selected
                  </button>
                </div>
              )}

              {/* Zoom Control */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Zoom: {Math.round(pageScale * 100)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={pageScale}
                  onChange={(e) => setPageScale(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-6">
            <div className="max-w-4xl mx-auto">
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">Loading PDF...</p>
                    </div>
                  </div>
                }
                error={
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center text-red-600 dark:text-red-400">
                      <p className="text-lg font-semibold">Failed to load PDF</p>
                      <p className="text-sm">Please try another file</p>
                    </div>
                  </div>
                }
              >
                {Array.from(new Array(numPages), (el, index) => (
                  <div
                    key={`page_${index + 1}`}
                    className="relative mb-6 shadow-xl bg-white rounded-sm overflow-hidden"
                    style={{ transform: `scale(${pageScale})`, transformOrigin: 'top center' }}
                  >
                    <div
                      ref={(el) => (pageRefs.current[index] = el)}
                      onClick={(e) => handlePageClick(e, index)}
                      className={tool === 'text' ? 'cursor-crosshair' : 'cursor-pointer'}
                    >
                      <Page pageNumber={index + 1} />
                    </div>

                    {/* Render text elements for this page */}
                    {textElements
                      .filter(el => el.pageIndex === index)
                      .map(element => (
                        <div
                          key={element.id}
                          onClick={(e) => handleElementClick(e, element.id)}
                          className={`absolute cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all ${
                            selectedElement === element.id ? 'ring-2 ring-blue-600' : ''
                          }`}
                          style={{
                            left: element.x * pageScale,
                            top: element.y * pageScale,
                            fontSize: element.fontSize * pageScale,
                            color: element.color,
                            fontFamily: element.fontFamily,
                            whiteSpace: 'pre-wrap',
                            padding: '2px 4px',
                          }}
                        >
                          {element.text}
                        </div>
                      ))}
                  </div>
                ))}
              </Document>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {textElements.length} element(s) added
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none disabled:bg-blue-300 dark:disabled:bg-blue-800 transition-colors"
            >
              {isSaving ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfEditorModal;