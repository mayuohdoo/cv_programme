# Design Document

## Architecture Overview

The resume parser integration follows a modular architecture embedded within the existing website. The system consists of:

1. **UI Layer**: Modal-based interface with tabs for upload and manual entry
2. **Parser Layer**: Text extraction and AI/regex parsing logic
3. **Storage Layer**: localStorage-based persistence
4. **Library Layer**: Local pdf.js and mammoth.js for file processing

The implementation adapts the Chrome extension's parsing logic to work in a web context by removing Chrome APIs and using standard web APIs.

## Component Design

### 1. Parser Button Component

**Location**: Bottom of `.upload-area-section` in sidebar

**HTML Structure**:
```html
<button id="openParserBtn" class="parser-trigger-btn">
  📄 智能简历解析
</button>
```

**Styling**:
- Background: Sakura pink gradient (#FFB7C5 to #FF9DB3)
- Border radius: 12px
- Hover: scale(1.02) + shadow enhancement
- Full width with padding: 12px 24px

**Behavior**:
- Click → Open parser modal
- Hover → Visual feedback (scale + shadow)

### 2. Parser Modal Component

**HTML Structure**:
```html
<div id="parserModalOverlay" class="parser-modal-overlay">
  <div class="parser-modal">
    <div class="parser-modal-header">
      <h2>智能简历解析</h2>
      <button class="parser-close-btn">×</button>
    </div>
    <div class="parser-tabs">
      <button class="parser-tab active" data-tab="upload">上传简历</button>
      <button class="parser-tab" data-tab="manual">手动填写</button>
    </div>
    <div class="parser-content">
      <!-- Tab content here -->
    </div>
  </div>
</div>
```

**Styling**:
- Overlay: rgba(0,0,0,0.5) backdrop
- Modal: white background, 600px max-width, centered
- Border radius: 16px
- Box shadow: 0 10px 40px rgba(0,0,0,0.15)
- Z-index: 10000

**Behavior**:
- Click overlay → Close modal
- Click close button → Close modal
- ESC key → Close modal
- Tab switching → Show/hide content sections

### 3. Upload Tab Component

**HTML Structure**:
```html
<div id="uploadTab" class="parser-tab-content active">
  <div class="parser-upload-section">
    <input type="file" id="resumeFileInput" accept=".pdf,.docx,.txt" />
    <label for="resumeFileInput" class="parser-upload-label">
      <div class="parser-upload-icon">📄</div>
      <div class="parser-upload-text">点击或拖拽上传简历</div>
      <div class="parser-upload-hint">支持 PDF、DOCX、TXT 格式</div>
    </label>
    <div id="fileInfo" class="parser-file-info" style="display:none;"></div>
  </div>
  
  <div class="parser-settings-section">
    <button id="openSettingsBtn" class="parser-settings-btn">
      ⚙️ API 设置
    </button>
  </div>
  
  <div id="parsingStatus" class="parser-status" style="display:none;">
    <div class="parser-spinner"></div>
    <span>正在解析简历...</span>
  </div>
  
  <div id="previewSection" class="parser-preview" style="display:none;">
    <!-- Preview content populated by JS -->
  </div>
  
  <div class="parser-actions">
    <button id="parseBtn" class="parser-btn-primary" disabled>开始解析</button>
    <button id="editBtn" class="parser-btn-secondary" style="display:none;">编辑</button>
  </div>
</div>
```

**Behavior**:
- File selection → Display file info, enable parse button
- Drag over → Visual feedback (border color change)
- Drop file → Accept file, display info
- Parse button click → Extract text → Parse → Show preview
- Edit button click → Switch to manual tab with pre-filled data

### 4. Manual Entry Tab Component

**HTML Structure**:
```html
<div id="manualTab" class="parser-tab-content">
  <form id="manualEntryForm" class="parser-form">
    <div class="parser-form-group">
      <label>姓名 *</label>
      <input type="text" name="name" required />
    </div>
    <div class="parser-form-group">
      <label>邮箱 *</label>
      <input type="email" name="email" required />
    </div>
    <div class="parser-form-group">
      <label>电话 *</label>
      <input type="tel" name="phone" required />
    </div>
    <div class="parser-form-group">
      <label>学校</label>
      <input type="text" name="education" />
    </div>
    <div class="parser-form-group">
      <label>专业</label>
      <input type="text" name="major" />
    </div>
    <div class="parser-form-group">
      <label>学历</label>
      <select name="degree">
        <option value="">请选择</option>
        <option value="高中">高中</option>
        <option value="大专">大专</option>
        <option value="本科">本科</option>
        <option value="硕士">硕士</option>
        <option value="博士">博士</option>
      </select>
    </div>
    <div class="parser-form-group">
      <label>毕业时间</label>
      <input type="text" name="graduationDate" placeholder="例如：2027.6" />
    </div>
    <div class="parser-form-group">
      <label>工作经历</label>
      <textarea name="workExperience" rows="4"></textarea>
    </div>
    <div class="parser-form-group">
      <label>技能</label>
      <textarea name="skills" rows="3"></textarea>
    </div>
    <div class="parser-form-group">
      <label>自我介绍</label>
      <textarea name="introduction" rows="4"></textarea>
    </div>
    <button type="submit" class="parser-btn-primary">保存简历</button>
  </form>
</div>
```

**Behavior**:
- Form load → Pre-fill with localStorage data if exists
- Form submit → Validate required fields → Save to localStorage → Show success message
- Validation error → Show error message below form

### 5. Settings Modal Component

**HTML Structure**:
```html
<div id="settingsModalOverlay" class="parser-modal-overlay">
  <div class="parser-modal parser-settings-modal">
    <div class="parser-modal-header">
      <h2>API 设置</h2>
      <button class="parser-close-btn">×</button>
    </div>
    <div class="parser-settings-content">
      <div class="parser-form-group">
        <label>DeepSeek API Key</label>
        <input type="password" id="apiKeyInput" placeholder="sk-..." />
        <div class="parser-hint">
          💡 配置 API Key 可获得更准确的解析结果<br>
          获取地址: <a href="https://platform.deepseek.com" target="_blank">platform.deepseek.com</a>
        </div>
      </div>
      <div class="parser-settings-actions">
        <button id="testConnectionBtn" class="parser-btn-secondary">测试连接</button>
        <button id="saveSettingsBtn" class="parser-btn-primary">保存设置</button>
      </div>
      <div id="settingsStatus" class="parser-status-message"></div>
    </div>
  </div>
</div>
```

**Behavior**:
- Modal open → Load API key from localStorage
- Save button → Validate format (starts with "sk-") → Save to localStorage
- Test button → Make test API call → Show success/error message

## Data Flow

### Upload and Parse Flow

```
1. User selects file
   ↓
2. Display file info, enable parse button
   ↓
3. User clicks "开始解析"
   ↓
4. Show loading spinner
   ↓
5. Extract text based on file type:
   - PDF: Use pdf.js → getDocument → getPage → getTextContent
   - DOCX: Use mammoth.js → extractRawText
   - TXT: Use FileReader → readAsText
   ↓
6. Check if API key exists in localStorage
   ↓
7a. If API key exists:
    - Call DeepSeek API with structured prompt
    - Parse JSON response
    - If API fails → Fall back to regex
   ↓
7b. If no API key:
    - Use regex parsing directly
    - Show hint about API configuration
   ↓
8. Validate parsed data (check required fields)
   ↓
9. Save to localStorage (key: "resume")
   ↓
10. Display preview with parsed data
    ↓
11. Show edit button
```

### Manual Entry Flow

```
1. User switches to "手动填写" tab
   ↓
2. Load existing data from localStorage
   ↓
3. Pre-fill form fields
   ↓
4. User edits/enters data
   ↓
5. User submits form
   ↓
6. Validate required fields (name, email, phone)
   ↓
7. If validation fails → Show error message
   ↓
8. If validation passes:
   - Save to localStorage (key: "resume")
   - Show success message
   - Close modal after 1.5s
```

## Parsing Logic Design

### Text Extraction

**PDF Extraction**:
```javascript
async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}
```

**DOCX Extraction**:
```javascript
async function extractDocxText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
```

**TXT Reading**:
```javascript
async function readTxtFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}
```

### AI Parsing (DeepSeek)

**API Configuration**:
- Endpoint: https://api.deepseek.com/v1/chat/completions
- Model: deepseek-chat
- Temperature: 0.1 (for consistent results)
- Max tokens: 2000

**Prompt Structure**:
```javascript
const prompt = `请从以下简历文本中提取信息，以JSON格式返回：

简历文本：
${resumeText}

请提取以下字段：
- name: 姓名
- email: 邮箱
- phone: 电话
- education: 学校
- major: 专业
- degree: 学历（高中/大专/本科/硕士/博士）
- graduationDate: 毕业时间
- workExperiences: 工作经历数组，每项包含 {company, position, period, description}
- workExperience: 工作经历文本（合并版本）
- skills: 技能文本（合并版本）
- skillsDetailed: 技能分类对象，格式 {类别名: 技能描述}
- introduction: 自我介绍

只返回JSON，不要其他文字。`;
```

**Response Parsing**:
```javascript
async function parseWithAI(text, apiKey) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 2000
    })
  });
  
  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Extract JSON from response (may be wrapped in markdown code blocks)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  throw new Error('Failed to parse AI response');
}
```

### Regex Fallback Parsing

**Field Extraction Patterns**:
```javascript
function parseWithRegex(text) {
  const data = {
    name: '',
    email: '',
    phone: '',
    education: '',
    major: '',
    degree: '',
    graduationDate: '',
    workExperience: '',
    workExperiences: [],
    skills: '',
    skillsDetailed: {},
    introduction: ''
  };
  
  // Email: standard email pattern
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) data.email = emailMatch[0];
  
  // Phone: Chinese phone patterns
  const phoneMatch = text.match(/1[3-9]\d{9}|(\d{3,4}[-\s]?)?\d{7,8}/);
  if (phoneMatch) data.phone = phoneMatch[0];
  
  // Name: first line or after "姓名"
  const nameMatch = text.match(/(?:姓名[：:]\s*)?([^\n]{2,4})/);
  if (nameMatch) data.name = nameMatch[1].trim();
  
  // Education: school name + major + dates
  const eduMatch = text.match(/([^，,\n]+(?:大学|学院|高中))[^\n]*?([^，,\n]+专业)?[^\n]*?(20\d{2}\.\d{1,2}[-~至]\s*20\d{2}\.\d{1,2})/);
  if (eduMatch) {
    data.education = eduMatch[1];
    if (eduMatch[2]) data.major = eduMatch[2].replace('专业', '');
    data.graduationDate = eduMatch[3].split(/[-~至]/)[1];
  }
  
  // Degree: extract from education section
  const degreeMatch = text.match(/(博士|硕士|本科|大专|高中)/);
  if (degreeMatch) data.degree = degreeMatch[1];
  
  // Work experience: section-based extraction
  const workMatch = text.match(/(?:工作经历|实习经历)[：:\s]*\n([\s\S]*?)(?=\n\n|技能|自我介绍|$)/);
  if (workMatch) {
    data.workExperience = workMatch[1].trim();
    // Try to parse multiple experiences
    const expBlocks = data.workExperience.split(/\n(?=[^\n]*(?:公司|有限公司|科技))/);
    data.workExperiences = expBlocks.map(block => {
      const companyMatch = block.match(/([^\n]+(?:公司|有限公司|科技))/);
      const positionMatch = block.match(/(?:职位|岗位)[：:]\s*([^\n]+)/);
      const periodMatch = block.match(/(20\d{2}\.\d{1,2}\s*[-~至]\s*(?:20\d{2}\.\d{1,2}|至今|现在))/);
      return {
        company: companyMatch ? companyMatch[1] : '',
        position: positionMatch ? positionMatch[1] : '',
        period: periodMatch ? periodMatch[1] : '',
        description: block
      };
    }).filter(exp => exp.company);
  }
  
  // Skills: section-based extraction with categories
  const skillsMatch = text.match(/(?:技能|专业技能)[：:\s]*\n([\s\S]*?)(?=\n\n|自我介绍|工作经历|$)/);
  if (skillsMatch) {
    data.skills = skillsMatch[1].trim();
    // Parse categories
    const categoryMatches = data.skills.matchAll(/([^：:\n]+)[：:]\s*([^\n]+)/g);
    for (const match of categoryMatches) {
      data.skillsDetailed[match[1].trim()] = match[2].trim();
    }
  }
  
  // Introduction: section-based extraction
  const introMatch = text.match(/(?:自我介绍|个人简介)[：:\s]*\n([\s\S]*?)(?=\n\n|$)/);
  if (introMatch) data.introduction = introMatch[1].trim();
  
  return data;
}
```

## Storage Schema

### localStorage Keys

**resume** (main data):
```json
{
  "name": "张三",
  "email": "zhangsan@example.com",
  "phone": "13800138000",
  "education": "深圳大学",
  "major": "金融科技",
  "degree": "本科",
  "graduationDate": "2027.6",
  "workExperience": "腾讯科技有限公司\n职位：前端开发实习生\n时间：2023.6-2023.9\n...",
  "workExperiences": [
    {
      "company": "腾讯科技有限公司",
      "position": "前端开发实习生",
      "period": "2023.6-2023.9",
      "description": "负责..."
    }
  ],
  "skills": "语言: 英语 CET-6\n编程技能: JavaScript, Python, React",
  "skillsDetailed": {
    "语言": "英语 CET-6",
    "编程技能": "JavaScript, Python, React"
  },
  "introduction": "我是一名..."
}
```

**deepseekApiKey**:
```
"sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## Library Integration

### pdf.js Configuration

**Files Required**:
- `docs/libs/pdf.min.js` (core library)
- `docs/libs/pdf.worker.min.js` (web worker)

**Initialization**:
```javascript
// Set worker path to local file
pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/pdf.worker.min.js';
```

**Loading Strategy**:
- Load pdf.js when modal opens (not on page load)
- Use dynamic script loading to avoid blocking initial page load

### mammoth.js Configuration

**Files Required**:
- `docs/libs/mammoth.browser.min.js`

**Loading Strategy**:
- Load mammoth.js when modal opens
- Use dynamic script loading

## Error Handling Strategy

### Error Types and Responses

1. **File Upload Errors**:
   - Unsupported format → "不支持的文件格式，请上传 PDF、DOCX 或 TXT 文件"
   - File too large → "文件过大，请上传小于 10MB 的文件"
   - Read error → "文件读取失败，请重试"

2. **Text Extraction Errors**:
   - PDF extraction failure → "PDF 文件解析失败：[error]"
   - DOCX extraction failure → "DOCX 文件解析失败，请尝试将内容复制到 TXT 文件"
   - TXT read failure → "文件读取失败"

3. **API Errors**:
   - Network error → "网络请求失败，请检查网络连接" + fall back to regex
   - Invalid API key → "API Key 无效，请检查设置" + fall back to regex
   - Rate limit → "API 请求过于频繁，请稍后重试" + fall back to regex
   - Timeout → "请求超时，请重试" + fall back to regex

4. **Validation Errors**:
   - Missing required fields → "请填写所有必填字段（姓名、邮箱、电话）"
   - Invalid email format → "邮箱格式不正确"
   - Invalid phone format → "电话格式不正确"

5. **Storage Errors**:
   - localStorage unavailable → "浏览器存储不可用，请检查浏览器设置"
   - Storage quota exceeded → "存储空间不足，请清理浏览器数据"

### Error Display

**Toast Notifications**:
```javascript
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `parser-toast parser-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
```

**Inline Error Messages**:
- Display below form fields for validation errors
- Display in status section for parsing errors
- Use red color (#FF4444) for errors
- Use orange color (#FFA500) for warnings
- Use green color (#4CAF50) for success

## UI/UX Design Details

### Color Palette

- **Primary**: #FFB7C5 (sakura pink)
- **Primary Light**: #FFE4E9
- **Primary Lighter**: #FFF5F7
- **Primary Dark**: #FF9DB3
- **Text Primary**: #333333
- **Text Secondary**: #666666
- **Text Hint**: #999999
- **Border**: #E0E0E0
- **Success**: #4CAF50
- **Warning**: #FFA500
- **Error**: #FF4444
- **Background**: #FFFFFF
- **Overlay**: rgba(0, 0, 0, 0.5)

### Typography

- **Font Family**: 'Inter', -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif
- **Heading**: 20px, 600 weight
- **Body**: 14px, 400 weight
- **Small**: 12px, 400 weight
- **Button**: 14px, 500 weight

### Spacing

- **XS**: 4px
- **SM**: 8px
- **MD**: 16px
- **LG**: 24px
- **XL**: 32px

### Border Radius

- **Small**: 8px (inputs, small buttons)
- **Medium**: 12px (buttons, cards)
- **Large**: 16px (modal, large containers)

### Shadows

- **Small**: 0 2px 8px rgba(0, 0, 0, 0.1)
- **Medium**: 0 4px 16px rgba(0, 0, 0, 0.12)
- **Large**: 0 10px 40px rgba(0, 0, 0, 0.15)

### Transitions

- **Fast**: 0.15s cubic-bezier(0.4, 0, 0.2, 1)
- **Normal**: 0.3s cubic-bezier(0.4, 0, 0.2, 1)
- **Slow**: 0.5s cubic-bezier(0.4, 0, 0.2, 1)

### Animations

**Modal Open**:
```css
@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

**Spinner**:
```css
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

**Toast Slide In**:
```css
@keyframes toastSlideIn {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

## Performance Considerations

### Lazy Loading

- Load pdf.js and mammoth.js only when modal opens
- Use dynamic script loading with promises
- Cache loaded libraries in memory

### File Size Limits

- Maximum file size: 10MB
- Show warning for files > 5MB
- Reject files > 10MB with error message

### API Optimization

- Set reasonable timeout (30 seconds)
- Implement retry logic with exponential backoff
- Cache API responses for identical text (optional)

### DOM Optimization

- Use event delegation for dynamic elements
- Minimize reflows by batching DOM updates
- Use CSS transforms for animations (GPU acceleration)

## Browser Compatibility

### Target Browsers

- Safari 14+ (primary)
- Chrome 90+
- Firefox 88+
- Edge 90+

### Polyfills Not Required

- FileReader API (supported in all target browsers)
- Fetch API (supported in all target browsers)
- Promises (supported in all target browsers)
- localStorage (supported in all target browsers)

### Safari-Specific Considerations

- Test file upload with various file types
- Verify localStorage persistence
- Check CSS compatibility (especially backdrop-filter if used)
- Test modal animations and transitions

## Security Considerations

### API Key Storage

- Store in localStorage (not sessionStorage for persistence)
- Mask input field as password type
- Never log API key to console
- Clear API key on logout (if auth is added later)

### File Upload Security

- Validate file type by extension and MIME type
- Limit file size to prevent memory issues
- Sanitize extracted text before display
- Don't execute any code from uploaded files

### XSS Prevention

- Escape user input before displaying in preview
- Use textContent instead of innerHTML where possible
- Sanitize HTML if innerHTML is necessary

### CORS Considerations

- DeepSeek API should support CORS
- If CORS issues occur, consider proxy server (future enhancement)

## Testing Strategy

### Manual Testing Checklist

1. **File Upload**:
   - [ ] Upload PDF file
   - [ ] Upload DOCX file
   - [ ] Upload TXT file
   - [ ] Try unsupported file type
   - [ ] Try file > 10MB
   - [ ] Drag and drop file

2. **Parsing**:
   - [ ] Parse with AI (valid API key)
   - [ ] Parse with regex (no API key)
   - [ ] Parse resume with multiple work experiences
   - [ ] Parse resume with categorized skills
   - [ ] Parse resume with Chinese characters
   - [ ] Parse resume with special date formats

3. **Preview**:
   - [ ] Verify all fields displayed correctly
   - [ ] Check missing fields show "未提取"
   - [ ] Verify multiple work experiences show as cards
   - [ ] Verify categorized skills display correctly

4. **Manual Entry**:
   - [ ] Fill form and submit
   - [ ] Submit with missing required fields
   - [ ] Edit existing data
   - [ ] Verify data persists after modal close

5. **Settings**:
   - [ ] Save API key
   - [ ] Test connection with valid key
   - [ ] Test connection with invalid key
   - [ ] Verify API key persists after page reload

6. **UI/UX**:
   - [ ] Modal opens and closes correctly
   - [ ] Tab switching works
   - [ ] Hover effects work
   - [ ] Loading states display correctly
   - [ ] Error messages display correctly
   - [ ] Success messages display correctly
   - [ ] Responsive layout (if applicable)

7. **Browser Compatibility**:
   - [ ] Test in Safari
   - [ ] Test in Chrome
   - [ ] Verify localStorage works
   - [ ] Verify file upload works
   - [ ] Verify animations work

### Edge Cases

- Empty resume file
- Resume with no contact information
- Resume with unusual formatting
- Very long resume (> 10 pages)
- Resume with only images (no text)
- Network timeout during API call
- localStorage disabled
- Multiple rapid parse attempts

## Implementation Notes

### Code Organization

All code will be added to `docs/index.html` in the following sections:

1. **CSS** (in `<style>` tag):
   - Parser button styles
   - Modal overlay and container styles
   - Tab styles
   - Form styles
   - Preview styles
   - Settings modal styles
   - Toast notification styles
   - Animation keyframes

2. **HTML** (before `</body>`):
   - Parser modal structure
   - Settings modal structure

3. **JavaScript** (in `<script>` tag):
   - Library loading functions
   - File upload handlers
   - Text extraction functions
   - AI parsing function
   - Regex parsing function
   - Preview rendering function
   - Form handling
   - Settings management
   - localStorage utilities
   - Error handling utilities
   - Toast notification function

### Adaptation from Chrome Extension

**Changes Required**:
1. Remove `chrome.storage.local` → Use `localStorage`
2. Remove `chrome.runtime.getURL()` → Use relative paths
3. Remove manifest permissions references
4. Keep all parsing logic intact
5. Keep UI structure similar but adapt to modal format
6. Keep error handling patterns

### Integration Points

**Existing Website Integration**:
1. Add parser button to `.upload-area-section`
2. Ensure modal z-index is higher than sidebar
3. Match color scheme with existing theme
4. Ensure no conflicts with existing JavaScript
5. Test that existing functionality still works

## Future Enhancements (Out of Scope)

- Multi-language support (English resumes)
- Resume templates for export
- Batch upload multiple resumes
- Resume comparison feature
- Integration with job application forms
- Cloud storage sync
- Resume version history
- PDF generation from parsed data
- Resume scoring/analysis
- Integration with LinkedIn import
