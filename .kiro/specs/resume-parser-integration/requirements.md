# Requirements Document

## Introduction

This feature integrates the resume parser functionality from the Chrome extension into the website (https://catarina-xxxcc.github.io/cv_programme/). The parser will be accessible via a button at the bottom of the sidebar's upload area section. When clicked, it opens a modal with the resume parser UI that supports PDF, DOCX, and TXT file uploads, uses DeepSeek AI API for intelligent parsing (with regex fallback), and stores parsed data in localStorage. The implementation must work in Safari browser and use local library files to avoid VPN-related CDN issues.

## Glossary

- **Resume_Parser**: The web-based component that extracts structured information from resume files
- **Parser_Modal**: The popup/modal window that contains the resume parser UI
- **DeepSeek_API**: The AI service used for intelligent resume parsing
- **Parser_Button**: The button in the sidebar that triggers the parser modal
- **Sidebar**: The left sidebar containing user profile, resume list, and upload functionality
- **Upload_Area_Section**: The section at the bottom of the sidebar with the `.upload-area-section` class
- **Parsed_Data**: Structured resume information including name, email, phone, education, major, degree, graduation date, work experiences, skills, and introduction
- **Local_Storage**: Browser localStorage used to persist parsed resume data
- **Regex_Fallback**: The backup parsing method using regular expressions when AI parsing fails
- **PDF_Library**: The pdf.js library for extracting text from PDF files
- **DOCX_Library**: The mammoth.js library for extracting text from DOCX files
- **Settings_UI**: The interface for configuring the DeepSeek API key
- **Preview_UI**: The interface showing parsed results before saving
- **Edit_Mode**: The state where users can modify parsed data before saving
- **Sakura_Pink_Theme**: The 樱花粉 (cherry blossom pink) color scheme used throughout the website

## Requirements

### Requirement 1: Parser Button Integration

**User Story:** As a user, I want to see a parser button at the bottom of the sidebar upload area, so that I can easily access the resume parsing functionality.

#### Acceptance Criteria

1. THE Parser_Button SHALL be positioned at the bottom of the Upload_Area_Section in the Sidebar
2. THE Parser_Button SHALL display text "📄 智能简历解析" or similar descriptive label
3. THE Parser_Button SHALL use the Sakura_Pink_Theme color scheme matching the website design
4. WHEN the Parser_Button is hovered, THE Parser_Button SHALL show visual feedback (color change, scale, or shadow)
5. WHEN the Parser_Button is clicked, THE System SHALL open the Parser_Modal

### Requirement 2: Parser Modal UI

**User Story:** As a user, I want a modal window with the resume parser interface, so that I can upload and parse my resume without leaving the current page.

#### Acceptance Criteria

1. THE Parser_Modal SHALL display as an overlay on top of the current page content
2. THE Parser_Modal SHALL include a close button (X) in the top-right corner
3. THE Parser_Modal SHALL use the Sakura_Pink_Theme color scheme
4. THE Parser_Modal SHALL contain two tabs: "上传简历" (Upload Resume) and "手动填写" (Manual Entry)
5. WHEN the close button is clicked, THE Parser_Modal SHALL close and hide from view
6. WHEN the user clicks outside the Parser_Modal content area, THE Parser_Modal SHALL close
7. THE Parser_Modal SHALL be responsive and centered on the screen
8. THE Parser_Modal SHALL have a minimum width of 450px and maximum width of 600px

### Requirement 3: File Upload Functionality

**User Story:** As a user, I want to upload resume files in multiple formats, so that I can parse resumes regardless of their file type.

#### Acceptance Criteria

1. THE Resume_Parser SHALL accept PDF file uploads
2. THE Resume_Parser SHALL accept DOCX file uploads
3. THE Resume_Parser SHALL accept TXT file uploads
4. THE Resume_Parser SHALL reject files that are not PDF, DOCX, or TXT formats
5. WHEN a file is selected via file input, THE Resume_Parser SHALL display the file name and size
6. WHEN a file is dragged over the upload area, THE Upload_Area_Section SHALL show visual feedback (border color change)
7. WHEN a file is dropped on the upload area, THE Resume_Parser SHALL accept the file
8. IF an unsupported file format is uploaded, THEN THE Resume_Parser SHALL display an error message "不支持的文件格式，请上传 PDF、DOCX 或 TXT 文件"

### Requirement 4: PDF Text Extraction

**User Story:** As a user, I want the parser to extract text from PDF files, so that I can parse PDF resumes.

#### Acceptance Criteria

1. THE Resume_Parser SHALL use the PDF_Library (pdf.js) to extract text from PDF files
2. THE Resume_Parser SHALL load pdf.min.js and pdf.worker.min.js from local files (not CDN)
3. THE Resume_Parser SHALL extract text from all pages in the PDF document
4. THE Resume_Parser SHALL concatenate text from multiple pages with newline separators
5. IF PDF text extraction fails, THEN THE Resume_Parser SHALL display error message "PDF 文件解析失败：[error details]"
6. THE Resume_Parser SHALL handle Chinese characters in PDF files correctly

### Requirement 5: DOCX Text Extraction

**User Story:** As a user, I want the parser to extract text from DOCX files, so that I can parse Word document resumes.

#### Acceptance Criteria

1. THE Resume_Parser SHALL use the DOCX_Library (mammoth.js) to extract text from DOCX files
2. THE Resume_Parser SHALL load mammoth.browser.min.js from local files (not CDN)
3. THE Resume_Parser SHALL extract raw text content from DOCX files
4. IF DOCX text extraction fails, THEN THE Resume_Parser SHALL display error message "DOCX 文件解析失败，请尝试将内容复制到 TXT 文件"
5. THE Resume_Parser SHALL handle Chinese characters in DOCX files correctly

### Requirement 6: TXT File Reading

**User Story:** As a user, I want the parser to read plain text files, so that I can parse TXT format resumes.

#### Acceptance Criteria

1. THE Resume_Parser SHALL read TXT files using FileReader API
2. THE Resume_Parser SHALL use UTF-8 encoding when reading TXT files
3. IF TXT file reading fails, THEN THE Resume_Parser SHALL display error message "文件读取失败"
4. THE Resume_Parser SHALL handle Chinese characters in TXT files correctly

### Requirement 7: DeepSeek AI Parsing

**User Story:** As a user, I want the parser to use AI for intelligent resume parsing, so that I can get accurate structured data from various resume formats.

#### Acceptance Criteria

1. THE Resume_Parser SHALL use the DeepSeek_API to parse resume text into structured data
2. THE Resume_Parser SHALL retrieve the API key from Local_Storage before making API calls
3. THE Resume_Parser SHALL send resume text to DeepSeek_API with a structured prompt requesting JSON output
4. THE Resume_Parser SHALL extract the following fields from AI response: name, email, phone, education, major, degree, graduationDate, workExperiences (array), workExperience (text), skills, skillsDetailed (object), introduction
5. THE Resume_Parser SHALL parse workExperiences as an array where each entry contains: company, position, period, description
6. THE Resume_Parser SHALL parse skillsDetailed as an object with category names as keys and skill descriptions as values
7. IF the DeepSeek_API returns an error, THEN THE Resume_Parser SHALL fall back to Regex_Fallback parsing
8. IF no API key is configured, THEN THE Resume_Parser SHALL use Regex_Fallback parsing and display message "💡 提示：配置 DeepSeek API 可获得更准确的解析结果"
9. THE Resume_Parser SHALL handle API rate limits and network errors gracefully

### Requirement 8: Regex Fallback Parsing

**User Story:** As a user, I want the parser to have a backup parsing method, so that I can still parse resumes when AI parsing is unavailable.

#### Acceptance Criteria

1. WHEN DeepSeek_API is unavailable or fails, THE Resume_Parser SHALL use Regex_Fallback to extract resume information
2. THE Regex_Fallback SHALL extract email addresses using pattern matching
3. THE Regex_Fallback SHALL extract phone numbers using pattern matching (supporting Chinese phone formats)
4. THE Regex_Fallback SHALL extract name from the first line of the resume
5. THE Regex_Fallback SHALL extract education information (school, major, degree, graduation date) from education section
6. THE Regex_Fallback SHALL extract work experience from work experience section
7. THE Regex_Fallback SHALL extract skills from skills section
8. THE Regex_Fallback SHALL extract self-introduction from introduction section
9. THE Regex_Fallback SHALL return the same data structure as AI parsing for consistency

### Requirement 9: Parsed Data Validation

**User Story:** As a user, I want the parser to validate extracted information, so that I know which required fields are missing.

#### Acceptance Criteria

1. THE Resume_Parser SHALL check if name field is extracted
2. THE Resume_Parser SHALL check if email field is extracted
3. THE Resume_Parser SHALL check if phone field is extracted
4. IF any required field (name, email, phone) is missing, THEN THE Resume_Parser SHALL display warning message "⚠️ 部分信息未提取到：[missing fields]。已保存其他信息，请点击'编辑'补充。"
5. THE Resume_Parser SHALL save Parsed_Data to Local_Storage even if some fields are missing
6. THE Resume_Parser SHALL enable the autofill button even if some fields are missing

### Requirement 10: Preview Display

**User Story:** As a user, I want to see a preview of parsed results, so that I can verify the extracted information before saving.

#### Acceptance Criteria

1. WHEN parsing completes successfully, THE Resume_Parser SHALL display the Preview_UI
2. THE Preview_UI SHALL show all extracted fields: name, email, phone, education, major, degree, graduationDate
3. THE Preview_UI SHALL display work experiences as separate cards when multiple experiences exist
4. THE Preview_UI SHALL display skills with categories when skillsDetailed is available
5. THE Preview_UI SHALL mark missing fields with "未提取" text in gray color
6. THE Preview_UI SHALL mark required fields with asterisk (*) indicator
7. THE Preview_UI SHALL include an "编辑" (Edit) button to switch to manual entry mode
8. WHEN the Edit button is clicked, THE Resume_Parser SHALL switch to the "手动填写" tab with pre-filled data

### Requirement 11: Manual Data Entry

**User Story:** As a user, I want to manually enter or edit resume information, so that I can correct parsing errors or add missing information.

#### Acceptance Criteria

1. THE Resume_Parser SHALL provide a manual entry form with fields: name, email, phone, education, major, degree, graduationDate, workExperience, skills, introduction
2. THE Resume_Parser SHALL mark name, email, and phone as required fields
3. THE Resume_Parser SHALL provide a dropdown for degree selection with options: 高中, 大专, 本科, 硕士, 博士
4. WHEN the manual entry form is submitted, THE Resume_Parser SHALL validate that required fields are filled
5. IF required fields are empty, THEN THE Resume_Parser SHALL display error message "请填写所有必填字段（姓名、邮箱、电话）"
6. WHEN the form is submitted successfully, THE Resume_Parser SHALL save data to Local_Storage
7. WHEN the form is submitted successfully, THE Resume_Parser SHALL display success message "✅ 简历保存成功！"
8. WHEN switching to manual entry tab, THE Resume_Parser SHALL pre-fill form fields with existing data from Local_Storage

### Requirement 12: API Key Configuration

**User Story:** As a user, I want to configure my DeepSeek API key, so that I can enable AI-powered parsing.

#### Acceptance Criteria

1. THE Resume_Parser SHALL provide a Settings_UI accessible via a settings button (⚙️ icon)
2. THE Settings_UI SHALL include an input field for DeepSeek API key
3. THE Settings_UI SHALL mask the API key input as password type
4. THE Settings_UI SHALL provide a "保存设置" (Save Settings) button
5. THE Settings_UI SHALL provide a "测试连接" (Test Connection) button
6. WHEN the Save Settings button is clicked, THE Settings_UI SHALL validate that API key starts with "sk-"
7. IF API key format is invalid, THEN THE Settings_UI SHALL display error message "API Key 格式不正确，应该以 sk- 开头"
8. WHEN API key is saved, THE Settings_UI SHALL store it in Local_Storage with key "deepseekApiKey"
9. WHEN Test Connection button is clicked, THE Settings_UI SHALL make a test API call to verify the key
10. IF test connection succeeds, THEN THE Settings_UI SHALL display success message "✅ 连接成功！API Key 有效"
11. IF test connection fails, THEN THE Settings_UI SHALL display error message with failure reason
12. THE Settings_UI SHALL load existing API key from Local_Storage when opened

### Requirement 13: Data Persistence

**User Story:** As a user, I want my parsed resume data to be saved automatically, so that I don't lose my information when closing the modal.

#### Acceptance Criteria

1. WHEN parsing completes successfully, THE Resume_Parser SHALL save Parsed_Data to Local_Storage with key "resume"
2. WHEN manual entry form is submitted, THE Resume_Parser SHALL save form data to Local_Storage with key "resume"
3. THE Resume_Parser SHALL store data in JSON format
4. WHEN the Parser_Modal is opened, THE Resume_Parser SHALL load existing data from Local_Storage
5. THE Resume_Parser SHALL enable autofill buttons if valid data exists in Local_Storage

### Requirement 14: Safari Browser Compatibility

**User Story:** As a user using Safari browser, I want the parser to work correctly, so that I can parse resumes on my preferred browser.

#### Acceptance Criteria

1. THE Resume_Parser SHALL function correctly in Safari browser
2. THE Resume_Parser SHALL use Safari-compatible JavaScript APIs
3. THE Resume_Parser SHALL handle file uploads in Safari correctly
4. THE Resume_Parser SHALL store and retrieve data from Local_Storage in Safari
5. THE Resume_Parser SHALL render the modal UI correctly in Safari

### Requirement 15: Local Library Loading

**User Story:** As a user with VPN restrictions, I want the parser to use local library files, so that I can use the parser without CDN access.

#### Acceptance Criteria

1. THE Resume_Parser SHALL load pdf.min.js from local file path
2. THE Resume_Parser SHALL load pdf.worker.min.js from local file path
3. THE Resume_Parser SHALL load mammoth.browser.min.js from local file path
4. THE Resume_Parser SHALL NOT use CDN links for any libraries
5. THE Resume_Parser SHALL copy library files from chrome-extension-mvp/libs/ directory to website directory
6. THE Resume_Parser SHALL configure pdf.js worker path to use local file

### Requirement 16: Loading States

**User Story:** As a user, I want to see loading indicators during parsing, so that I know the system is processing my request.

#### Acceptance Criteria

1. WHEN parsing starts, THE Resume_Parser SHALL display a loading spinner
2. WHEN parsing starts, THE Resume_Parser SHALL disable the parse button
3. WHEN parsing starts, THE Resume_Parser SHALL display text "正在解析简历..."
4. WHEN parsing completes, THE Resume_Parser SHALL hide the loading spinner
5. WHEN parsing completes, THE Resume_Parser SHALL enable the parse button
6. WHEN API test connection starts, THE Settings_UI SHALL disable the test button and change text to "测试中..."
7. WHEN API test connection completes, THE Settings_UI SHALL restore the test button to original state

### Requirement 17: Error Handling

**User Story:** As a user, I want clear error messages when something goes wrong, so that I can understand and fix the issue.

#### Acceptance Criteria

1. IF file upload fails, THEN THE Resume_Parser SHALL display error message with specific reason
2. IF text extraction fails, THEN THE Resume_Parser SHALL display error message with file type and error details
3. IF AI parsing fails, THEN THE Resume_Parser SHALL display error message and automatically fall back to regex parsing
4. IF network request fails, THEN THE Resume_Parser SHALL display error message "网络请求失败，请检查网络连接"
5. IF Local_Storage is unavailable, THEN THE Resume_Parser SHALL display error message "浏览器存储不可用，请检查浏览器设置"
6. THE Resume_Parser SHALL log detailed error information to browser console for debugging
7. THE Resume_Parser SHALL display user-friendly error messages in Chinese

### Requirement 18: Multi-Work-Experience Support

**User Story:** As a user with multiple work experiences, I want the parser to extract all my work history, so that I have complete information for job applications.

#### Acceptance Criteria

1. THE Resume_Parser SHALL extract multiple work experience entries from resume text
2. THE Resume_Parser SHALL store work experiences as an array in workExperiences field
3. THE Resume_Parser SHALL extract company name for each work experience
4. THE Resume_Parser SHALL extract position title for each work experience
5. THE Resume_Parser SHALL extract time period for each work experience
6. THE Resume_Parser SHALL extract job description for each work experience
7. THE Preview_UI SHALL display each work experience as a separate card with company, position, period, and description
8. THE Resume_Parser SHALL also store a combined text version in workExperience field for backward compatibility

### Requirement 19: Categorized Skills Support

**User Story:** As a user with skills in different categories, I want the parser to preserve skill categorization, so that my skills are organized clearly.

#### Acceptance Criteria

1. THE Resume_Parser SHALL extract skill categories from resume text (e.g., "语言:", "编程技能:")
2. THE Resume_Parser SHALL store categorized skills in skillsDetailed field as an object
3. THE Resume_Parser SHALL use category names as keys in skillsDetailed object
4. THE Resume_Parser SHALL store skill descriptions as values in skillsDetailed object
5. THE Preview_UI SHALL display skills grouped by category when skillsDetailed is available
6. THE Resume_Parser SHALL also store a combined skills text in skills field for backward compatibility

### Requirement 20: Modal Styling and Theme

**User Story:** As a user of the website, I want the parser modal to match the website's design, so that the experience feels cohesive.

#### Acceptance Criteria

1. THE Parser_Modal SHALL use Sakura_Pink_Theme colors: #FFB7C5 (primary), #FFE4E9 (light), #FFF5F7 (lighter), #FF9DB3 (dark)
2. THE Parser_Modal SHALL use the same font family as the website: 'Inter', -apple-system, BlinkMacSystemFont, "PingFang SC"
3. THE Parser_Modal SHALL use consistent border radius values: 8px (small), 12px (medium), 16px (large)
4. THE Parser_Modal SHALL use consistent shadow styles matching the website
5. THE Parser_Modal buttons SHALL use hover effects with transform and shadow transitions
6. THE Parser_Modal SHALL use smooth transitions (0.3s cubic-bezier) for interactive elements
7. THE Parser_Modal SHALL maintain visual hierarchy with proper spacing and typography

