# Requirements Document

## Introduction

通用表单自动填充与投递追踪（Universal Autofill & Application Tracking）是对现有"小小求职拿下"Chrome 扩展的增强功能。该功能旨在解决两个核心问题：

1. **通用自动填充**：在任意网站（不限于特定招聘平台，包括公司官网、校招页面等）上实现一键填充简历数据到表单中，通过智能字段匹配分析 input 属性和 label 文本来识别表单字段。
2. **投递记录追踪**：用户手动确认后记录每次投递信息（日期、网站 URL、页面标题/职位名称、公司名称），存储在 chrome.storage.local 中，并通过 postMessage 通信机制在主网站上展示投递历史时间线和统计数据。

该功能完全基于浏览器本地存储，无需后端数据库支持。

## Glossary

- **Autofill_Trigger**: 自动填充触发器，页面上的浮动按钮，用于触发一键填充操作
- **Field_Matcher**: 字段匹配器，通过分析 input 元素的 name、id、placeholder、aria-label 属性及关联 label 文本来识别表单字段用途
- **Fill_Confirmation_UI**: 填充确认界面，在自动填充完成后显示填充结果摘要，允许用户确认或撤销
- **Record_Button**: 记录投递按钮，自动填充完成后出现的浮动按钮，用户点击后记录本次投递
- **Application_Record**: 投递记录，包含 date（投递日期）、url（网站 URL）、pageTitle（页面标题/职位名称）、company（公司名称）、position（岗位名称）、status（投递状态）
- **Application_Storage**: 投递记录存储，使用 chrome.storage.local 存储所有 Application_Record 数据
- **Content_Script**: 内容脚本，注入到网页中运行的脚本，负责表单检测、自动填充和浮动 UI 展示
- **Website_Bridge**: 网站通信桥梁，通过 postMessage 机制在主网站和扩展 Content_Script 之间传递数据
- **History_Panel**: 投递历史面板，主网站上展示投递记录时间线的 UI 组件
- **Statistics_Display**: 统计展示，主网站上展示投递数据统计（总数、按公司分组、按时间分布等）的 UI 组件
- **Resume_Data**: 简历数据，存储在 chrome.storage.local 中的结构化简历 JSON 数据

## Requirements

### Requirement 1: 通用自动填充触发

**User Story:** 作为求职者，我希望在任何包含表单的网页上看到一个浮动填充按钮，以便我可以一键将简历数据填入表单，无论该网站是哪个招聘平台或公司官网。

#### Acceptance Criteria

1. WHEN a page containing form input elements is loaded, THE Content_Script SHALL display the Autofill_Trigger as a floating button in the bottom-right corner of the viewport
2. WHEN the page does not contain any form input elements, THE Content_Script SHALL not display the Autofill_Trigger
3. WHEN the user clicks the Autofill_Trigger, THE Content_Script SHALL retrieve Resume_Data from chrome.storage.local and initiate the field matching process
4. IF Resume_Data is not available in chrome.storage.local, THEN THE Content_Script SHALL display a notification prompting the user to upload a resume through the extension popup
5. THE Autofill_Trigger SHALL be draggable so that the user can reposition it to avoid overlapping with page content
6. THE Autofill_Trigger SHALL maintain a z-index high enough to remain visible above all page elements
7. WHILE the Autofill_Trigger is displayed, THE Content_Script SHALL update the Autofill_Trigger visibility when the page DOM changes to add or remove form elements

### Requirement 2: 智能字段匹配

**User Story:** 作为求职者，我希望插件能够智能识别任意网站表单中的字段含义，即使不同网站使用不同的字段命名方式，也能正确匹配我的简历数据。

#### Acceptance Criteria

1. WHEN autofill is triggered, THE Field_Matcher SHALL analyze each input element's name attribute, id attribute, placeholder text, aria-label attribute, and associated label element text to determine the field purpose
2. THE Field_Matcher SHALL support matching the following field categories: name (姓名), phone (电话), email (邮箱), education (学历/学校), major (专业), degree (学位), graduation date (毕业时间), work experience (工作经验), company (公司), position (职位/岗位), skills (技能), and self-introduction (自我介绍)
3. THE Field_Matcher SHALL support both Chinese and English keyword matching for each field category
4. WHEN multiple attributes of an input element provide conflicting signals, THE Field_Matcher SHALL prioritize in the following order: label text, aria-label, placeholder, name attribute, id attribute
5. WHEN a field cannot be matched with a confidence score above 60 percent, THE Field_Matcher SHALL skip that field and not fill it
6. THE Field_Matcher SHALL detect select dropdown options and match Resume_Data values to the closest available option
7. WHEN a form field has a maxlength attribute, THE Field_Matcher SHALL truncate the fill value to respect the constraint

### Requirement 3: 填充确认与反馈

**User Story:** 作为求职者，我希望在自动填充完成后能看到填充结果的摘要，以便我确认数据是否正确填入，并在需要时撤销操作。

#### Acceptance Criteria

1. WHEN autofill completes, THE Fill_Confirmation_UI SHALL display a floating summary panel showing the number of fields successfully filled and the number of fields skipped
2. THE Fill_Confirmation_UI SHALL list each filled field with its field name and the value that was filled
3. WHEN the user clicks the undo button in the Fill_Confirmation_UI, THE Content_Script SHALL restore all filled fields to their previous values
4. THE Fill_Confirmation_UI SHALL automatically dismiss after 10 seconds if the user does not interact with it
5. THE Content_Script SHALL trigger appropriate input, change, and blur events on each filled field to ensure the target website's form validation logic is activated
6. WHEN a field is of type select, THE Content_Script SHALL dispatch a change event after setting the selected option
7. IF autofill encounters an error on a specific field, THEN THE Content_Script SHALL skip that field, continue filling remaining fields, and report the skipped field in the Fill_Confirmation_UI

### Requirement 4: 记录投递浮动按钮

**User Story:** 作为求职者，我希望在完成表单填充后看到一个"记录本次投递"按钮，以便我可以手动确认并记录这次求职投递。

#### Acceptance Criteria

1. WHEN autofill completes successfully, THE Content_Script SHALL display the Record_Button as a floating button near the Autofill_Trigger
2. THE Record_Button SHALL display the text "记录本次投递"
3. WHEN the user clicks the Record_Button, THE Content_Script SHALL capture the current page URL, page title, current date, and attempt to extract company name and position name from the page content
4. WHEN the user clicks the Record_Button, THE Content_Script SHALL store the captured data as a new Application_Record in chrome.storage.local
5. WHEN the Application_Record is successfully stored, THE Content_Script SHALL display a success notification and hide the Record_Button
6. THE Record_Button SHALL remain visible until the user clicks it, dismisses it, or navigates away from the page
7. IF the user does not click the Record_Button and navigates away, THEN THE Content_Script SHALL not create an Application_Record

### Requirement 5: 投递记录数据模型与存储

**User Story:** 作为求职者，我希望每条投递记录包含完整的投递信息，以便我后续能够清晰地回顾每次投递的详情。

#### Acceptance Criteria

1. THE Application_Storage SHALL store each Application_Record with the following fields: id (unique identifier), date (ISO 8601 format timestamp), url (full page URL), pageTitle (document title), company (company name), position (position or job title), status (application status string)
2. THE Application_Storage SHALL generate a unique id for each Application_Record using a UUID or timestamp-based identifier
3. THE Application_Storage SHALL set the initial status of each Application_Record to "已投递"
4. THE Application_Storage SHALL store all Application_Records as an array under the key "applicationRecords" in chrome.storage.local
5. WHEN a new Application_Record is added, THE Application_Storage SHALL append it to the existing array without overwriting previous records
6. THE Application_Storage SHALL support storing at least 500 Application_Records without performance degradation
7. WHEN the user edits an Application_Record, THE Application_Storage SHALL update only the modified fields and preserve all other field values

### Requirement 6: 投递记录公司与职位提取

**User Story:** 作为求职者，我希望插件能够自动从页面中提取公司名称和职位名称，以减少我手动输入的工作量。

#### Acceptance Criteria

1. WHEN the Record_Button is clicked, THE Content_Script SHALL attempt to extract the company name from the page title, URL domain, or page heading elements
2. WHEN the Record_Button is clicked, THE Content_Script SHALL attempt to extract the position name from the page title, form heading, or job description elements
3. WHEN automatic extraction fails to identify the company name, THE Content_Script SHALL use the URL domain as a fallback value for the company field
4. WHEN automatic extraction fails to identify the position name, THE Content_Script SHALL use the page title as a fallback value for the position field
5. WHEN the Record_Button is clicked, THE Content_Script SHALL display a brief confirmation dialog showing the extracted company and position, allowing the user to edit before saving
6. THE Content_Script SHALL store the user-confirmed values in the Application_Record

### Requirement 7: 网站集成 - 读取投递历史

**User Story:** 作为求职者，我希望在"小小求职拿下"主网站上能够读取扩展中存储的投递记录，以便我在一个集中的界面管理所有投递信息。

#### Acceptance Criteria

1. WHEN the Website_Bridge receives a message with action "getApplicationRecords", THE Content_Script SHALL retrieve all Application_Records from chrome.storage.local and send them back via postMessage
2. WHEN the Website_Bridge receives a message with action "updateApplicationRecord", THE Content_Script SHALL update the specified Application_Record in chrome.storage.local and confirm the update via postMessage
3. WHEN the Website_Bridge receives a message with action "deleteApplicationRecord", THE Content_Script SHALL remove the specified Application_Record from chrome.storage.local and confirm the deletion via postMessage
4. THE Content_Script SHALL validate that postMessage requests originate from the authorized website domains defined in the manifest externally_connectable configuration
5. WHEN the website requests Application_Records, THE Content_Script SHALL return the records sorted by date in descending order
6. THE Website_Bridge communication SHALL use the existing message format with type "RESUME_EXT_MSG" and respond with type "RESUME_EXT_RESPONSE"

### Requirement 8: 网站 UI - 投递历史时间线面板

**User Story:** 作为求职者，我希望在主网站上看到一个清晰的投递历史时间线，以便我可以直观地了解自己的求职进度。

#### Acceptance Criteria

1. THE History_Panel SHALL display all Application_Records as a vertical timeline sorted by date in descending order
2. THE History_Panel SHALL display the following information for each Application_Record: date, company name, position name, page URL as a clickable link, and current status
3. THE History_Panel SHALL provide a status dropdown for each Application_Record allowing the user to update the status to one of: "已投递", "待面试", "已面试", "已录用", "已拒绝"
4. WHEN the user changes an Application_Record status, THE History_Panel SHALL send an update message to the extension via Website_Bridge and reflect the change in the UI
5. THE History_Panel SHALL provide a delete button for each Application_Record
6. WHEN the user clicks the delete button, THE History_Panel SHALL display a confirmation dialog before sending a delete message to the extension via Website_Bridge
7. THE History_Panel SHALL display a loading state while fetching Application_Records from the extension
8. IF the extension is not detected, THEN THE History_Panel SHALL display a message prompting the user to install or enable the extension

### Requirement 9: 网站 UI - 投递统计展示

**User Story:** 作为求职者，我希望在主网站上看到投递数据的统计信息，以便我了解自己的求职活动概况和趋势。

#### Acceptance Criteria

1. THE Statistics_Display SHALL show the total number of Application_Records
2. THE Statistics_Display SHALL show the count of Application_Records grouped by status
3. THE Statistics_Display SHALL show the count of Application_Records grouped by company
4. THE Statistics_Display SHALL show the distribution of Application_Records over the past 30 days as a simple bar chart or list
5. WHEN Application_Records are updated or deleted, THE Statistics_Display SHALL recalculate and refresh the displayed statistics
6. THE Statistics_Display SHALL use the sakura pink color scheme consistent with the main website design

### Requirement 10: 投递记录手动编辑与删除

**User Story:** 作为求职者，我希望能够手动编辑或删除投递记录，以便我可以修正错误信息或移除不需要的记录。

#### Acceptance Criteria

1. WHEN the user clicks the edit button on an Application_Record in the History_Panel, THE History_Panel SHALL display an inline edit form with the current field values pre-filled
2. THE inline edit form SHALL allow editing of the following fields: company, position, status, and pageTitle
3. THE inline edit form SHALL not allow editing of the date and url fields to preserve record integrity
4. WHEN the user saves the edited Application_Record, THE History_Panel SHALL send an update message to the extension via Website_Bridge and update the display
5. WHEN the user confirms deletion of an Application_Record, THE History_Panel SHALL send a delete message to the extension via Website_Bridge, remove the record from the display, and update the Statistics_Display
6. WHEN a deletion or update fails, THE History_Panel SHALL display an error notification and restore the previous state in the UI
