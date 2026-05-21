# Design Document: User Profile Sidebar

## Overview

The User Profile Sidebar feature introduces a collapsible left-side panel for managing user information, resume uploads, and viewing parsing results in the resume parsing system. This design maintains the existing 樱花粉 (sakura pink) aesthetic while adding persistent user data management through browser localStorage.

### Key Design Goals

1. **Non-intrusive Integration**: Seamlessly integrate with existing upload/parsing workflow without breaking functionality
2. **Persistent State Management**: Store user data, resume history, and UI state in localStorage
3. **Smooth Animations**: Provide fluid transitions (300ms) for expand/collapse operations
4. **Responsive Layout**: Adapt to different viewport sizes (desktop, tablet, mobile)
5. **First-time User Experience**: Guide new users through the upload process with expanded sidebar by default

### Design Principles

- **Progressive Enhancement**: Core functionality works without JavaScript, enhanced with localStorage
- **Mobile-First Responsive**: Graceful degradation from desktop to mobile
- **Accessibility**: Keyboard navigation, ARIA labels, and screen reader support
- **Performance**: Minimize reflows, use CSS transforms for animations
- **Data Integrity**: Validate and sanitize all localStorage data

## Architecture

### Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                         Header                               │
└─────────────────────────────────────────────────────────────┘
┌──────────────┬──────────────────────────────────────────────┐
│              │                                               │
│  Profile     │         Main Content Area                     │
│  Sidebar     │  ┌─────────────────────────────────────┐    │
│              │  │   Diagnosis Box (expanded)          │    │
│  ┌────────┐  │  │   - Replaces upload panel space     │    │
│  │ User   │  │  │   - Shows resume quality metrics    │    │
│  │ Info   │  │  └─────────────────────────────────────┘    │
│  └────────┘  │                                               │
│              │  ┌─────────────────────────────────────┐    │
│  ┌────────┐  │  │   Result Panel                      │    │
│  │Resume  │  │  │   - MBTI inference                  │    │
│  │List    │  │  │   - Job recommendations             │    │
│  └────────┘  │  └─────────────────────────────────────┘    │
│              │                                               │
│  ┌────────┐  │                                               │
│  │Upload  │  │                                               │
│  │Area    │  │                                               │
│  └────────┘  │                                               │
│              │                                               │
│  [Toggle]    │                                               │
└──────────────┴──────────────────────────────────────────────┘
```

### State Management Architecture

```
LocalStorage Schema:
{
  "userProfile": {
    "name": string,
    "avatar": string (base64 or URL),
    "createdAt": timestamp
  },
  "resumes": [
    {
      "id": string (UUID),
      "fileName": string,
      "uploadTime": timestamp,
      "parseResult": object,
      "fileSize": number,
      "fileType": string
    }
  ],
  "activeResumeId": string (UUID),
  "sidebarState": "expanded" | "collapsed",
  "version": "1.0"
}
```

### Layout System

**Desktop (>1024px)**:
- Sidebar expanded: 20% width (320px min, 400px max)
- Sidebar collapsed: 60px width
- Diagnosis box: Expands to fill left column space
- Result panel: Maintains original position

**Tablet (768px - 1024px)**:
- Sidebar expanded: 25% width (280px min)
- Sidebar collapsed: 60px width
- Responsive grid adjustments

**Mobile (<768px)**:
- Sidebar expanded: Full-screen overlay with close button
- Sidebar collapsed: 60px fixed left edge
- Stack layout for main content

## Components and Interfaces

### 1. ProfileSidebar Component

**Responsibilities**:
- Render user info, resume list, upload area
- Handle expand/collapse transitions
- Manage localStorage persistence
- Coordinate with main layout

**Interface**:
```javascript
class ProfileSidebar {
  constructor(options: {
    containerId: string,
    onResumeSelect: (resumeId: string) => void,
    onUploadComplete: (result: object) => void
  })
  
  // Public Methods
  expand(): void
  collapse(): void
  toggle(): void
  addResume(resume: Resume): void
  setActiveResume(resumeId: string): void
  updateUserInfo(info: UserInfo): void
  
  // State Methods
  saveState(): void
  loadState(): void
  
  // Event Handlers
  private handleToggleClick(): void
  private handleResumeClick(resumeId: string): void
  private handleUpload(file: File): void
}
```

**DOM Structure**:
```html
<aside id="profileSidebar" class="profile-sidebar" data-state="expanded">
  <!-- Toggle Button -->
  <button class="sidebar-toggle" aria-label="Toggle sidebar">
    <span class="toggle-icon">◀</span>
  </button>
  
  <!-- User Info Section -->
  <section class="user-info-section">
    <div class="user-avatar" role="button" tabindex="0">
      <img src="..." alt="User avatar" />
    </div>
    <div class="user-name" contenteditable="true">用户</div>
  </section>
  
  <!-- Resume List Section -->
  <section class="resume-list-section">
    <h3 class="section-title">我的简历 (<span class="resume-count">0</span>)</h3>
    <ul class="resume-list" role="list">
      <!-- Resume items dynamically inserted -->
    </ul>
    <div class="empty-state">还没有上传简历</div>
  </section>
  
  <!-- Upload Area Section -->
  <section class="upload-area-section">
    <div class="upload-dropzone">
      <input type="file" id="sidebarFileInput" accept=".pdf,.docx" hidden />
      <div class="dropzone-content">
        <span class="upload-icon">📄</span>
        <span class="upload-text">上传新简历</span>
      </div>
    </div>
    <button class="btn-parse" disabled>开始解析</button>
    <div class="upload-progress" hidden>
      <div class="progress-bar"></div>
      <span class="progress-text">0%</span>
    </div>
  </section>
</aside>
```

### 2. ResumeItem Component

**Responsibilities**:
- Display individual resume metadata
- Handle selection state
- Provide delete action

**Interface**:
```javascript
class ResumeItem {
  constructor(resume: Resume, isActive: boolean)
  
  render(): HTMLElement
  setActive(active: boolean): void
  delete(): void
}
```

**DOM Structure**:
```html
<li class="resume-item" data-resume-id="..." data-active="true">
  <div class="resume-item-content">
    <div class="resume-icon">📄</div>
    <div class="resume-info">
      <div class="resume-name">简历文件名.pdf</div>
      <div class="resume-meta">
        <span class="upload-time">2024-01-15 14:30</span>
        <span class="file-size">1.2 MB</span>
      </div>
    </div>
    <div class="resume-actions">
      <span class="active-indicator">✓</span>
      <button class="btn-delete" aria-label="Delete resume">🗑️</button>
    </div>
  </div>
</li>
```

### 3. LayoutManager Component

**Responsibilities**:
- Coordinate sidebar and main content layout
- Handle responsive breakpoints
- Manage CSS grid adjustments

**Interface**:
```javascript
class LayoutManager {
  constructor()
  
  adjustForSidebar(state: 'expanded' | 'collapsed'): void
  handleResize(): void
  expandDiagnosisBox(): void
  collapseDiagnosisBox(): void
}
```

### 4. StorageManager Component

**Responsibilities**:
- Abstract localStorage operations
- Handle data validation and migration
- Provide error recovery

**Interface**:
```javascript
class StorageManager {
  static KEYS = {
    USER_PROFILE: 'userProfile',
    RESUMES: 'resumes',
    ACTIVE_RESUME: 'activeResumeId',
    SIDEBAR_STATE: 'sidebarState'
  }
  
  static save(key: string, data: any): boolean
  static load(key: string): any | null
  static remove(key: string): void
  static clear(): void
  static getStorageSize(): number
  static validateData(key: string, data: any): boolean
}
```

## Data Models

### UserInfo Model
```typescript
interface UserInfo {
  name: string;           // User display name
  avatar: string;         // Base64 image or URL
  createdAt: number;      // Unix timestamp
}
```

### Resume Model
```typescript
interface Resume {
  id: string;             // UUID v4
  fileName: string;       // Original file name
  uploadTime: number;     // Unix timestamp
  fileSize: number;       // Bytes
  fileType: string;       // 'pdf' | 'docx'
  parseResult: {
    parsed_data: {
      inferred_mbti: string;
      mbti_description: string;
      candidate_summary: string;
      job_recommendations: JobRecommendation[];
      resume_diagnosis: ResumeDiagnosis;
    }
  } | null;
}
```

### JobRecommendation Model
```typescript
interface JobRecommendation {
  title: string;
  industry: string;
  reason: string;
  match_score: number;    // 0-100
  missing_skills: string[];
  career_path: string;
  salary_range: {
    min_salary: number;
    max_salary: number;
    city: string;
  };
}
```

### ResumeDiagnosis Model
```typescript
interface ResumeDiagnosis {
  overall_score: number;  // 0-100
  overall_comment: string;
  typos: DiagnosisItem[];
  grammar_issues: DiagnosisItem[];
  redundancy: DiagnosisItem[];
}

interface DiagnosisItem {
  original: string;
  suggestion: string;
}
```

## Testing Strategy

This feature is primarily a UI component with localStorage integration. Property-based testing is **NOT appropriate** for the following reasons:

1. **UI Rendering**: The sidebar is a visual component with layout, styling, and animations
2. **DOM Manipulation**: Core functionality involves DOM updates and CSS transitions
3. **Browser API Integration**: Depends on localStorage, which is environment-specific
4. **User Interaction**: Behavior is driven by clicks, drags, and keyboard events
5. **Responsive Design**: Layout changes based on viewport size (not pure function behavior)

### Testing Approach

**Unit Tests** (Jest + Testing Library):
- StorageManager data validation and serialization
- Resume list sorting and filtering logic
- File size and type validation
- UUID generation and uniqueness
- Data migration between schema versions

**Integration Tests** (Playwright/Cypress):
- Sidebar expand/collapse animations
- Resume upload and list update flow
- Resume switching and result display
- localStorage persistence across page reloads
- Responsive layout at different breakpoints
- Error handling (storage quota, invalid files)

**Visual Regression Tests** (Percy/Chromatic):
- Sidebar expanded state
- Sidebar collapsed state
- Resume list with 0, 1, 5, 20 items
- Mobile overlay mode
- Error states and empty states

**Manual Testing**:
- Accessibility (keyboard navigation, screen readers)
- Cross-browser compatibility (Safari, Chrome, Firefox)
- Performance with large resume lists (50+ items)
- Animation smoothness on low-end devices

### Test Coverage Goals

- **Unit Tests**: 80%+ coverage for StorageManager and utility functions
- **Integration Tests**: Cover all user workflows (upload, switch, delete, edit)
- **Visual Tests**: Capture all UI states and responsive breakpoints
- **Accessibility**: WCAG 2.1 AA compliance (requires manual verification)

## Error Handling

### Storage Errors

**Quota Exceeded**:
```javascript
try {
  StorageManager.save('resumes', resumeList);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    showNotification({
      type: 'error',
      message: '存储空间不足，请删除一些旧简历',
      actions: [
        { label: '管理简历', onClick: () => openResumeManager() }
      ]
    });
  }
}
```

**Data Corruption**:
```javascript
const data = StorageManager.load('resumes');
if (!StorageManager.validateData('resumes', data)) {
  console.error('Corrupted resume data detected');
  StorageManager.save('resumes', []); // Reset to empty
  showNotification({
    type: 'warning',
    message: '简历数据已损坏，已重置为空'
  });
}
```

### Upload Errors

**File Size Limit**:
```javascript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function validateFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`文件大小超过限制 (${(file.size / 1024 / 1024).toFixed(1)}MB > 5MB)`);
  }
  
  const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!validTypes.includes(file.type)) {
    throw new Error('仅支持 PDF 和 DOCX 格式');
  }
}
```

**Parse Failure**:
```javascript
async function handleUpload(file) {
  const resume = {
    id: generateUUID(),
    fileName: file.name,
    uploadTime: Date.now(),
    fileSize: file.size,
    fileType: file.type,
    parseResult: null
  };
  
  // Add to list immediately (optimistic update)
  addResumeToList(resume);
  
  try {
    const result = await uploadAndParse(file);
    resume.parseResult = result;
    updateResumeInList(resume);
  } catch (error) {
    // Keep resume in list but mark as failed
    resume.parseResult = { error: error.message };
    updateResumeInList(resume);
    
    showNotification({
      type: 'error',
      message: `解析失败: ${error.message}`,
      actions: [
        { label: '重试', onClick: () => retryParse(resume.id) }
      ]
    });
  }
}
```

### Network Errors

**Timeout Handling**:
```javascript
const UPLOAD_TIMEOUT = 180000; // 3 minutes

async function uploadWithTimeout(file) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT);
  
  try {
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('上传超时，请检查网络连接');
    }
    throw error;
  }
}
```

### Edge Cases

**Active Resume Deletion**:
```javascript
function deleteResume(resumeId) {
  const resumes = StorageManager.load('resumes') || [];
  const index = resumes.findIndex(r => r.id === resumeId);
  
  if (index === -1) return;
  
  resumes.splice(index, 1);
  StorageManager.save('resumes', resumes);
  
  // If deleted resume was active, select most recent
  if (StorageManager.load('activeResumeId') === resumeId) {
    const newActive = resumes.length > 0 ? resumes[0].id : null;
    StorageManager.save('activeResumeId', newActive);
    
    if (newActive) {
      loadResumeResults(newActive);
    } else {
      clearResults();
    }
  }
}
```

**Empty Resume List**:
```javascript
function renderResumeList() {
  const resumes = StorageManager.load('resumes') || [];
  const listEl = document.querySelector('.resume-list');
  const emptyEl = document.querySelector('.empty-state');
  
  if (resumes.length === 0) {
    listEl.hidden = true;
    emptyEl.hidden = false;
    emptyEl.textContent = '还没有上传简历';
  } else {
    listEl.hidden = false;
    emptyEl.hidden = true;
    listEl.innerHTML = resumes.map(r => renderResumeItem(r)).join('');
  }
  
  document.querySelector('.resume-count').textContent = resumes.length;
}
```

## Performance Considerations

### Animation Performance

**Use CSS Transforms** (GPU-accelerated):
```css
.profile-sidebar {
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}

.profile-sidebar[data-state="collapsed"] {
  transform: translateX(calc(-100% + 60px));
}
```

**Avoid Layout Thrashing**:
```javascript
// Bad: Multiple reads and writes
function badResize() {
  sidebar.style.width = '20%';
  const width = sidebar.offsetWidth; // Forces reflow
  mainContent.style.marginLeft = width + 'px'; // Forces another reflow
}

// Good: Batch reads, then batch writes
function goodResize() {
  const sidebarWidth = sidebar.offsetWidth; // Read
  requestAnimationFrame(() => {
    sidebar.style.width = '20%'; // Write
    mainContent.style.marginLeft = sidebarWidth + 'px'; // Write
  });
}
```

### localStorage Optimization

**Lazy Loading**:
```javascript
// Don't load all parse results on init
function loadResumeList() {
  const resumes = StorageManager.load('resumes') || [];
  
  // Only load metadata, not full parse results
  return resumes.map(r => ({
    id: r.id,
    fileName: r.fileName,
    uploadTime: r.uploadTime,
    fileSize: r.fileSize,
    hasResult: !!r.parseResult
  }));
}

// Load full result only when selected
function loadResumeResult(resumeId) {
  const resumes = StorageManager.load('resumes') || [];
  const resume = resumes.find(r => r.id === resumeId);
  return resume?.parseResult || null;
}
```

**Debounced Saves**:
```javascript
const debouncedSave = debounce((key, data) => {
  StorageManager.save(key, data);
}, 500);

function updateUserName(name) {
  const userInfo = StorageManager.load('userProfile') || {};
  userInfo.name = name;
  debouncedSave('userProfile', userInfo);
}
```

### Memory Management

**Limit Resume List Size**:
```javascript
const MAX_RESUMES = 50;

function addResume(resume) {
  const resumes = StorageManager.load('resumes') || [];
  
  if (resumes.length >= MAX_RESUMES) {
    // Remove oldest resume
    resumes.sort((a, b) => b.uploadTime - a.uploadTime);
    resumes.pop();
    
    showNotification({
      type: 'info',
      message: `已达到简历数量上限 (${MAX_RESUMES})，已删除最旧的简历`
    });
  }
  
  resumes.unshift(resume);
  StorageManager.save('resumes', resumes);
}
```

## Accessibility

### Keyboard Navigation

**Tab Order**:
1. Toggle button
2. User avatar (editable)
3. User name (editable)
4. Resume list items (focusable)
5. Upload dropzone
6. Parse button

**Keyboard Shortcuts**:
- `Tab`: Navigate forward
- `Shift+Tab`: Navigate backward
- `Enter/Space`: Activate focused element
- `Escape`: Close sidebar (mobile), cancel edit
- `Arrow Up/Down`: Navigate resume list

### ARIA Labels

```html
<aside 
  id="profileSidebar" 
  class="profile-sidebar"
  role="complementary"
  aria-label="User profile and resume management"
  aria-expanded="true"
>
  <button 
    class="sidebar-toggle"
    aria-label="Toggle sidebar"
    aria-controls="profileSidebar"
    aria-expanded="true"
  >
    <span class="toggle-icon" aria-hidden="true">◀</span>
  </button>
  
  <section class="resume-list-section" aria-labelledby="resumeListTitle">
    <h3 id="resumeListTitle" class="section-title">
      我的简历 (<span class="resume-count" aria-live="polite">0</span>)
    </h3>
    <ul class="resume-list" role="list">
      <li 
        class="resume-item"
        role="listitem"
        tabindex="0"
        aria-selected="true"
        aria-label="简历文件名.pdf, 上传于 2024年1月15日"
      >
        <!-- Resume item content -->
      </li>
    </ul>
  </section>
</aside>
```

### Screen Reader Support

**Live Regions**:
```html
<div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
  <!-- Announce state changes -->
</div>

<script>
function announceToScreenReader(message) {
  const liveRegion = document.querySelector('[role="status"]');
  liveRegion.textContent = message;
  setTimeout(() => liveRegion.textContent = '', 1000);
}

// Usage
sidebar.addEventListener('toggle', (e) => {
  const state = e.detail.expanded ? '已展开' : '已收起';
  announceToScreenReader(`侧边栏${state}`);
});
</script>
```

## Security Considerations

### Input Sanitization

**User Name**:
```javascript
function sanitizeUserName(name) {
  // Remove HTML tags
  const stripped = name.replace(/<[^>]*>/g, '');
  
  // Limit length
  const maxLength = 50;
  const truncated = stripped.slice(0, maxLength);
  
  // Trim whitespace
  return truncated.trim();
}
```

**File Upload**:
```javascript
function validateUpload(file) {
  // Check file extension
  const allowedExtensions = ['.pdf', '.docx'];
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext || !allowedExtensions.includes(ext)) {
    throw new Error('Invalid file type');
  }
  
  // Check MIME type
  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (!allowedMimes.includes(file.type)) {
    throw new Error('Invalid MIME type');
  }
  
  // Check file size
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
  
  return true;
}
```

### XSS Prevention

**Escape User Content**:
```javascript
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderResumeName(name) {
  return `<div class="resume-name">${escapeHtml(name)}</div>`;
}
```

### localStorage Security

**Data Validation**:
```javascript
function validateResumeData(data) {
  if (!data || typeof data !== 'object') return false;
  if (!data.id || typeof data.id !== 'string') return false;
  if (!data.fileName || typeof data.fileName !== 'string') return false;
  if (!data.uploadTime || typeof data.uploadTime !== 'number') return false;
  
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(data.id)) return false;
  
  return true;
}
```

## Migration and Versioning

### Schema Versioning

```javascript
const CURRENT_VERSION = '1.0';

function migrateData() {
  const version = StorageManager.load('version');
  
  if (!version) {
    // First time user, no migration needed
    StorageManager.save('version', CURRENT_VERSION);
    return;
  }
  
  if (version === '1.0') {
    // Already on current version
    return;
  }
  
  // Future migrations
  // if (version === '0.9') {
  //   migrateFrom0_9To1_0();
  // }
}

function migrateFrom0_9To1_0() {
  // Example migration
  const resumes = StorageManager.load('resumes') || [];
  
  const migratedResumes = resumes.map(resume => ({
    ...resume,
    fileType: resume.fileName.endsWith('.pdf') ? 'pdf' : 'docx'
  }));
  
  StorageManager.save('resumes', migratedResumes);
  StorageManager.save('version', '1.0');
}
```

## Implementation Phases

### Phase 1: Core Structure (Week 1)
- [ ] Create ProfileSidebar HTML structure
- [ ] Implement basic CSS styling (樱花粉 theme)
- [ ] Add expand/collapse toggle functionality
- [ ] Implement StorageManager utility
- [ ] Add localStorage persistence for sidebar state

### Phase 2: User Info & Resume List (Week 1-2)
- [ ] Implement user info section (avatar, name editing)
- [ ] Create ResumeItem component
- [ ] Implement resume list rendering
- [ ] Add resume selection functionality
- [ ] Implement active resume indicator

### Phase 3: Upload Integration (Week 2)
- [ ] Move upload functionality to sidebar
- [ ] Implement file validation
- [ ] Add progress indicator
- [ ] Integrate with existing parse API
- [ ] Update resume list on successful upload

### Phase 4: Layout Adjustments (Week 2-3)
- [ ] Implement LayoutManager
- [ ] Adjust diagnosis box expansion
- [ ] Handle responsive breakpoints
- [ ] Add mobile overlay mode
- [ ] Test layout on different screen sizes

### Phase 5: Polish & Testing (Week 3)
- [ ] Add animations and transitions
- [ ] Implement error handling
- [ ] Add accessibility features
- [ ] Write unit and integration tests
- [ ] Perform cross-browser testing
- [ ] Conduct user acceptance testing

## Dependencies

### External Libraries
- None (vanilla JavaScript implementation)

### Browser APIs
- `localStorage`: Data persistence
- `FileReader`: Avatar image upload
- `fetch`: Resume upload and parsing
- `crypto.randomUUID()`: Generate resume IDs (fallback for older browsers)

### Existing Code Integration
- Reuse樱花粉 CSS variables from existing stylesheet
- Integrate with existing upload/parse workflow
- Maintain compatibility with existing result rendering

## Browser Compatibility

### Target Browsers
- Chrome/Edge 90+ (95% users)
- Safari 14+ (Mac users)
- Firefox 88+
- Mobile Safari 14+ (iOS)
- Chrome Mobile 90+ (Android)

### Polyfills Needed
```javascript
// UUID polyfill for older browsers
if (!crypto.randomUUID) {
  crypto.randomUUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}
```

## Monitoring and Analytics

### Key Metrics
- Sidebar toggle rate (expand/collapse frequency)
- Resume upload success rate
- Resume switch frequency
- Average number of resumes per user
- localStorage quota usage
- Error rates (upload, parse, storage)

### Event Tracking
```javascript
// Track user interactions
function trackEvent(category, action, label) {
  if (window.gtag) {
    gtag('event', action, {
      event_category: category,
      event_label: label
    });
  }
}

// Usage examples
trackEvent('Sidebar', 'toggle', 'expanded');
trackEvent('Resume', 'upload', 'success');
trackEvent('Resume', 'switch', resumeId);
```

## Future Enhancements

### Phase 2 Features (Post-MVP)
1. **Resume Export**: Download resume as PDF/DOCX
2. **Resume Comparison**: Side-by-side comparison of multiple resumes
3. **Resume Templates**: Pre-built templates for different industries
4. **Cloud Sync**: Optional backend sync for cross-device access
5. **Resume Sharing**: Generate shareable links
6. **Advanced Search**: Filter and search within resume list
7. **Bulk Operations**: Delete multiple resumes at once
8. **Resume Versioning**: Track changes over time

### Technical Debt
- Consider migrating to React/Vue for better state management
- Implement virtual scrolling for large resume lists (100+ items)
- Add service worker for offline support
- Optimize localStorage with IndexedDB for larger datasets

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-15  
**Author**: AI Design Agent  
**Status**: Ready for Review
