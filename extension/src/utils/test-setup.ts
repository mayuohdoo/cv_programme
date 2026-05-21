/**
 * Jest Test Setup
 * 
 * This file runs before all tests to set up the testing environment.
 */

// Suppress unhandled promise rejection warnings in tests
// These are expected when testing error handling
process.on('unhandledRejection', () => {
  // Ignore unhandled rejections in tests
});

// Mock chrome API for testing
(global as any).chrome = {
  runtime: {
    onInstalled: {
      addListener: jest.fn()
    },
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn(),
    getManifest: jest.fn(() => ({
      version: '1.0.0',
      name: 'Test Extension'
    }))
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    }
  }
} as any;

// Mock window.postMessage for content script tests
if (typeof window !== 'undefined') {
  window.postMessage = jest.fn();
}

// Suppress console logs in tests unless explicitly needed
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Polyfill File.arrayBuffer() for Jest environment
if (typeof File !== 'undefined' && !File.prototype.arrayBuffer) {
  File.prototype.arrayBuffer = function(): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}
