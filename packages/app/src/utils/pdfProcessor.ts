// Client-side PDF processing utilities
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy, TextItem } from 'pdfjs-dist/types/src/display/api';

// Configure PDF.js worker - use local worker file
GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

export interface ClientPDFProcessingResult {
  text: string;
  metadata: {
    pageCount: number;
    fileSize: number;
    title?: string;
    author?: string;
  };
  pages: Array<{
    pageNumber: number;
    text: string;
    width: number;
    height: number;
  }>;
  success: boolean;
  error?: string;
}

export class ClientPDFProcessor {
  static async processPDFFile(file: File): Promise<ClientPDFProcessingResult> {
    try {
      console.log('Starting PDF processing for file:', file.name);

      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);

      console.log('Loading PDF document...');
      // Load the PDF document
      const loadingTask = getDocument({
        data: typedArray,
        cMapUrl: '/cmaps/',
        cMapPacked: true,
      });

      const pdf: PDFDocumentProxy = await loadingTask.promise;
      console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);

      const pages: Array<{
        pageNumber: number;
        text: string;
        width: number;
        height: number;
      }> = [];

      let fullText = '';

      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`Processing page ${pageNum}...`);

        const page: PDFPageProxy = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });

        // Extract text from the page with proper spacing
        const textItems = textContent.items as TextItem[];
        const pageText = textItems
          .filter(item => 'str' in item)
          .map(item => (item as TextItem).str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        console.log(`Page ${pageNum} text length: ${pageText.length}`);

        pages.push({
          pageNumber: pageNum,
          text: pageText,
          width: viewport.width,
          height: viewport.height
        });

        fullText += pageText + '\n\n';
      }

      // Get metadata
      const metadata = await pdf.getMetadata();
      console.log('PDF metadata:', metadata.info);

      const result = {
        text: fullText.trim(),
        metadata: {
          pageCount: pdf.numPages,
          fileSize: file.size,
          title: metadata.info?.Title || undefined,
          author: metadata.info?.Author || undefined
        },
        pages,
        success: true
      };

      console.log('PDF processing completed successfully. Total text length:', result.text.length);
      return result;

    } catch (error) {
      console.error('PDF processing error:', error);
      return {
        text: '',
        metadata: { pageCount: 0, fileSize: file.size },
        pages: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error processing PDF'
      };
    }
  }

  static async extractTextOnly(file: File): Promise<{
    success: boolean;
    text?: string;
    error?: string;
  }> {
    try {
      const result = await this.processPDFFile(file);
      return {
        success: result.success,
        text: result.text,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF text extraction failed'
      };
    }
  }

  static validatePDF(file: File): {
    isValid: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check file type
    if (file.type !== 'application/pdf') {
      issues.push('File is not a valid PDF');
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      issues.push('File size exceeds 5MB limit');
    }

    // Warning for very small files
    if (file.size < 1024) {
      warnings.push('File size is very small - may not contain much content');
    }

    // Warning for very large files
    if (file.size > 2 * 1024 * 1024) {
      warnings.push('Large file - processing may take longer');
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static async generatePreview(file: File, pageNumber: number = 1): Promise<{
    success: boolean;
    imageUrl?: string;
    error?: string;
  }> {
    try {
      console.log(`Generating preview for page ${pageNumber}...`);

      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);

      const loadingTask = getDocument({
        data: typedArray,
        cMapUrl: '/cmaps/',
        cMapPacked: true,
      });

      const pdf: PDFDocumentProxy = await loadingTask.promise;

      if (pageNumber > pdf.numPages || pageNumber < 1) {
        throw new Error(`Invalid page number: ${pageNumber}. PDF has ${pdf.numPages} pages.`);
      }

      const page: PDFPageProxy = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });

      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Cannot create canvas context');
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render page
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      };

      await page.render(renderContext).promise;
      console.log('Page rendered successfully');

      // Convert to data URL
      const imageUrl = canvas.toDataURL('image/png', 0.8);

      return {
        success: true,
        imageUrl
      };

    } catch (error) {
      console.error('Preview generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Preview generation failed'
      };
    }
  }
}