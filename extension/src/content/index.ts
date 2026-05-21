/**
 * Content Script Entry Point
 * 
 * This script is injected into all web pages and handles:
 * - Form detection on career pages
 * - Autofill operations
 * - Communication with the web page management panel
 * - Communication with the background script
 */

console.log('Resume Autofill Extension - Content script loaded');

/**
 * Initialize content script
 */
function initialize(): void {
  console.log('Initializing content script on:', window.location.href);
  
  // Set up message listener for web page communication
  window.addEventListener('message', handleWebPageMessage);
  
  // Notify web page that extension is ready
  notifyExtensionReady();
}

/**
 * Handle messages from the web page (management panel)
 */
function handleWebPageMessage(event: MessageEvent): void {
  // Security: verify origin if needed
  // For now, we'll process all messages but this should be restricted in production
  
  const { type, payload } = event.data;
  
  if (!type) {
    return; // Not a message for us
  }
  
  console.log('Content script received message from page:', type);
  
  switch (type) {
    case 'DETECT_FORM':
      handleFormDetection();
      break;
    
    case 'TRIGGER_AUTOFILL':
      handleAutofill(payload);
      break;
    
    case 'GET_RESUME_LIST':
      handleGetResumeList();
      break;
    
    default:
      console.log('Unknown message type:', type);
  }
}

/**
 * Notify web page that extension is ready
 */
function notifyExtensionReady(): void {
  window.postMessage({
    type: 'EXTENSION_READY',
    payload: {
      version: chrome.runtime.getManifest().version
    }
  }, '*');
}

/**
 * Handle form detection request
 */
function handleFormDetection(): void {
  console.log('Detecting forms on page...');
  
  // Placeholder: actual form detection logic will be implemented in later tasks
  const forms = document.querySelectorAll('form');
  const detected = forms.length > 0;
  
  window.postMessage({
    type: 'FORM_DETECTED',
    payload: {
      detected,
      fieldCount: 0,
      companyName: document.title,
      positionName: ''
    }
  }, '*');
}

/**
 * Handle autofill request
 */
function handleAutofill(payload: any): void {
  console.log('Autofill requested for resume:', payload?.resumeId);
  
  // Placeholder: actual autofill logic will be implemented in later tasks
  window.postMessage({
    type: 'AUTOFILL_STATUS',
    payload: {
      status: 'success',
      filledFields: 0,
      totalFields: 0,
      errors: []
    }
  }, '*');
}

/**
 * Handle get resume list request
 */
async function handleGetResumeList(): Promise<void> {
  try {
    // Request resume list from background script
    const response = await chrome.runtime.sendMessage({
      type: 'GET_RESUME_LIST'
    });
    
    window.postMessage({
      type: 'RESUME_LIST_UPDATE',
      payload: {
        resumes: response.resumes || []
      }
    }, '*');
  } catch (error) {
    console.error('Failed to get resume list:', error);
    window.postMessage({
      type: 'ERROR',
      payload: {
        message: 'Failed to get resume list'
      }
    }, '*');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

export {};
