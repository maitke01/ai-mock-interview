import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { extractText, extractImages } from 'unpdf';
import * as pdfjsLib from 'pdfjs-dist';

interface TextElement {
  id: string;
  type: 'text';
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  backgroundColor?: string;
  isBullet?: boolean;
  pageIndex: number;
}

interface ImageElement {
  id: string;
  type: 'image';
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
}

type Element = TextElement | ImageElement;

interface CleanPdfEditorProps {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newFile: File) => void;
}

const CleanPdfEditor: React.FC<CleanPdfEditorProps> = ({ file, isOpen, onClose, onSave }) => {
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [dragStart, setDragStart] = useState<{ x: number; y: number; elementX: number; elementY: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [pageDimensions, setPageDimensions] = useState({ width: 612, height: 792 });
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Toolbar states
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [textColor, setTextColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);

  // History
  const [history, setHistory] = useState<Element[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const canvasRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const bgColorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file && isOpen) {
      loadAndExtractPDF(file);
    }
  }, [file, isOpen]);

  const loadAndExtractPDF = async (pdfFile: File) => {
    setIsLoading(true);
    try {
      // Read the file as ArrayBuffer
      const originalArrayBuffer = await pdfFile.arrayBuffer();

      // Clone the ArrayBuffer for pdf-lib (it doesn't consume the buffer)
      const pdfLibBuffer = originalArrayBuffer.slice(0);
      const pdf = await PDFDocument.load(pdfLibBuffer);
      setPdfDoc(pdf);
      setPageCount(pdf.getPageCount());

      const page = pdf.getPage(0);
      const { width, height } = page.getSize();
      setPageDimensions({ width, height });

      // Extract text content directly with pdfjs-dist (most reliable)
      let extractedElements: Element[] = [];
      let textLines: string[] = [];

      console.log('Starting PDF text extraction with pdfjs-dist...');
      console.log('pdfjs version:', pdfjsLib.version);

      try {
        // Set worker path for pdfjs - use the local version from node_modules
        try {
          // Import from node_modules to match the exact version
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
          ).toString();
          console.log('Worker source set to local:', pdfjsLib.GlobalWorkerOptions.workerSrc);
        } catch (workerError) {
          console.warn('Could not set worker source:', workerError);
          // Fallback to CDN with correct version
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
          console.log('Using CDN fallback:', pdfjsLib.GlobalWorkerOptions.workerSrc);
        }

        console.log('Creating PDF document task...');
        // Clone ArrayBuffer for pdfjs
        const pdfjsBuffer = originalArrayBuffer.slice(0);
        const loadingTask = pdfjsLib.getDocument({
          data: pdfjsBuffer,
          verbosity: 0 // Reduce console spam
        });

        console.log('Loading PDF document...');
        const pdfDocument = await loadingTask.promise;

        console.log(`✓ PDF loaded successfully with ${pdfDocument.numPages} pages`);

        // Extract text from ALL pages
        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
          console.log(`Getting page ${pageNum}...`);
          const page = await pdfDocument.getPage(pageNum);
          console.log(`✓ Page ${pageNum} loaded, extracting text content...`);

          const textContent = await page.getTextContent();
          console.log(`✓ Page ${pageNum} text content extracted`);
          console.log(`pdfjs textContent items on page ${pageNum}:`, textContent.items.length);

          if (textContent.items.length === 0) {
            console.warn(`Page ${pageNum} has no text items - might be an image-based PDF`);
            continue;
          }

          // Group text items into lines
          const lines: { [key: number]: string[] } = {};

          textContent.items.forEach((item: any) => {
            if (item.str && item.str.trim()) {
              const y = Math.round(item.transform[5]); // Y position
              if (!lines[y]) {
                lines[y] = [];
              }
              lines[y].push(item.str);
            }
          });

          // Sort lines by Y position (top to bottom) and join text
          const sortedYPositions = Object.keys(lines).map(Number).sort((a, b) => b - a);
          const pageLines = sortedYPositions.map(y => lines[y].join(' '));

          console.log(`✓ Page ${pageNum} extracted lines:`, pageLines.length);
          console.log(`Sample lines from page ${pageNum}:`, pageLines.slice(0, 3));

          textLines.push(...pageLines);
        }

        console.log('✓ TOTAL pdfjs extracted lines:', textLines.length);
        console.log('All extracted text:', textLines);

        if (textLines.length === 0) {
          console.warn('No text lines extracted - PDF might be scanned/image-based');
        }

      } catch (pdfjsError: any) {
        console.error('Error with pdfjs-dist extraction:', pdfjsError);
        console.error('Error name:', pdfjsError?.name);
        console.error('Error message:', pdfjsError?.message);
        console.error('Error stack:', pdfjsError?.stack);
      }

      // If we extracted text, create editable text elements positioned on the page
      if (textLines && textLines.length > 0) {
        console.log('Creating editable elements from extracted text...');

        // Join all text lines with newlines and create ONE big text element
        const allText = textLines.join('\n');

        extractedElements.push({
          id: 'extracted-text-main',
          type: 'text',
          text: allText,
          x: 50,
          y: 50,
          fontSize: 12,
          fontFamily: 'Helvetica',
          color: '#000000',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          pageIndex: 0,
        });
      }

      console.log('Total extracted elements:', extractedElements.length);
      console.log('Sample elements:', extractedElements.slice(0, 3));

      // Extract images
      try {
        for (let i = 1; i <= pdf.getPageCount(); i++) {
          // Clone ArrayBuffer for image extraction
          const imagesBuffer = originalArrayBuffer.slice(0);
          const images = await extractImages(imagesBuffer, i);
          images.forEach((img, imgIndex) => {
            const blob = new Blob([img.data], { type: `image/${img.key}` });
            const imageUrl = URL.createObjectURL(blob);

            extractedElements.push({
              id: `image-extracted-${i}-${imgIndex}`,
              type: 'image',
              src: imageUrl,
              x: 50,
              y: 100 + (imgIndex * 150),
              width: 100,
              height: 100,
              pageIndex: i - 1,
            });
          });
        }
      } catch (imgError) {
        console.log('No images found in PDF or error extracting:', imgError);
      }

      // If no elements were extracted, add a helpful message
      if (extractedElements.length === 0) {
        console.warn('No text or images could be extracted from the PDF');
        extractedElements.push({
          id: 'helper-text',
          type: 'text',
          text: 'No text extracted. Click "Add Text" to start editing.',
          x: 100,
          y: 100,
          fontSize: 16,
          fontFamily: 'Helvetica',
          color: '#666666',
          fontWeight: 'normal',
          fontStyle: 'italic',
          textDecoration: 'none',
          pageIndex: 0,
        });
      }

      setElements(extractedElements);
      saveToHistory(extractedElements);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Failed to load PDF. Please try a different file.');
      setIsLoading(false);
    }
  };

  const saveToHistory = (newElements: Element[]) => {
    setHistory(prevHistory => {
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newElements)));
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  };

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  }, [history, historyIndex]);

  const addText = useCallback(() => {
    const newText: TextElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      text: 'Double click to edit',
      x: 100,
      y: 100,
      fontSize: fontSize,
      fontFamily: fontFamily,
      color: textColor,
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      textDecoration: isUnderline ? 'underline' : 'none',
      backgroundColor: backgroundColor !== '#ffffff' ? backgroundColor : undefined,
      isBullet: false,
      pageIndex: currentPage,
    };
    const newElements = [...elements, newText];
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedId(newText.id);
  }, [fontSize, fontFamily, textColor, backgroundColor, isBold, isItalic, isUnderline, currentPage, elements]);

  const addBulletPoint = useCallback(() => {
    const newText: TextElement = {
      id: `bullet-${Date.now()}`,
      type: 'text',
      text: 'Bullet point text',
      x: 80,
      y: 100,
      fontSize: fontSize,
      fontFamily: fontFamily,
      color: textColor,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      isBullet: true,
      pageIndex: currentPage,
    };
    const newElements = [...elements, newText];
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedId(newText.id);
  }, [fontSize, fontFamily, textColor, currentPage, elements]);

  const addImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const imgFile = e.target.files?.[0];
      if (imgFile) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newImage: ImageElement = {
            id: `img-${Date.now()}`,
            type: 'image',
            src: event.target?.result as string,
            x: 100,
            y: 100,
            width: 150,
            height: 150,
            pageIndex: currentPage,
          };
          const newElements = [...elements, newImage];
          setElements(newElements);
          saveToHistory(newElements);
          setSelectedId(newImage.id);
        };
        reader.readAsDataURL(imgFile);
      }
    };
    input.click();
  }, [currentPage, elements]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const newElements = elements.filter(el => el.id !== selectedId);
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedId(null);
  }, [selectedId, elements]);

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    const element = elements.find(el => el.id === elementId);
    if (element) {
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        elementX: element.x,
        elementY: element.y,
      });
      setSelectedId(elementId);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStart && selectedId) {
      const deltaX = (e.clientX - dragStart.x) / zoom;
      const deltaY = (e.clientY - dragStart.y) / zoom;

      setElements(prev => prev.map(el => {
        if (el.id === selectedId) {
          return {
            ...el,
            x: dragStart.elementX + deltaX,
            y: dragStart.elementY + deltaY,
          };
        }
        return el;
      }));
    }
  };

  const handleMouseUp = () => {
    if (dragStart) {
      saveToHistory(elements);
      setDragStart(null);
    }
  };

  const handleDoubleClick = (elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (element && element.type === 'text') {
      setEditingId(elementId);
      setEditingText(element.text);
    }
  };

  const handleFinishEditing = () => {
    if (!editingId) return;
    const newElements = elements.map(el =>
      el.id === editingId && el.type === 'text' ? { ...el, text: editingText } : el
    );
    setElements(newElements);
    saveToHistory(newElements);
    setEditingId(null);
    setEditingText('');
  };

  const updateSelectedStyle = (property: string, value: any) => {
    if (!selectedId) return;
    const newElements = elements.map(el =>
      el.id === selectedId ? { ...el, [property]: value } : el
    );
    setElements(newElements);
    saveToHistory(newElements);
  };

  const toggleBold = () => {
    const newBold = !isBold;
    setIsBold(newBold);
    if (selectedId) updateSelectedStyle('fontWeight', newBold ? 'bold' : 'normal');
  };

  const toggleItalic = () => {
    const newItalic = !isItalic;
    setIsItalic(newItalic);
    if (selectedId) updateSelectedStyle('fontStyle', newItalic ? 'italic' : 'normal');
  };

  const toggleUnderline = () => {
    const newUnderline = !isUnderline;
    setIsUnderline(newUnderline);
    if (selectedId) updateSelectedStyle('textDecoration', newUnderline ? 'underline' : 'none');
  };

  const changePage = (newPage: number) => {
    if (!pdfDoc || newPage < 0 || newPage >= pageCount) return;
    setCurrentPage(newPage);
    const page = pdfDoc.getPage(newPage);
    const { width, height } = page.getSize();
    setPageDimensions({ width, height });
  };

  const exportToPDF = async () => {
    if (!pdfDoc) return;
    setIsSaving(true);

    try {
      const newPdf = await PDFDocument.create();

      // Create pages
      for (let i = 0; i < pageCount; i++) {
        const page = newPdf.addPage([pageDimensions.width, pageDimensions.height]);
        const { height } = page.getSize();

        // Load fonts
        const helveticaFont = await newPdf.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await newPdf.embedFont(StandardFonts.HelveticaBold);
        const helveticaOblique = await newPdf.embedFont(StandardFonts.HelveticaOblique);
        const timesRoman = await newPdf.embedFont(StandardFonts.TimesRoman);
        const timesBold = await newPdf.embedFont(StandardFonts.TimesRomanBold);
        const courier = await newPdf.embedFont(StandardFonts.Courier);

        // Get elements for this page
        const pageElements = elements.filter(el => el.pageIndex === i);

        for (const element of pageElements) {
          if (element.type === 'text') {
            // Draw background if present
            if (element.backgroundColor) {
              const bgHex = element.backgroundColor.replace('#', '');
              const bgR = parseInt(bgHex.substr(0, 2), 16) / 255;
              const bgG = parseInt(bgHex.substr(2, 2), 16) / 255;
              const bgB = parseInt(bgHex.substr(4, 2), 16) / 255;

              const textWidth = element.text.length * element.fontSize * 0.6;
              page.drawRectangle({
                x: element.x - 2,
                y: height - element.y - element.fontSize - 2,
                width: textWidth,
                height: element.fontSize + 4,
                color: rgb(bgR, bgG, bgB),
              });
            }

            // Select font
            let font = helveticaFont;
            if (element.fontFamily.includes('Times')) {
              font = element.fontWeight === 'bold' ? timesBold : timesRoman;
            } else if (element.fontFamily.includes('Courier')) {
              font = courier;
            } else {
              if (element.fontWeight === 'bold') {
                font = helveticaBold;
              } else if (element.fontStyle === 'italic') {
                font = helveticaOblique;
              }
            }

            // Parse text color
            const colorHex = element.color.replace('#', '');
            const r = parseInt(colorHex.substr(0, 2), 16) / 255;
            const g = parseInt(colorHex.substr(2, 2), 16) / 255;
            const b = parseInt(colorHex.substr(4, 2), 16) / 255;

            const pdfY = height - element.y - element.fontSize;

            // Draw bullet if needed
            if (element.isBullet) {
              page.drawText('•', {
                x: element.x - 20,
                y: pdfY,
                size: element.fontSize,
                font: font,
                color: rgb(r, g, b),
              });
            }

            // Draw text
            page.drawText(element.text, {
              x: element.x,
              y: pdfY,
              size: element.fontSize,
              font: font,
              color: rgb(r, g, b),
            });
          } else if (element.type === 'image') {
            try {
              // Embed image
              const imageBytes = await fetch(element.src).then(res => res.arrayBuffer());
              let image;
              if (element.src.includes('png')) {
                image = await newPdf.embedPng(imageBytes);
              } else {
                image = await newPdf.embedJpg(imageBytes);
              }

              const pdfY = height - element.y - element.height;
              page.drawImage(image, {
                x: element.x,
                y: pdfY,
                width: element.width,
                height: element.height,
              });
            } catch (imgError) {
              console.error('Error embedding image:', imgError);
            }
          }
        }
      }

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const newFile = new File([blob], file?.name || 'edited.pdf', { type: 'application/pdf' });

      onSave(newFile);
      setIsSaving(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
      setIsSaving(false);
    }
  };

  const downloadPDF = async () => {
    if (!pdfDoc) return;
    setIsSaving(true);

    try {
      const newPdf = await PDFDocument.create();

      for (let i = 0; i < pageCount; i++) {
        const page = newPdf.addPage([pageDimensions.width, pageDimensions.height]);
        const { height } = page.getSize();

        const helveticaFont = await newPdf.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await newPdf.embedFont(StandardFonts.HelveticaBold);
        const helveticaOblique = await newPdf.embedFont(StandardFonts.HelveticaOblique);

        const pageElements = elements.filter(el => el.pageIndex === i);

        for (const element of pageElements) {
          if (element.type === 'text') {
            if (element.backgroundColor) {
              const bgHex = element.backgroundColor.replace('#', '');
              const bgR = parseInt(bgHex.substr(0, 2), 16) / 255;
              const bgG = parseInt(bgHex.substr(2, 2), 16) / 255;
              const bgB = parseInt(bgHex.substr(4, 2), 16) / 255;

              const textWidth = element.text.length * element.fontSize * 0.6;
              page.drawRectangle({
                x: element.x - 2,
                y: height - element.y - element.fontSize - 2,
                width: textWidth,
                height: element.fontSize + 4,
                color: rgb(bgR, bgG, bgB),
              });
            }

            let font = helveticaFont;
            if (element.fontWeight === 'bold') {
              font = helveticaBold;
            } else if (element.fontStyle === 'italic') {
              font = helveticaOblique;
            }

            const colorHex = element.color.replace('#', '');
            const r = parseInt(colorHex.substr(0, 2), 16) / 255;
            const g = parseInt(colorHex.substr(2, 2), 16) / 255;
            const b = parseInt(colorHex.substr(4, 2), 16) / 255;

            const pdfY = height - element.y - element.fontSize;

            if (element.isBullet) {
              page.drawText('•', {
                x: element.x - 20,
                y: pdfY,
                size: element.fontSize,
                font: font,
                color: rgb(r, g, b),
              });
            }

            page.drawText(element.text, {
              x: element.x,
              y: pdfY,
              size: element.fontSize,
              font: font,
              color: rgb(r, g, b),
            });
          } else if (element.type === 'image') {
            try {
              const imageBytes = await fetch(element.src).then(res => res.arrayBuffer());
              let image;
              if (element.src.includes('png')) {
                image = await newPdf.embedPng(imageBytes);
              } else {
                image = await newPdf.embedJpg(imageBytes);
              }

              const pdfY = height - element.y - element.height;
              page.drawImage(image, {
                x: element.x,
                y: pdfY,
                width: element.width,
                height: element.height,
              });
            } catch (imgError) {
              console.error('Error embedding image:', imgError);
            }
          }
        }
      }

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file?.name?.replace('.pdf', '_edited.pdf') || 'edited.pdf';
      a.click();
      URL.revokeObjectURL(url);

      setIsSaving(false);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF.');
      setIsSaving(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        addText();
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        deleteSelected();
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, selectedId, addText, deleteSelected, undo, redo]);

  // Update toolbar when selection changes
  useEffect(() => {
    if (selectedId) {
      const element = elements.find(el => el.id === selectedId);
      if (element && element.type === 'text') {
        setFontSize(element.fontSize);
        setFontFamily(element.fontFamily);
        setTextColor(element.color);
        setIsBold(element.fontWeight === 'bold');
        setIsItalic(element.fontStyle === 'italic');
        setIsUnderline(element.textDecoration === 'underline');
        setBackgroundColor(element.backgroundColor || '#ffffff');
      }
    }
  }, [selectedId, elements]);

  if (!isOpen || !file) return null;

  const currentPageElements = elements.filter(el => el.pageIndex === currentPage);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            PDF Editor - {file.name}
          </h2>
          {pageCount > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => changePage(currentPage - 1)}
                disabled={currentPage === 0}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-300 text-gray-900 dark:text-white"
              >
                ←
              </button>
              <span className="text-sm text-gray-900 dark:text-white">
                Page {currentPage + 1} of {pageCount}
              </span>
              <button
                onClick={() => changePage(currentPage + 1)}
                disabled={currentPage >= pageCount - 1}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-300 text-gray-900 dark:text-white"
              >
                →
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-300 text-gray-900 dark:text-white"
          >
            ↶ Undo
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-300 text-gray-900 dark:text-white"
          >
            ↷ Redo
          </button>

          <div className="flex items-center gap-2 ml-4">
            <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 text-gray-900 dark:text-white">-</button>
            <span className="text-sm text-gray-900 dark:text-white">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 text-gray-900 dark:text-white">+</button>
          </div>

          <button onClick={onClose} className="ml-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 text-gray-900 dark:text-white">
            Cancel
          </button>
          <button
            onClick={downloadPDF}
            disabled={isSaving}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300"
          >
            {isSaving ? 'Saving...' : 'Download'}
          </button>
          <button
            onClick={exportToPDF}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isSaving ? 'Saving...' : 'Save & Close'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 shadow-sm flex items-center px-4 py-2 gap-2 overflow-x-auto">
        <select
          value={fontFamily}
          onChange={(e) => {
            setFontFamily(e.target.value);
            if (selectedId) updateSelectedStyle('fontFamily', e.target.value);
          }}
          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="Helvetica">Helvetica</option>
          <option value="Times-Roman">Times Roman</option>
          <option value="Courier">Courier</option>
        </select>

        <input
          type="number"
          value={fontSize}
          onChange={(e) => {
            const newSize = Number(e.target.value);
            setFontSize(newSize);
            if (selectedId) updateSelectedStyle('fontSize', newSize);
          }}
          min="8"
          max="72"
          className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

        <button onClick={toggleBold} className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${isBold ? 'bg-gray-200 dark:bg-gray-600' : ''}`}>
          <span className="font-bold text-sm text-gray-900 dark:text-white">B</span>
        </button>
        <button onClick={toggleItalic} className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${isItalic ? 'bg-gray-200 dark:bg-gray-600' : ''}`}>
          <span className="italic text-sm text-gray-900 dark:text-white">I</span>
        </button>
        <button onClick={toggleUnderline} className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${isUnderline ? 'bg-gray-200 dark:bg-gray-600' : ''}`}>
          <span className="underline text-sm text-gray-900 dark:text-white">U</span>
        </button>

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

        <div className="relative">
          <button onClick={() => colorInputRef.current?.click()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-1">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">A</span>
            <div className="w-4 h-1 rounded" style={{ backgroundColor: textColor }}></div>
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={textColor}
            onChange={(e) => {
              setTextColor(e.target.value);
              if (selectedId) updateSelectedStyle('color', e.target.value);
            }}
            className="absolute opacity-0 w-0 h-0"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowBackgroundPicker(!showBackgroundPicker);
              bgColorInputRef.current?.click();
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-1"
            title="Background Color"
          >
            <span className="text-sm font-semibold text-gray-900 dark:text-white">BG</span>
            <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: backgroundColor }}></div>
          </button>
          <input
            ref={bgColorInputRef}
            type="color"
            value={backgroundColor}
            onChange={(e) => {
              setBackgroundColor(e.target.value);
              if (selectedId) updateSelectedStyle('backgroundColor', e.target.value);
            }}
            className="absolute opacity-0 w-0 h-0"
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Tools</h3>

          <div className="space-y-2">
            <button
              onClick={addText}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-left"
            >
              <span className="font-semibold">T</span> Add Text
            </button>

            <button
              onClick={addBulletPoint}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-left"
            >
              • Add Bullet Point
            </button>

            <button
              onClick={addImage}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-left"
            >
              🖼️ Add Image
            </button>

            {selectedId && (
              <button
                onClick={deleteSelected}
                className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                🗑️ Delete Selected
              </button>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <p className="text-xs text-green-800 dark:text-green-300">
                <strong>Elements on page:</strong> {currentPageElements.length}
                <br />
                <strong>Total elements:</strong> {elements.length}
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <strong>Tips:</strong>
                <br />• Click to select
                <br />• Drag to move
                <br />• Double-click text to edit
                <br />• Use toolbar for formatting
                <br />
                <strong>Shortcuts:</strong>
                <br />• Ctrl/Cmd + T: Add text
                <br />• Del/Backspace: Delete
                <br />• Ctrl/Cmd + Z: Undo
                <br />• Ctrl/Cmd + Y: Redo
              </p>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 overflow-auto p-8">
          {isLoading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-900 dark:text-white">Extracting PDF content...</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div
                ref={canvasRef}
                className="bg-white shadow-2xl relative"
                style={{
                  width: pageDimensions.width * zoom,
                  height: pageDimensions.height * zoom,
                }}
                onClick={() => setSelectedId(null)}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Clean white background - no PDF image */}

                {/* Debug info - shows if elements are present but not visible */}
                {currentPageElements.length === 0 && !isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <p className="text-gray-500 text-lg mb-2">No elements on this page</p>
                      <p className="text-gray-400 text-sm">Click "Add Text" to start editing</p>
                    </div>
                  </div>
                )}

                {/* Editable Elements */}
                <div className="absolute inset-0 pointer-events-none">
                  {currentPageElements.map(element => {
                    const isSelected = selectedId === element.id;

                    if (element.type === 'text') {
                      if (editingId === element.id) {
                        return (
                          <textarea
                            key={element.id}
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onBlur={handleFinishEditing}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleFinishEditing();
                              }
                              if (e.key === 'Escape') {
                                setEditingId(null);
                                setEditingText('');
                              }
                            }}
                            autoFocus
                            className="absolute p-1 bg-white border-2 border-blue-500 focus:outline-none resize-none pointer-events-auto"
                            style={{
                              left: element.x * zoom,
                              top: element.y * zoom,
                              fontSize: element.fontSize * zoom,
                              fontFamily: element.fontFamily,
                              color: element.color,
                              fontWeight: element.fontWeight,
                              fontStyle: element.fontStyle,
                              width: 400 * zoom,
                              minHeight: element.fontSize * zoom * 1.5,
                            }}
                          />
                        );
                      }

                      return (
                        <div key={element.id} className="absolute pointer-events-auto flex items-center">
                          {element.isBullet && (
                            <span
                              style={{
                                position: 'absolute',
                                left: (element.x - 20) * zoom,
                                top: element.y * zoom,
                                fontSize: element.fontSize * zoom,
                                color: element.color,
                                fontFamily: element.fontFamily,
                              }}
                            >
                              •
                            </span>
                          )}
                          <div
                            className={`cursor-move ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                            style={{
                              left: element.x * zoom,
                              top: element.y * zoom,
                              fontSize: element.fontSize * zoom,
                              fontFamily: element.fontFamily,
                              color: element.color,
                              fontWeight: element.fontWeight,
                              fontStyle: element.fontStyle,
                              textDecoration: element.textDecoration,
                              backgroundColor: element.backgroundColor,
                              padding: '2px 4px',
                              position: 'absolute',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(element.id);
                            }}
                            onMouseDown={(e) => handleMouseDown(e, element.id)}
                            onDoubleClick={() => handleDoubleClick(element.id)}
                          >
                            {element.text}
                          </div>
                        </div>
                      );
                    } else if (element.type === 'image') {
                      return (
                        <img
                          key={element.id}
                          src={element.src}
                          className={`absolute cursor-move pointer-events-auto ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                          style={{
                            left: element.x * zoom,
                            top: element.y * zoom,
                            width: element.width * zoom,
                            height: element.height * zoom,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(element.id);
                          }}
                          onMouseDown={(e) => handleMouseDown(e, element.id)}
                          alt="PDF Image"
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CleanPdfEditor;
