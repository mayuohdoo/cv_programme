# Implementation Tasks

## Tasks

- [ ] 1. Add Parser Button to Sidebar
  - Add the "智能简历解析" button at the bottom of the sidebar upload area section
  - Locate the `.upload-area-section` in the sidebar
  - Add button HTML before the closing tag of the section
  - Add CSS styles for the button with sakura pink theme
  - Add hover effects (scale + shadow)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Create Modal HTML Structure
  - Add the parser modal and settings modal HTML structures to the page
  - Add parser modal overlay and container before `</body>`
  - Add modal header with title and close button
  - Add tab navigation (上传简历, 手动填写)
  - Add upload tab content section
  - Add manual entry tab content section
  - Add settings modal structure
  - Add CSS styles for all modal components
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7, 2.8, 12.1_

- [ ] 3. Implement Modal Open/Close Logic
Add JavaScript to handle opening and closing the parser modal.

**Files to modify:**
- `docs/index.html`

**Implementation:**
1. Add event listener to parser button to open modal
2. Add event listener to close button to close modal
3. Add event listener to overlay to close modal on outside click
4. Add ESC key listener to close modal
5. Add modal open/close animations
6. Prevent body scroll when modal is open

**Acceptance criteria:**
- Clicking parser button opens modal
- Clicking close button closes modal
- Clicking overlay closes modal
- ESC key closes modal
- Modal has fade-in animation when opening
- Body scroll is prevented when modal is open

## Task 4: Implement Tab Switching
Add JavaScript to handle switching between upload and manual entry tabs.

**Files to modify:**
- `docs/index.html`

**Implementation:**
1. Add event listeners to tab buttons
2. Implement tab switching logic (show/hide content)
3. Update active tab styling
4. Add smooth transition between tabs

**Acceptance criteria:**
- Clicking tab buttons switches content
- Active tab has highlighted styling
- Inactive tab content is hidden
- Tab switching has smooth transition

## Task 5: Implement Library Loading
Add JavaScript to dynamically load pdf.js and mammoth.js when modal opens.

**Files to modify:**
- `docs/index.html`

**Implementation:**
1. Create function to load script dynamically
2. Load pdf.min.js when modal opens
3. Load mammoth.browser.min.js when modal opens
4. Configure pdf.js worker path to local file
5. Handle loading errors
6. Cache loaded state to avoid reloading

**Acceptance criteria:**
- Libraries load when modal opens (not on page load)
- pdf.js worker path is configured correctly
- Loading errors are handled gracefully
- Libraries are not reloaded if already loaded

## Task 6: Implement File Upload Handling
Add JavaScript to handle file selection and drag-and-drop.

**Files to modify:**
- `docs/index.html`

**Implementation:**
1. Add event listener to file input change
2. Add drag-and-drop event listeners (dragover, dragleave, drop)
3. Validate file type (PDF, DOCX, TXT only)
4. Validate file size (max 10MB)
5. Display file info (name, size) after selection
6. Enable parse button when valid file is selected
7. Add visual feedback for drag-over state

**Acceptance criteria:**
- File input accepts PDF, DOCX, TXT files
- Drag-and-drop works for file upload
- Invalid file types show error message
- Files > 10MB show error message
- File info displays after selection
- Parse button is enabled only when valid file is selected
- Drag-over shows visual feedback

## Task 7: Implement PDF Text Extraction
Add JavaScript function to extract text from PDF files using pdf.js.

**Files to modify:**
- `docs/index.html`

**Implementation:**
1. Create async function `extractPdfText(file)`
2. Convert file to ArrayBuffer
3. Use pdfjsLib.getDocument() to load PDF
4. Loop through all pages
5. Extract text from each page using getTextContent()
6. Concatenate text from all pages
7. Handle errors and display error messages

**Acceptance criteria:**
- Function extracts text from all PDF pages
- Text from multiple pages is concatenated with newlines
- Chinese characters are handled correctly
- Errors show message "PDF 文件解析失败：[error]"
- Function returns extracted text string

## Task 8: Implement DOCX Text Extraction
Add JavaScript function to extract text from DOCX files using mammoth.js.

**Files to modify:**
- `docs/index.html`

**Implementation:**
1. Create async function `extractDocxText(file)`
2. Convert file to ArrayBuffer
3. Use mammoth.extractRawText() to extract text
4. Return extracted text
5. Handle errors and display error messages

**Acceptance criteria:**
- Function extracts text from DOCX files
- Chinese characters are handled correctly
- Errors show message "DOCX 文件解析失败，请尝试将内容复制到 TXT 文件"
- Function returns extracted text string

## Task 9: Implement TXT File Reading
Add JavaScript function to read plain text files.

**Files to modify:**
- `docs/index.html`

**Implementation:**
1. Create async function `readTxtFile(file)`
2. Use FileReader to read file as text
3. Use UTF-8 encoding
4. Return file content
5. Handle errors and display error messages

**Acceptance criteria:**
- Function reads TXT files correctly
- UTF-8 encoding is used
- Chinese characters are handled correctly
- Errors show message "文件读取失败"
- Function returns file content string

## Task 10: Implement Regex Fallback Parsing
Add JavaScript function to parse resume text using regex patterns.

**Files to modify:**
- `docs/index.html`

**Implementation:**
1. Create function `parseWithRegex(text)`
2. Extract email using regex pattern
3. Extract phone using regex pattern (Chinese formats)
4. Extract name from first line or after "姓名"
5. Extract education (school, major, degree, graduation date)
6. Extract work experience section
7. Parse multiple work experiences into array
8. Extract skills section
9. Parse categorized skills into object
10. Extract introduction section
11. Return data object matching AI parsing structure

**Acceptance criteria:**
- Function extracts email addresses correctly
- Function extracts Chinese phone numbers correctly
- Function extracts name correctly
- Function extracts education info (school, major, degree, date)
- Function extracts work experience and parses multiple entries
- Function extracts skills and parses categories
- Function extracts introduction
- Return structure matches AI parsing format

## Task 11: Implement DeepSeek AI Parsing
Add JavaScript function to parse resume text using DeepSeek API.

**Files to modify:**
- `docs/index.html`

**Implementation:**
1. Create async function `parseWithAI(text, apiKey)`
2. Construct structured prompt requesting JSON output
3. Make POST request to DeepSeek API endpoint
4. Set proper headers (Content-Type, Authorization)
5. Parse JSON response
6. Extract JSON from response (handle markdown code blocks)
7. Validate response structure
8. Handle API errors (network, auth, rate limit, timeout)
9. Return parsed data object

**Acceptance criteria:**
- Function sends correct API request to DeepSeek
- Prompt requests all required fields in JSON format
- Function parses JSON response correctly
- Function handles markdown-wrapped JSON
- API errors trigger fallback to regex parsing
- Function returns data object with all fields
- Timeout is set to 30 seconds

## Task 12: Implement Main Parse Function
Add JavaScript function to orchestrate the parsing flow.

**Files to modify:**
- `docs/index.html`

**Implementation:**
1. Create async function `parseResume()`
2. Show loading spinner and disable parse button
3. Extract text based on file type (PDF/DOCX/TXT)
4. Check if API key exists in localStorage
5. If API key exists, try AI parsing first
6. If AI parsing fails or no API key, use regex parsing
7. Validate parsed data (check required fields)
8. Save data to localStorage (key: "resume")
9. Display preview with parsed data
10. Show edit button
11. Hide loading spinner and enable parse button
12. Handle all errors with appropriate messages

**Acceptance criteria:**
- Function coordinates entire parsing flow
- Loading state is shown during parsing
- Text extraction works for all file types
- AI parsing is attempted if API key exists
- Regex fallback works when AI fails or no API key
- Data is saved to localStorage after parsing
- Preview is displayed after successful parsing
- All errors show appropriate messages
- Loading state is cleared after completion

## Task 13: Implement Preview Display
Add JavaScript function to display parsed resume data in preview section.

**Files to modify:**
- `docs/index.html`

**Implementation:**
1. Create function `displayPreview(data)`
2. Show preview section
3. Display basic fields (name, email, phone, education, major, degree, graduationDate)
4. Display multiple work experiences as separate cards
5. Display categorized skills if available
6. Display introduction
7. Mark missing fields with "未提取" in gray
8. Mark required fields with asterisk (*)
9. Show edit button
10. Add CSS styles for preview cards and layout

**Acceptance criteria:**
- Preview section displays all extracted fields
- Multiple work experiences show as separate cards
- Categorized skills display with category headers
- Missing fields show "未提取" text
- Required fields have asterisk indicator
- Preview has clean, readable layout
- Edit button is visible

## Task 14: Implement Manual Entry Form
Add JavaScript to handle manual entry form submission.

**Files to modify:**
- `docs/index.html`

**Implementation:**
1. Create function to pre-fill form with localStorage data
2. Add form submit event listener
3. Validate required fields (name, email, phone)
4. Validate email format
5. Collect form data into object
6. Save data to localStorage (key: "resume")
7. Show success message
8. Close modal after 1.5 seconds
9. Handle validation errors with inline messages

**Acceptance criteria:**
- Form pre-fills with existing localStorage data
- Required field validation works
- Email format validation works
- Form data is saved to localStorage on submit
- Success message shows after save
- Modal closes automatically after success
- Validation errors show inline below fields

## Task 15: Implement Edit Button Functionality
Add JavaScript to handle edit button click in preview section.

**Files to modify:**
- `docs/index.html`

**Implementation:**
1. Add event listener to edit button
2. Switch to manual entry tab
3. Pre-fill form with current parsed data
4. Focus on first form field

**Acceptance criteria:**
- Clicking edit button switches to manual entry tab
- Form is pre-filled with parsed data
- First field receives focus
- User can edit and save changes

## Task 16: Implement Settings Modal
Add JavaScript to handle API key configuration.

**Files to modify:**
- `docs/index.html`

**Implementation:**
1. Add event listener to settings button to open settings modal
2. Load existing API key from localStorage when modal opens
3. Add event listener to save settings button
4. Validate API key format (starts with "sk-")
5. Save API key to localStorage (key: "deepseekApiKey")
6. Show success message after save
7. Add event listener to test connection button
8. Make test API call to verify key
9. Show success/error message based on test result
10. Add close button functionality for settings modal

**Acceptance criteria:**
- Settings button opens settings modal
- Existing API key loads into input field
- API key format validation works
- Valid API key saves to localStorage
- Test connection makes actual API call
- Test results show appropriate messages
- Settings modal can be closed

## Task 17: Implement Toast Notifications
Add JavaScript function to show toast notifications for messages.

**Files to modify:**
- `docs/index.html`

**Implementation:**
1. Create function `showToast(message, type)`
2. Create toast element dynamically
3. Add appropriate styling based on type (success, error, warning, info)
4. Append to body
5. Animate in (slide from top)
6. Auto-remove after 3 seconds
7. Animate out before removal
8. Add CSS styles for toast and animations

**Acceptance criteria:**
- Toast appears at top of screen
- Toast has correct styling based on type
- Toast slides in smoothly
- Toast auto-dismisses after 3 seconds
- Toast slides out before removal
- Multiple toasts stack properly

## Task 18: Add Loading States
Add CSS and JavaScript for loading spinners and disabled states.

**Files to modify:**
- `docs/index.html`

**Implementation:**
1. Add CSS for loading spinner animation
2. Create function to show/hide loading state
3. Update parse button to show loading state
4. Update test connection button to show loading state
5. Disable buttons during loading
6. Show "正在解析简历..." text during parsing
7. Show "测试中..." text during connection test

**Acceptance criteria:**
- Loading spinner displays during parsing
- Parse button is disabled during parsing
- Loading text shows during parsing
- Test button shows loading state during test
- All loading states clear after completion

## Task 19: Implement Error Handling
Add comprehensive error handling throughout the application.

**Files to modify:**
- `docs/index.html`

**Implementation:**
1. Add try-catch blocks to all async functions
2. Create error message mapping for different error types
3. Display user-friendly error messages in Chinese
4. Log detailed errors to console for debugging
5. Handle network errors gracefully
6. Handle localStorage errors
7. Handle file reading errors
8. Handle API errors with fallback to regex
9. Show appropriate error messages using toast notifications

**Acceptance criteria:**
- All errors are caught and handled
- User-friendly error messages display in Chinese
- Detailed errors log to console
- Network errors show appropriate message
- localStorage errors show appropriate message
- API errors trigger fallback to regex parsing
- File errors show specific error messages

## Task 20: Test and Verify Integration
Test the complete integration in Safari browser and verify all functionality.

**Files to modify:**
- None (testing only)

**Implementation:**
1. Test parser button appears and opens modal
2. Test file upload with PDF, DOCX, TXT files
3. Test drag-and-drop file upload
4. Test parsing with AI (with valid API key)
5. Test parsing with regex (without API key)
6. Test preview display with various resume formats
7. Test manual entry form submission
8. Test edit functionality
9. Test settings modal and API key configuration
10. Test all error scenarios
11. Test in Safari browser specifically
12. Verify localStorage persistence
13. Verify Chinese character support
14. Verify sakura pink theme consistency
15. Verify no conflicts with existing website functionality

**Acceptance criteria:**
- All features work correctly in Safari
- File upload works for all supported formats
- Parsing works with both AI and regex methods
- Preview displays correctly for various resume formats
- Manual entry and editing work correctly
- Settings and API configuration work correctly
- All error messages display correctly
- localStorage persists data correctly
- Chinese characters display correctly
- Theme matches existing website
- No conflicts with existing functionality
