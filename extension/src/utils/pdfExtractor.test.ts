/**
 * Unit Tests for PDF Text Extraction Module
 * 
 * These tests verify the PDF extraction functionality including:
 * - Successful text extraction from valid PDFs
 * - Error handling for invalid/corrupted files
 * - Multi-page PDF support
 * - Text structure preservation
 * - Edge cases (empty files, password-protected, etc.)
 * 
 * @module utils/pdfExtractor.test
 */

import { extractPDFText, isPDFFile, getPDFMetadata } from './pdfExtractor';

// Mock pdf.js library
jest.mock('pdfjs-dist', () => {
  const mockPdfjs = {
    version: '4.0.379',
    GlobalWorkerOptions: {
      workerSrc: ''
    },
    getDocument: jest.fn()
  };
  return mockPdfjs;
});

import * as pdfjsLib from 'pdfjs-dist';

describe('PDF Text Extraction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractPDFText', () => {
    it('should extract text from a valid single-page PDF', async () => {
      // Mock PDF document
      const mockTextContent = {
        items: [
          { str: 'John', transform: [1, 0, 0, 1, 0, 100] },
          { str: 'Doe', transform: [1, 0, 0, 1, 50, 100] },
          { str: 'Software', transform: [1, 0, 0, 1, 0, 90] },
          { str: 'Engineer', transform: [1, 0, 0, 1, 50, 90] }
        ]
      };

      const mockPage = {
        getTextContent: jest.fn().mockResolvedValue(mockTextContent),
        cleanup: jest.fn()
      };

      const mockPdfDocument = {
        numPages: 1,
        getPage: jest.fn().mockResolvedValue(mockPage),
        destroy: jest.fn().mockResolvedValue(undefined)
      };

      const mockLoadingTask = {
        promise: Promise.resolve(mockPdfDocument)
      };

      (pdfjsLib.getDocument as jest.Mock).mockReturnValue(mockLoadingTask);

      // Create mock File
      const mockFile = new File(['mock pdf content'], 'resume.pdf', {
        type: 'application/pdf'
      });

      // Extract text
      const result = await extractPDFText(mockFile);

      // Verify success
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toContain('John Doe');
        expect(result.value).toContain('Software Engineer');
      }

      // Verify cleanup
      expect(mockPage.cleanup).toHaveBeenCalled();
      expect(mockPdfDocument.destroy).toHaveBeenCalled();
    });

    it('should extract text from a multi-page PDF', async () => {
      // Mock PDF document with 2 pages
      const mockTextContent1 = {
        items: [
          { str: 'Page', transform: [1, 0, 0, 1, 0, 100] },
          { str: '1', transform: [1, 0, 0, 1, 50, 100] }
        ]
      };

      const mockTextContent2 = {
        items: [
          { str: 'Page', transform: [1, 0, 0, 1, 0, 100] },
          { str: '2', transform: [1, 0, 0, 1, 50, 100] }
        ]
      };

      const mockPage1 = {
        getTextContent: jest.fn().mockResolvedValue(mockTextContent1),
        cleanup: jest.fn()
      };

      const mockPage2 = {
        getTextContent: jest.fn().mockResolvedValue(mockTextContent2),
        cleanup: jest.fn()
      };

      const mockPdfDocument = {
        numPages: 2,
        getPage: jest.fn()
          .mockResolvedValueOnce(mockPage1)
          .mockResolvedValueOnce(mockPage2),
        destroy: jest.fn().mockResolvedValue(undefined)
      };

      const mockLoadingTask = {
        promise: Promise.resolve(mockPdfDocument)
      };

      (pdfjsLib.getDocument as jest.Mock).mockReturnValue(mockLoadingTask);

      // Create mock File
      const mockFile = new File(['mock pdf content'], 'resume.pdf', {
        type: 'application/pdf'
      });

      // Extract text
      const result = await extractPDFText(mockFile);

      // Verify success
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toContain('Page 1');
        expect(result.value).toContain('Page 2');
        // Pages should be separated by double newline
        expect(result.value).toMatch(/Page 1\n\nPage 2/);
      }

      // Verify both pages were processed
      expect(mockPdfDocument.getPage).toHaveBeenCalledTimes(2);
      expect(mockPage1.cleanup).toHaveBeenCalled();
      expect(mockPage2.cleanup).toHaveBeenCalled();
    });

    it('should preserve line breaks in text structure', async () => {
      // Mock PDF with multiple lines (different Y positions)
      const mockTextContent = {
        items: [
          { str: 'Line', transform: [1, 0, 0, 1, 0, 100] },
          { str: '1', transform: [1, 0, 0, 1, 50, 100] },
          { str: 'Line', transform: [1, 0, 0, 1, 0, 90] }, // Different Y
          { str: '2', transform: [1, 0, 0, 1, 50, 90] },
          { str: 'Line', transform: [1, 0, 0, 1, 0, 80] }, // Different Y
          { str: '3', transform: [1, 0, 0, 1, 50, 80] }
        ]
      };

      const mockPage = {
        getTextContent: jest.fn().mockResolvedValue(mockTextContent),
        cleanup: jest.fn()
      };

      const mockPdfDocument = {
        numPages: 1,
        getPage: jest.fn().mockResolvedValue(mockPage),
        destroy: jest.fn().mockResolvedValue(undefined)
      };

      const mockLoadingTask = {
        promise: Promise.resolve(mockPdfDocument)
      };

      (pdfjsLib.getDocument as jest.Mock).mockReturnValue(mockLoadingTask);

      const mockFile = new File(['mock pdf content'], 'resume.pdf', {
        type: 'application/pdf'
      });

      const result = await extractPDFText(mockFile);

      expect(result.success).toBe(true);
      if (result.success) {
        // Lines should be separated by newlines
        const lines = result.value.split('\n');
        expect(lines).toContain('Line 1');
        expect(lines).toContain('Line 2');
        expect(lines).toContain('Line 3');
      }
    });

    it('should handle invalid file format', async () => {
      // Create non-PDF file
      const mockFile = new File(['not a pdf'], 'document.txt', {
        type: 'text/plain'
      });

      const result = await extractPDFText(mockFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('INVALID_FORMAT');
        expect(result.error.message).toContain('not a valid PDF');
      }
    });

    it('should handle empty file', async () => {
      // Create empty PDF file
      const mockFile = new File([], 'empty.pdf', {
        type: 'application/pdf'
      });

      const result = await extractPDFText(mockFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('EMPTY_FILE');
        expect(result.error.message).toContain('empty');
      }
    });

    it('should handle corrupted PDF', async () => {
      // Mock PDF loading error
      class InvalidPDFException extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'InvalidPDFException';
        }
      }
      
      const mockError = new InvalidPDFException('Invalid PDF structure');

      (pdfjsLib.getDocument as jest.Mock).mockImplementation(() => ({
        promise: new Promise((_, reject) => {
          // Reject asynchronously to allow the code to set up error handling
          setImmediate(() => reject(mockError));
        })
      }));

      const mockFile = new File(['corrupted pdf'], 'corrupted.pdf', {
        type: 'application/pdf'
      });

      const result = await extractPDFText(mockFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('INVALID_FORMAT');
        expect(result.error.message).toContain('corrupted');
      }
    });

    it('should handle password-protected PDF', async () => {
      // Mock password error
      class PasswordException extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'PasswordException';
        }
      }
      
      const mockError = new PasswordException('Password required');

      (pdfjsLib.getDocument as jest.Mock).mockImplementation(() => ({
        promise: new Promise((_, reject) => {
          // Reject asynchronously to allow the code to set up error handling
          setImmediate(() => reject(mockError));
        })
      }));

      const mockFile = new File(['protected pdf'], 'protected.pdf', {
        type: 'application/pdf'
      });

      const result = await extractPDFText(mockFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('CORRUPTED_FILE');
        expect(result.error.message).toContain('password-protected');
      }
    });

    it('should handle PDF with no extractable text', async () => {
      // Mock PDF with empty text content
      const mockTextContent = {
        items: []
      };

      const mockPage = {
        getTextContent: jest.fn().mockResolvedValue(mockTextContent),
        cleanup: jest.fn()
      };

      const mockPdfDocument = {
        numPages: 1,
        getPage: jest.fn().mockResolvedValue(mockPage),
        destroy: jest.fn().mockResolvedValue(undefined)
      };

      const mockLoadingTask = {
        promise: Promise.resolve(mockPdfDocument)
      };

      (pdfjsLib.getDocument as jest.Mock).mockReturnValue(mockLoadingTask);

      const mockFile = new File(['image pdf'], 'scanned.pdf', {
        type: 'application/pdf'
      });

      const result = await extractPDFText(mockFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('EMPTY_FILE');
        expect(result.error.message).toContain('no extractable text');
      }
    });

    it('should continue processing if one page fails', async () => {
      // Mock PDF where page 1 succeeds but page 2 fails
      const mockTextContent1 = {
        items: [
          { str: 'Page', transform: [1, 0, 0, 1, 0, 100] },
          { str: '1', transform: [1, 0, 0, 1, 50, 100] }
        ]
      };

      const mockPage1 = {
        getTextContent: jest.fn().mockResolvedValue(mockTextContent1),
        cleanup: jest.fn()
      };

      const mockPage2 = {
        getTextContent: jest.fn().mockRejectedValue(new Error('Page error')),
        cleanup: jest.fn()
      };

      const mockPdfDocument = {
        numPages: 2,
        getPage: jest.fn()
          .mockResolvedValueOnce(mockPage1)
          .mockResolvedValueOnce(mockPage2),
        destroy: jest.fn().mockResolvedValue(undefined)
      };

      const mockLoadingTask = {
        promise: Promise.resolve(mockPdfDocument)
      };

      (pdfjsLib.getDocument as jest.Mock).mockReturnValue(mockLoadingTask);

      const mockFile = new File(['mock pdf'], 'resume.pdf', {
        type: 'application/pdf'
      });

      const result = await extractPDFText(mockFile);

      // Should still succeed with page 1 content
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toContain('Page 1');
      }
    });

    it('should accept ArrayBuffer input', async () => {
      // Mock PDF document
      const mockTextContent = {
        items: [
          { str: 'Test', transform: [1, 0, 0, 1, 0, 100] }
        ]
      };

      const mockPage = {
        getTextContent: jest.fn().mockResolvedValue(mockTextContent),
        cleanup: jest.fn()
      };

      const mockPdfDocument = {
        numPages: 1,
        getPage: jest.fn().mockResolvedValue(mockPage),
        destroy: jest.fn().mockResolvedValue(undefined)
      };

      const mockLoadingTask = {
        promise: Promise.resolve(mockPdfDocument)
      };

      (pdfjsLib.getDocument as jest.Mock).mockReturnValue(mockLoadingTask);

      // Create ArrayBuffer
      const arrayBuffer = new ArrayBuffer(100);

      const result = await extractPDFText(arrayBuffer);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toContain('Test');
      }
    });

    it('should handle empty ArrayBuffer', async () => {
      const arrayBuffer = new ArrayBuffer(0);

      const result = await extractPDFText(arrayBuffer);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('EMPTY_FILE');
      }
    });
  });

  describe('isPDFFile', () => {
    it('should return true for PDF files with correct MIME type', () => {
      const file = new File(['content'], 'resume.pdf', {
        type: 'application/pdf'
      });

      expect(isPDFFile(file)).toBe(true);
    });

    it('should return true for PDF files with .pdf extension', () => {
      const file = new File(['content'], 'resume.pdf', {
        type: 'application/octet-stream'
      });

      expect(isPDFFile(file)).toBe(true);
    });

    it('should return true for PDF files with uppercase extension', () => {
      const file = new File(['content'], 'resume.PDF', {
        type: 'application/octet-stream'
      });

      expect(isPDFFile(file)).toBe(true);
    });

    it('should return false for non-PDF files', () => {
      const file = new File(['content'], 'document.txt', {
        type: 'text/plain'
      });

      expect(isPDFFile(file)).toBe(false);
    });

    it('should return false for DOCX files', () => {
      const file = new File(['content'], 'resume.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      expect(isPDFFile(file)).toBe(false);
    });
  });

  describe('getPDFMetadata', () => {
    it('should extract metadata from valid PDF', async () => {
      const mockMetadata = {
        info: {
          Title: 'Resume',
          Author: 'John Doe',
          CreationDate: '2024-01-01'
        }
      };

      const mockPdfDocument = {
        numPages: 3,
        getMetadata: jest.fn().mockResolvedValue(mockMetadata.info),
        destroy: jest.fn().mockResolvedValue(undefined)
      };

      const mockLoadingTask = {
        promise: Promise.resolve(mockPdfDocument)
      };

      (pdfjsLib.getDocument as jest.Mock).mockReturnValue(mockLoadingTask);

      const mockFile = new File(['pdf content'], 'resume.pdf', {
        type: 'application/pdf'
      });

      const result = await getPDFMetadata(mockFile);

      expect(result).not.toBeNull();
      expect(result?.numPages).toBe(3);
      expect(result?.info.Title).toBe('Resume');
      expect(mockPdfDocument.destroy).toHaveBeenCalled();
    });

    it('should return null for invalid PDF', async () => {
      const mockError = new Error('Invalid PDF');
      
      (pdfjsLib.getDocument as jest.Mock).mockImplementation(() => ({
        promise: new Promise((_, reject) => {
          // Reject asynchronously to allow the code to set up error handling
          setImmediate(() => reject(mockError));
        })
      }));

      const mockFile = new File(['invalid'], 'invalid.pdf', {
        type: 'application/pdf'
      });

      const result = await getPDFMetadata(mockFile);

      expect(result).toBeNull();
    });

    it('should accept ArrayBuffer input', async () => {
      const mockMetadata = {
        info: {
          Title: 'Test'
        }
      };

      const mockPdfDocument = {
        numPages: 1,
        getMetadata: jest.fn().mockResolvedValue(mockMetadata.info),
        destroy: jest.fn().mockResolvedValue(undefined)
      };

      const mockLoadingTask = {
        promise: Promise.resolve(mockPdfDocument)
      };

      (pdfjsLib.getDocument as jest.Mock).mockReturnValue(mockLoadingTask);

      const arrayBuffer = new ArrayBuffer(100);

      const result = await getPDFMetadata(arrayBuffer);

      expect(result).not.toBeNull();
      expect(result?.numPages).toBe(1);
    });
  });
});
