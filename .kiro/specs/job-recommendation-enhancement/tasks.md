# Implementation Plan: 岗位推荐增强功能

## Overview

本实现计划将为现有的岗位推荐系统添加三个核心维度：匹配度百分比（match_score）、缺失技能分析（missing_skills）和职业成长路径（career_path）。实现将分为后端AI Prompt优化、数据验证、前端渲染三个主要部分，确保向后兼容并提供优雅的错误降级。

## Tasks

- [x] 1. 后端：扩展AI Prompt以生成新增字段
  - 修改 `backend/main.py` 中的 `_parse_resume_with_ai()` 函数
  - 在现有的 `job_recommendations` 部分添加三个新字段的生成规则：
    - `match_score`: 0-100整数，基于技能(40%)、经验(25%)、教育(20%)、MBTI(15%)综合计算
    - `missing_skills`: 0-5个字符串数组，列出候选人缺失的关键技能
    - `career_path`: 60-100字字符串，描述2-4个职业发展阶段
  - 为每个字段提供清晰的生成规则和示例
  - 强调基于简历内容分析，避免模板化生成
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.6, 5.1, 5.2, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2. 后端：实现数据验证与默认值处理
  - [x] 2.1 创建数据验证函数 `_validate_and_set_defaults()`
    - 验证 `match_score` 是否为0-100的整数，无效时使用默认值70
    - 验证 `missing_skills` 是否为数组，过滤无效元素，限制最多5个
    - 验证 `career_path` 是否为字符串，截断超过100字符的内容
    - 为所有无效或缺失字段设置合理默认值
    - 记录验证警告日志，便于调试
    - _Requirements: 7.5, 10.1, 10.2, 10.3, 10.7_
  
  - [ ]* 2.2 编写数据验证函数的单元测试
    - 测试有效值的正常处理
    - 测试无效值的默认值替换
    - 测试边界情况（0, 100, 空数组, 超长字符串）
    - 测试类型错误处理
    - _Requirements: 7.5, 10.1, 10.2, 10.3_

- [x] 3. 后端：集成验证函数到上传接口
  - 在 `upload_resume()` 函数中调用 `_validate_and_set_defaults()`
  - 在AI解析后、返回响应前执行验证
  - 确保所有岗位推荐对象都包含新增字段
  - 添加错误日志记录
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.4_

- [ ] 4. Checkpoint - 后端功能验证
  - 使用测试简历验证AI能够生成新增字段
  - 检查数据验证函数是否正确处理无效值
  - 确认API响应包含完整的数据结构
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. 前端：更新CSS样式系统
  - 在 `frontend/index.html` 的 `<style>` 部分添加新样式
  - [x] 5.1 添加匹配度徽章样式
    - `.match-badge-wrapper`: flex布局，垂直排列
    - `.match-percentage`: 24px字体，粗体800，樱花粉主色
    - `.match-badge`: 小标签样式，圆角999px
    - `.match-high`: 绿色背景 (#dcfce7)，深绿文字 (#15803d)
    - `.match-mid`: 黄色背景 (#fef9c3)，深黄文字 (#a16207)
    - `.match-low`: 灰色背景，灰色文字
    - _Requirements: 1.3, 1.4, 1.5, 6.1, 6.2, 6.5_
  
  - [x] 5.2 添加信息分组样式
    - `.job-section`: flex布局，浅樱花粉背景，圆角，12px内边距
    - `.section-icon`: 18px emoji图标
    - `.section-title`: 11px小标题，粗体，大写，灰色
    - `.section-content`: 内容区域
    - _Requirements: 6.1, 6.2, 6.5_
  
  - [x] 5.3 添加技能标签样式
    - `.skill-tags`: flex布局，自动换行，6px间距
    - `.skill-tag`: 白色背景，樱花粉边框1.5px，圆角999px，11px字体
    - `.skill-complete`: 完全匹配提示样式，绿色文字
    - _Requirements: 3.4, 3.5, 6.1, 6.2_
  
  - [x] 5.4 添加成长路径样式
    - `.career-path`: flex布局，自动换行，6px间距
    - `.path-stage`: 职业阶段文字，粗体600
    - `.path-arrow`: 箭头符号，樱花粉色，粗体700
    - _Requirements: 5.5, 6.1, 6.2_
  
  - [x] 5.5 添加响应式设计
    - 900px断点：岗位网格从3列变为2列
    - 560px断点：岗位网格变为1列，匹配度字体缩小到20px
    - 小屏幕：成长路径垂直排列，箭头旋转90度
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 6. 前端：实现辅助函数
  - [x] 6.1 创建匹配度等级判断函数 `getMatchLevel(score)`
    - score >= 80: 返回 { level: '高匹配', class: 'match-high' }
    - score >= 60: 返回 { level: '中匹配', class: 'match-mid' }
    - score < 60: 返回 { level: '低匹配', class: 'match-low' }
    - _Requirements: 1.3, 1.4, 1.5_
  
  - [x] 6.2 创建缺失技能渲染函数 `renderMissingSkills(skills)`
    - 如果数组为空或不存在，返回"技能完全匹配 ✓"
    - 否则，将每个技能渲染为 `.skill-tag` 元素
    - 限制最多显示5个技能
    - _Requirements: 3.4, 3.5_
  
  - [x] 6.3 创建成长路径渲染函数 `renderCareerPath(pathText)`
    - 如果为空字符串，返回空（不显示该模块）
    - 按箭头符号（→ 或 >）分割文本为阶段
    - 将每个阶段渲染为 `.path-stage`，中间插入 `.path-arrow`
    - _Requirements: 5.4, 5.5, 10.6_
  
  - [x] 6.4 创建数据验证函数 `validateJobData(job)`
    - 验证必需字段（title, industry）是否存在
    - 修正 match_score 到0-100范围，无效时使用70
    - 修正 missing_skills 为数组，过滤无效元素
    - 修正 career_path 为字符串
    - 返回验证结果（true/false）
    - _Requirements: 7.5, 10.4_

- [x] 7. 前端：更新岗位卡片渲染逻辑
  - 修改 `frontend/index.html` 中的岗位卡片渲染代码（约1170-1220行）
  - [x] 7.1 更新卡片头部布局
    - 将匹配度从小标签改为大徽章设计
    - 使用 `.match-badge-wrapper` 包裹百分比和等级标签
    - 显示 `match_score` 百分比（格式："85%"）
    - 根据分数显示对应的匹配等级标签
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 6.1_
  
  - [x] 7.2 添加推荐原因模块
    - 使用 `.job-section` 布局
    - 添加💡图标和"推荐原因"标题
    - 显示 `reason` 字段内容
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2_
  
  - [x] 7.3 添加缺失技能模块
    - 使用 `.job-section` 布局
    - 添加📚图标和"需要学习"标题
    - 调用 `renderMissingSkills()` 渲染技能标签
    - 空数组时显示"技能完全匹配 ✓"
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.1, 6.2_
  
  - [x] 7.4 添加成长路径模块
    - 使用 `.job-section` 布局
    - 添加🚀图标和"成长路径"标题
    - 调用 `renderCareerPath()` 渲染职业阶段
    - 空字符串时隐藏整个模块
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2_
  
  - [x] 7.5 保留现有功能
    - 保留薪资范围显示（salary_range）
    - 保留行业标签显示（industry）
    - 保留点击跳转BOSS直聘功能
    - 保留卡片悬停效果
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.6_

- [x] 8. 前端：添加错误处理
  - 在卡片渲染函数中添加 try-catch 块
  - 验证数据完整性，缺失必需字段时跳过该卡片
  - 在控制台记录渲染错误和数据验证警告
  - 所有卡片渲染失败时显示友好提示
  - _Requirements: 10.4, 10.5, 10.6_

- [ ] 9. Checkpoint - 前端功能验证
  - 使用模拟数据测试卡片渲染
  - 验证所有新增模块正确显示
  - 测试响应式布局在不同屏幕尺寸下的表现
  - 验证错误降级逻辑（缺失字段、无效值）
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 10. 集成测试：完整流程验证
  - 准备多份测试简历（应届生、1-3年经验、5年以上经验）
  - 上传简历并验证AI生成新增字段
  - 验证前端正确渲染所有新增信息
  - 测试边界情况（空技能列表、极长成长路径）
  - 验证响应式布局在移动端的表现
  - _Requirements: 1.1-1.6, 3.1-3.6, 5.1-5.6, 9.1-9.5_

- [ ]* 11. 性能测试与优化
  - 测试AI解析时间（目标：≤10秒）
  - 测试前端渲染时间（目标：≤100毫秒）
  - 验证卡片高度自适应和滚动功能
  - 优化CSS性能（避免重排重绘）
  - _Requirements: 6.3, 6.4_

- [x] 12. Final checkpoint - 完整功能验证
  - 验证所有需求的验收标准
  - 确认向后兼容性（现有功能未受影响）
  - 验证错误处理和降级逻辑
  - 检查代码风格和注释
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- 任务标记 `*` 的为可选任务，可跳过以加快MVP交付
- 每个任务都引用了具体的需求编号，确保可追溯性
- Checkpoint任务确保增量验证，及时发现问题
- 前端修改集中在 `frontend/index.html` 的1170-1220行附近
- 后端修改集中在 `backend/main.py` 的 `_parse_resume_with_ai()` 函数
- 保持现有樱花粉配色系统和设计风格
- 所有新增字段都有合理的默认值和错误降级策略
