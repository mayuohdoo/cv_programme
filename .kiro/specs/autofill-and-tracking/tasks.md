# Implementation Plan: Autofill and Tracking

## Overview

实现通用自动填充与投递追踪功能，增强现有 Chrome 扩展（chrome-extension-mvp/）。使用 vanilla JavaScript，无构建工具。主要工作包括：重构 content.js 中的字段匹配逻辑为智能匹配引擎、添加浮动 UI（Shadow DOM 隔离）、实现投递记录存储与 CRUD、通过 postMessage 桥接在主网站展示投递历史和统计。

## Tasks

- [ ] 1. 实现智能字段匹配引擎（FieldMatcher）
  - [ ] 1.1 创建 `chrome-extension-mvp/field-matcher.js` 模块
    - 实现中英双语关键词库（name、phone、email、education、major、degree、graduationDate、workExperience、company、position、skills、introduction）
    - 实现属性优先级匹配逻辑：label > aria-label > placeholder > name > id
    - 实现置信度评分算法（0-100），低于 60% 的字段不匹配
    - 实现 `analyzeFormFields(root)` 函数返回所有匹配结果
    - 实现 `matchField(element)` 函数对单个元素进行匹配
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 1.2 编写 FieldMatcher 属性测试
    - **Property 2: Field matching correctness** — 包含已知关键词的元素应返回正确类别且置信度 ≥ 60%
    - **Property 3: Attribute priority ordering** — 不同属性冲突时按优先级返回
    - **Property 4: Low-confidence fields excluded** — 无关键词的元素不出现在结果中
    - **Validates: Requirements 2.1, 2.3, 2.4, 2.5**

- [ ] 2. 实现自动填充引擎（AutofillEngine）
  - [ ] 2.1 创建 `chrome-extension-mvp/autofill-engine.js` 模块
    - 实现 `fill(resumeData)` 函数，调用 FieldMatcher 获取匹配结果后逐字段填充
    - 文本输入：设置 value 后触发 input、change、blur 事件
    - Select 下拉框：模糊匹配选项文本，选中最接近的选项后触发 change 事件
    - 尊重 maxlength 约束，自动截断填充值
    - 保存填充前原始值快照用于撤销
    - 实现 `undo()` 函数恢复所有字段到填充前状态
    - 跳过填充出错的字段，继续填充其余字段，记录跳过原因
    - _Requirements: 2.6, 2.7, 3.3, 3.5, 3.6, 3.7_

  - [ ]* 2.2 编写 AutofillEngine 属性测试
    - **Property 5: Select option closest match** — select 元素应选中最接近简历值的选项
    - **Property 6: Maxlength invariant** — 填充值长度不超过 maxlength
    - **Property 7: Fill-undo round trip** — 填充后撤销应恢复原始值
    - **Property 8: Events dispatched on fill** — 填充后应触发 input/change/blur 事件
    - **Property 9: Error resilience** — 部分字段出错不影响其他字段填充
    - **Validates: Requirements 2.6, 2.7, 3.3, 3.5, 3.6, 3.7**

- [ ] 3. 实现浮动 UI 管理（FloatingUI + Shadow DOM）
  - [ ] 3.1 创建 `chrome-extension-mvp/floating-ui.js` 模块
    - 使用 Shadow DOM 创建隔离的 UI 容器，z-index 设为 2147483647
    - 实现 Autofill_Trigger 浮动按钮（底部右侧），支持拖拽重定位
    - 实现 MutationObserver 监听 DOM 变化，动态显示/隐藏触发按钮（页面有表单时显示，无表单时隐藏）
    - 实现填充确认面板（显示填充/跳过字段数量和详情列表，含撤销按钮，10 秒自动消失）
    - 实现 Record_Button（"记录本次投递"按钮），填充成功后显示
    - 实现通知消息组件（success/error/info 类型）
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7, 3.1, 3.2, 3.4, 4.1, 4.2, 4.6_

  - [ ]* 3.2 编写 FloatingUI 属性测试
    - **Property 1: Trigger visibility equals form presence** — 有表单元素时按钮可见，无表单时不可见
    - **Validates: Requirements 1.1, 1.2**

- [ ] 4. Checkpoint - 确保自动填充核心功能完整
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. 实现投递记录存储层（ApplicationStorage）
  - [ ] 5.1 创建 `chrome-extension-mvp/application-storage.js` 模块
    - 实现 `getRecords()` 函数：从 chrome.storage.local 读取 applicationRecords，按日期降序排序返回
    - 实现 `addRecord(record)` 函数：使用 crypto.randomUUID() 生成 ID，追加到数组，不覆盖已有记录
    - 实现 `updateRecord(id, updates)` 函数：仅更新指定字段，保留其他字段，禁止修改 date 和 url
    - 实现 `deleteRecord(id)` 函数：从数组中移除指定记录
    - 初始 status 设为 "已投递"
    - 存储 key 为 "applicationRecords"
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 5.2 编写 ApplicationStorage 属性测试
    - **Property 10: Record structural completeness** — 新记录包含所有必需字段且初始状态为"已投递"
    - **Property 11: Unique ID generation** — N 条记录的 ID 互不相同
    - **Property 12: Append preserves existing records** — 添加新记录不影响已有记录
    - **Property 13: Partial update preserves unmodified fields** — 部分更新不改变未修改字段，date/url 不可修改
    - **Property 16: Records sorted by date descending** — 返回记录按日期降序排列
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.5, 5.7, 7.5**

- [ ] 6. 实现公司/职位信息提取（InfoExtractor）与记录投递流程
  - [ ] 6.1 创建 `chrome-extension-mvp/info-extractor.js` 模块
    - 实现 `extractCompany()` 函数：从 document.title（"职位 - 公司"格式）、h1/h2 元素、URL domain 中提取公司名
    - 实现 `extractPosition()` 函数：从 document.title、表单附近 heading、含"岗位"/"职位"关键词的元素中提取职位名
    - 提取失败时使用 URL domain / page title 作为 fallback，确保始终返回非空字符串
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 6.2 实现记录投递确认对话框
    - 点击 Record_Button 后显示确认对话框，展示提取的公司和职位信息
    - 允许用户编辑公司和职位后保存
    - 保存成功后显示成功通知并隐藏 Record_Button
    - _Requirements: 4.3, 4.4, 4.5, 6.5, 6.6_

  - [ ]* 6.3 编写 InfoExtractor 属性测试
    - **Property 14: Extraction always returns non-empty** — 任何有效 URL 和 title 的页面，提取结果始终非空
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [ ] 7. 重构 content.js 集成所有模块
  - [ ] 7.1 重构 `chrome-extension-mvp/content.js`
    - 移除旧的 fillFormFields/getFieldName/matchResumeField/fillField 函数
    - 引入 field-matcher.js、autofill-engine.js、floating-ui.js、application-storage.js、info-extractor.js
    - 页面加载时检测表单元素，有表单则显示 Autofill_Trigger
    - 点击 Autofill_Trigger 时：获取 Resume_Data → 调用 AutofillEngine.fill() → 显示确认面板 → 显示 Record_Button
    - 无简历数据时显示提示通知
    - 保留现有 postMessage 桥接逻辑，扩展支持投递记录相关 action
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 3.1, 4.1_

  - [ ] 7.2 更新 `chrome-extension-mvp/manifest.json`
    - 在 content_scripts.js 数组中添加新模块文件（field-matcher.js、autofill-engine.js、floating-ui.js、application-storage.js、info-extractor.js）
    - 确保加载顺序正确（依赖模块在前）
    - _Requirements: 1.1_

- [ ] 8. Checkpoint - 确保扩展端功能完整
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. 扩展 postMessage 桥接支持投递记录 CRUD
  - [ ] 9.1 扩展 content.js 中的 postMessage 监听器
    - 新增处理 `getApplicationRecords` action：调用 ApplicationStorage.getRecords() 返回所有记录
    - 新增处理 `updateApplicationRecord` action：调用 ApplicationStorage.updateRecord() 更新记录
    - 新增处理 `deleteApplicationRecord` action：调用 ApplicationStorage.deleteRecord() 删除记录
    - 验证 event.origin 是否在 manifest externally_connectable.matches 配置的域名列表中
    - 使用现有 `RESUME_EXT_MSG` / `RESUME_EXT_RESPONSE` 消息格式
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 9.2 编写 WebsiteBridge 属性测试
    - **Property 15: Origin validation** — 仅处理来自授权域名的消息，忽略未授权来源
    - **Validates: Requirements 7.4**

- [ ] 10. 实现网站端投递历史面板（HistoryPanel）
  - [ ] 10.1 在主网站 `frontend/index.html` 中添加投递历史面板 UI
    - 添加投递历史 section（垂直时间线布局，按日期降序）
    - 每条记录显示：日期、公司名、职位名、URL 链接、状态
    - 状态下拉框（已投递/待面试/已面试/已录用/已拒绝）
    - 编辑按钮（内联编辑 company、position、status、pageTitle）
    - 删除按钮（带确认对话框）
    - 加载状态展示
    - 扩展未检测到时显示安装提示
    - 使用樱花粉配色方案
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ] 10.2 实现投递历史面板的 JavaScript 逻辑
    - 通过 postMessage 向扩展请求 applicationRecords 数据
    - 渲染时间线列表
    - 实现状态更新（发送 updateApplicationRecord 消息）
    - 实现内联编辑（保存时发送 updateApplicationRecord 消息）
    - 实现删除（确认后发送 deleteApplicationRecord 消息）
    - 操作失败时显示错误通知并恢复 UI 状态
    - _Requirements: 8.4, 8.5, 8.6, 10.4, 10.5, 10.6_

- [ ] 11. 实现网站端投递统计展示（StatisticsDisplay）
  - [ ] 11.1 在主网站中添加统计展示 UI 和逻辑
    - 显示投递总数
    - 按状态分组计数
    - 按公司分组计数
    - 近 30 天投递分布（简单柱状图或列表）
    - 记录更新/删除时自动刷新统计
    - 使用樱花粉配色方案
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 11.2 编写 Statistics 属性测试
    - **Property 17: Statistics group sums equal total** — 按状态/公司分组的计数之和等于总数
    - **Property 18: 30-day distribution correctness** — 30 天分布计数之和等于该时间段内的记录数
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

- [ ] 12. Final checkpoint - 确保所有功能集成完整
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 所有实现使用 vanilla JavaScript，无构建工具，文件直接在 chrome-extension-mvp/ 目录下
- 新模块通过 manifest.json content_scripts 数组按顺序加载（无 import/export）
- 网站端代码在 frontend/index.html 中内联或引用独立 JS 文件
- 浮动 UI 使用 Shadow DOM 隔离样式，避免与宿主页面冲突
- postMessage 通信复用现有 RESUME_EXT_MSG / RESUME_EXT_RESPONSE 格式
- Property tests 使用 fast-check 库，测试文件放在 extension/ 目录下（利用已有 Jest 配置）
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "5.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "5.2", "6.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "6.2", "6.3"] },
    { "id": 3, "tasks": ["3.2", "7.1"] },
    { "id": 4, "tasks": ["7.2", "9.1"] },
    { "id": 5, "tasks": ["9.2", "10.1"] },
    { "id": 6, "tasks": ["10.2", "11.1"] },
    { "id": 7, "tasks": ["11.2"] }
  ]
}
```
