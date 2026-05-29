# Requirements Document

## Introduction

简历自动填充浏览器插件（Resume Autofill Extension）是一个跨浏览器扩展程序，旨在帮助求职者在投递公司官网职位时实现简历信息的一键自动填充。该插件与现有的"小小求职拿下"Web 应用深度集成，支持多版本简历管理、智能表单识别、自动填充以及投递记录跟踪功能。用户可以存储多个针对不同岗位定制的简历版本，在访问公司招聘页面时一键填充表单，并在主应用中查看和跟进所有投递记录。

## Glossary

- **Extension**: 浏览器扩展程序，支持 Chrome、Safari 和 Edge 浏览器
- **Resume_Manager**: 简历管理器，负责存储和管理多个简历版本
- **Resume_Parser**: 简历解析器，负责将简历内容解析为结构化的 JSON 数据
- **Form_Detector**: 表单检测器，负责识别网页上的招聘表单字段
- **Field_Mapper**: 字段映射器，负责将简历 JSON 字段映射到表单输入字段
- **Autofill_Engine**: 自动填充引擎，负责执行表单字段的自动填充操作
- **Application_Tracker**: 投递跟踪器，负责记录和管理投递历史
- **Sync_Service**: 同步服务，负责在插件和 Web 应用之间同步数据
- **Web_Application**: "小小求职拿下"主 Web 应用
- **Career_Page**: 公司官方招聘页面
- **Resume_Version**: 简历版本，包含完整的简历结构化数据
- **Application_Record**: 投递记录，包含投递时间、公司名称、岗位名称和状态
- **Form_Field**: 表单字段，指招聘页面上的输入框、下拉菜单等表单元素
- **JSON_Schema**: 简历数据的 JSON 结构定义，包含姓名、电话、邮箱、教育经历、工作经验、技能等字段

## Requirements

### Requirement 1: 多版本简历存储

**User Story:** 作为求职者，我希望能够在插件中存储多个简历版本，以便针对不同类型的岗位使用不同的简历内容。

#### Acceptance Criteria

1. THE Resume_Manager SHALL store at least 10 Resume_Versions in browser local storage
2. WHEN a user uploads a resume file, THE Resume_Parser SHALL extract structured data and convert it into JSON_Schema format within 3 seconds
3. WHEN a user creates a new Resume_Version, THE Resume_Manager SHALL assign a unique identifier and timestamp to the Resume_Version
4. THE Resume_Manager SHALL allow users to assign custom names to each Resume_Version
5. WHEN a user requests to view stored resumes, THE Resume_Manager SHALL display all Resume_Versions with their names and creation timestamps
6. WHEN a user selects a Resume_Version for deletion, THE Resume_Manager SHALL remove the Resume_Version from storage and update the display

### Requirement 2: 鲁棒的简历解析

**User Story:** 作为求职者，我希望插件能够准确解析我的简历内容，提取所有关键信息，以便自动填充时不会遗漏重要数据。

#### Acceptance Criteria

1. WHEN a resume file is provided, THE Resume_Parser SHALL extract the following fields: name, phone number, email address, education history, work experience, skills, certifications, and project experience
2. WHEN the Resume_Parser encounters missing or ambiguous fields, THE Resume_Parser SHALL mark those fields as empty rather than generating incorrect data
3. WHEN parsing fails for a specific field, THE Resume_Parser SHALL log the error and continue parsing remaining fields
4. THE Resume_Parser SHALL support PDF and DOCX file formats
5. WHEN a resume contains multiple education entries, THE Resume_Parser SHALL preserve all entries in chronological order
6. WHEN a resume contains multiple work experience entries, THE Resume_Parser SHALL preserve all entries in chronological order
7. THE Resume_Parser SHALL validate email addresses against standard email format patterns
8. THE Resume_Parser SHALL validate phone numbers and normalize them to a consistent format

### Requirement 3: 智能表单字段检测

**User Story:** 作为求职者，我希望插件能够自动识别公司招聘页面上的表单字段，以便我不需要手动指定哪些字段需要填充。

#### Acceptance Criteria

1. WHEN a Career_Page is loaded, THE Form_Detector SHALL scan the page for form input elements within 2 seconds
2. THE Form_Detector SHALL identify input fields by analyzing element attributes including name, id, placeholder, label, and aria-label
3. WHEN multiple forms exist on a page, THE Form_Detector SHALL identify the recruitment-related form based on form context and field patterns
4. THE Form_Detector SHALL detect the following field types: text input, textarea, select dropdown, radio button, checkbox, and file upload
5. WHEN a field type cannot be determined, THE Form_Detector SHALL classify it as a generic text input
6. THE Form_Detector SHALL ignore non-recruitment form fields such as search boxes and login forms

### Requirement 4: 字段映射与匹配

**User Story:** 作为求职者，我希望插件能够智能地将我的简历数据匹配到表单字段，即使不同公司使用不同的字段命名方式。

#### Acceptance Criteria

1. THE Field_Mapper SHALL maintain a mapping dictionary that associates common field names with Resume_Version JSON_Schema fields
2. WHEN a Form_Field name contains keywords such as "name", "姓名", "full name", THE Field_Mapper SHALL map it to the name field in JSON_Schema
3. WHEN a Form_Field name contains keywords such as "phone", "电话", "mobile", "手机", THE Field_Mapper SHALL map it to the phone field in JSON_Schema
4. WHEN a Form_Field name contains keywords such as "email", "邮箱", "e-mail", THE Field_Mapper SHALL map it to the email field in JSON_Schema
5. WHEN a Form_Field name contains keywords such as "education", "学历", "degree", THE Field_Mapper SHALL map it to the education field in JSON_Schema
6. WHEN a Form_Field name contains keywords such as "experience", "工作经验", "work history", THE Field_Mapper SHALL map it to the work experience field in JSON_Schema
7. WHEN a Form_Field cannot be confidently mapped, THE Field_Mapper SHALL mark it as unmapped and skip it during autofill
8. THE Field_Mapper SHALL support fuzzy matching with a confidence threshold of 70 percent

### Requirement 5: 一键自动填充

**User Story:** 作为求职者，我希望能够一键填充招聘表单，让插件自动将我的简历信息填入所有识别到的字段，这样我可以直接提交而无需手动调整。

#### Acceptance Criteria

1. WHEN a user clicks the autofill button, THE Autofill_Engine SHALL fill all mapped Form_Fields within 1 second
2. THE Autofill_Engine SHALL trigger input events on filled fields to ensure form validation logic is executed
3. WHEN a Form_Field is a select dropdown, THE Autofill_Engine SHALL select the option that best matches the Resume_Version data
4. WHEN a Form_Field is a textarea, THE Autofill_Engine SHALL format multi-line content appropriately
5. WHEN a Form_Field has a maximum length constraint, THE Autofill_Engine SHALL truncate the content to fit the constraint
6. WHEN autofill completes, THE Autofill_Engine SHALL display a success notification to the user
7. IF autofill fails for any field, THEN THE Autofill_Engine SHALL log the error and continue filling remaining fields
8. THE Autofill_Engine SHALL not submit the form automatically

### Requirement 6: 投递记录跟踪

**User Story:** 作为求职者，我希望插件能够自动记录我的每次投递，包括时间、公司和岗位信息，以便我可以跟进投递进度。

#### Acceptance Criteria

1. WHEN a user completes autofill on a Career_Page, THE Application_Tracker SHALL create an Application_Record
2. THE Application_Tracker SHALL extract the company name from the Career_Page URL or page title
3. THE Application_Tracker SHALL extract the position name from the Career_Page content or form fields
4. THE Application_Tracker SHALL record the current timestamp as the application time
5. THE Application_Tracker SHALL store the Application_Record in browser local storage
6. THE Application_Tracker SHALL assign an initial status of "已投递" to each Application_Record
7. WHEN a user views application history, THE Application_Tracker SHALL display all Application_Records sorted by application time in descending order

### Requirement 7: 数据同步与展示

**User Story:** 作为求职者，我希望能够在"小小求职拿下"主应用中查看我的所有投递记录，以便集中管理和跟进。

#### Acceptance Criteria

1. THE Sync_Service SHALL synchronize Application_Records from the Extension to the Web_Application every 5 minutes
2. WHEN the Web_Application is opened, THE Sync_Service SHALL fetch the latest Application_Records from browser storage
3. THE Web_Application SHALL display Application_Records in a dedicated tracking section
4. THE Web_Application SHALL display the following information for each Application_Record: company name, position name, application time, and status
5. WHEN a user updates an Application_Record status in the Web_Application, THE Sync_Service SHALL update the corresponding record in the Extension storage
6. THE Sync_Service SHALL handle synchronization conflicts by prioritizing the most recent update timestamp

### Requirement 8: 跨浏览器兼容性

**User Story:** 作为求职者，我希望插件能够在我常用的浏览器上运行，无论我使用 Chrome、Safari 还是 Edge。

#### Acceptance Criteria

1. THE Extension SHALL support Chrome browser version 90 and above
2. THE Extension SHALL support Safari browser version 14 and above
3. THE Extension SHALL support Edge browser version 90 and above
4. THE Extension SHALL use browser-agnostic APIs or provide polyfills for browser-specific APIs
5. WHEN the Extension is installed on any supported browser, THE Extension SHALL provide identical core functionality
6. THE Extension SHALL adapt UI elements to match each browser's extension design guidelines

### Requirement 9: 数据隐私与安全

**User Story:** 作为求职者，我希望我的简历数据能够安全存储，不会被泄露或滥用。

#### Acceptance Criteria

1. THE Extension SHALL store all Resume_Versions and Application_Records in browser local storage only
2. THE Extension SHALL not transmit Resume_Version data to any external server except the user's own Web_Application backend
3. WHEN communicating with the Web_Application backend, THE Extension SHALL use HTTPS protocol
4. THE Extension SHALL not request unnecessary browser permissions beyond storage and active tab access
5. WHEN a user uninstalls the Extension, THE Extension SHALL provide an option to delete all stored data
6. THE Extension SHALL encrypt sensitive fields such as phone numbers and email addresses before storing them in local storage

### Requirement 10: 用户界面与交互

**User Story:** 作为求职者，我希望插件界面简洁易用，能够快速完成简历选择和自动填充操作。

#### Acceptance Criteria

1. THE Extension SHALL provide a popup interface accessible via the browser toolbar icon
2. THE Extension popup SHALL display all stored Resume_Versions with their names
3. WHEN a user selects a Resume_Version from the popup, THE Extension SHALL mark it as the active resume
4. THE Extension popup SHALL display an autofill button that is enabled only when a Career_Page is detected
5. WHEN a user clicks the autofill button, THE Extension SHALL execute the autofill operation and provide visual feedback
6. THE Extension popup SHALL display the count of Application_Records
7. THE Extension popup SHALL provide a link to open the Web_Application tracking page
8. THE Extension SHALL use a color scheme consistent with the Web_Application's sakura pink theme

### Requirement 11: 错误处理与用户反馈

**User Story:** 作为求职者，我希望当插件遇到问题时能够收到清晰的错误提示，以便我知道如何解决。

#### Acceptance Criteria

1. WHEN the Resume_Parser fails to parse a resume file, THE Extension SHALL display an error message indicating the parsing failure
2. WHEN the Form_Detector cannot find a recruitment form on the page, THE Extension SHALL display a message indicating no form was detected
3. WHEN the Autofill_Engine encounters a field mapping error, THE Extension SHALL log the error and notify the user of partially completed autofill
4. WHEN the Sync_Service fails to synchronize data, THE Extension SHALL retry up to 3 times before displaying an error message
5. THE Extension SHALL provide a help button in the popup that links to user documentation
6. WHEN an error occurs, THE Extension SHALL log detailed error information to the browser console for debugging purposes

### Requirement 12: 简历解析器与打印器（Round-Trip 支持）

**User Story:** 作为开发者，我希望简历解析器能够准确地将简历转换为 JSON 格式，并且能够将 JSON 格式转换回可读的简历格式，以确保数据的完整性和一致性。

#### Acceptance Criteria

1. WHEN a valid resume file is provided, THE Resume_Parser SHALL parse it into a Resume_Version JSON object conforming to JSON_Schema
2. WHEN an invalid or corrupted resume file is provided, THE Resume_Parser SHALL return a descriptive error message
3. THE Resume_Printer SHALL format Resume_Version JSON objects back into human-readable text format
4. FOR ALL valid Resume_Version JSON objects, parsing the printed output SHALL produce an equivalent JSON object (round-trip property)
5. THE Resume_Printer SHALL preserve all field values including multi-line text, special characters, and formatting
6. WHEN a Resume_Version contains empty fields, THE Resume_Printer SHALL omit those fields from the output rather than displaying empty values

