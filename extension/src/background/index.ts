/**
 * Background Script Entry Point
 * 
 * This is the main background service worker for the extension.
 * It manages:
 * - Resume storage and retrieval
 * - Resume parsing operations
 * - Communication with content scripts
 * - Extension lifecycle events
 */

console.log('Resume Autofill Extension - Background script loaded');

// Initialize extension on install
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // First-time installation setup
    initializeExtension();
  } else if (details.reason === 'update') {
    // Handle extension updates
    console.log('Extension updated to version:', chrome.runtime.getManifest().version);
  }
});

/**
 * Initialize extension storage and default settings
 */
async function initializeExtension(): Promise<void> {
  try {
    await chrome.storage.local.set({
      resumes: [],
      activeResumeId: null,
      applications: [],
      settings: {
        autoSync: true,
        encryptSensitiveData: true
      }
    });
    console.log('Extension initialized successfully');
  } catch (error) {
    console.error('Failed to initialize extension:', error);
  }
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type);
  
  // Handle async responses
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    });
  
  // Return true to indicate async response
  return true;
});

/**
 * Handle messages from content scripts
 */
async function handleMessage(message: any, _sender: chrome.runtime.MessageSender): Promise<any> {
  switch (message.type) {
    case 'GET_RESUME_LIST':
      return await getResumeList();
    
    case 'GET_ACTIVE_RESUME':
      return await getActiveResume();
    
    case 'PING':
      return { success: true, message: 'pong' };
    
    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

/**
 * Get all stored resumes
 */
async function getResumeList(): Promise<any> {
  const data = await chrome.storage.local.get(['resumes']);
  return {
    success: true,
    resumes: data['resumes'] || []
  };
}

/**
 * Get the currently active resume
 */
async function getActiveResume(): Promise<any> {
  const data = await chrome.storage.local.get(['activeResumeId', 'resumes']);
  const activeId = data['activeResumeId'];
  
  if (!activeId) {
    return { success: true, resume: null };
  }
  
  const resumes = (data['resumes'] || []) as any[];
  const activeResume = resumes.find((r: any) => r.id === activeId);
  
  return {
    success: true,
    resume: activeResume || null
  };
}

export {};
