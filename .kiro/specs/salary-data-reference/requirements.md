# Requirements Document

## Introduction

本文档定义了简历解析系统的行业薪资数据参考功能。该功能在岗位推荐卡片中显示基于城市的薪资范围信息，并支持用户点击跳转到招聘网站查看具体职位描述。薪资数据由AI模型根据岗位、行业和城市信息推断生成，无需额外的数据库或外部API。

## Glossary

- **System**: 简历解析系统，包含前端界面和后端API服务
- **Job_Recommendation_Card**: 岗位推荐卡片，显示推荐岗位的UI组件
- **Salary_Range**: 薪资范围，格式为"最低薪资-最高薪资K"（如：15-25K）
- **AI_Model**: 智谱AI GLM-4-Flash模型，用于推断薪资数据
- **Resume**: 用户上传的简历文档
- **City_Info**: 从简历中提取的城市信息
- **Job_Portal**: 招聘网站，如Boss直聘、拉勾网等
- **Backend_API**: FastAPI后端服务，处理简历解析和数据生成
- **Frontend_UI**: HTML/CSS/JavaScript前端界面

## Requirements

### Requirement 1: 显示薪资范围信息

**User Story:** 作为求职者，我希望在岗位推荐卡片中看到薪资范围，以便快速了解该岗位的薪资水平。

#### Acceptance Criteria

1. WHEN THE Backend_API 返回岗位推荐数据，THE System SHALL 在每个 Job_Recommendation_Card 中显示 Salary_Range
2. THE Salary_Range SHALL 以"最低薪资-最高薪资K"格式显示（如：15-25K）
3. THE Salary_Range SHALL 显示在岗位标题和行业信息附近的显著位置
4. THE Frontend_UI SHALL 使用与现有设计一致的视觉样式显示 Salary_Range
5. WHEN 岗位推荐数据包含6个岗位，THE System SHALL 为所有6个岗位显示 Salary_Range

### Requirement 2: 基于城市的薪资推断

**User Story:** 作为求职者，我希望看到基于我所在城市的薪资数据，以便获得更准确的薪资参考。

#### Acceptance Criteria

1. WHEN THE Resume 包含 City_Info，THE AI_Model SHALL 基于该城市推断 Salary_Range
2. WHEN THE Resume 不包含 City_Info，THE AI_Model SHALL 基于全国平均水平推断 Salary_Range
3. THE AI_Model SHALL 根据岗位标题、行业和城市信息生成合理的 Salary_Range
4. THE Salary_Range SHALL 反映不同城市的薪资水平差异（如：一线城市高于二三线城市）
5. THE AI_Model SHALL 为每个岗位推荐生成独立的 Salary_Range

### Requirement 3: 跳转到招聘网站

**User Story:** 作为求职者，我希望点击岗位卡片后能跳转到招聘网站，以便查看具体的职位描述和申请岗位。

#### Acceptance Criteria

1. WHEN 用户点击 Job_Recommendation_Card，THE System SHALL 在新标签页中打开 Job_Portal 搜索页面
2. THE System SHALL 将岗位标题作为搜索关键词传递给 Job_Portal
3. THE System SHALL 支持至少一个主流 Job_Portal（Boss直聘或拉勾网）
4. THE Job_Recommendation_Card SHALL 显示可点击的视觉提示（如：鼠标悬停效果）
5. WHEN THE Resume 包含 City_Info，THE System SHALL 将城市信息作为搜索条件传递给 Job_Portal

### Requirement 4: AI模型集成

**User Story:** 作为系统开发者，我希望使用现有的智谱AI模型生成薪资数据，以便避免增加额外的技术依赖。

#### Acceptance Criteria

1. THE Backend_API SHALL 使用智谱AI GLM-4-Flash模型生成 Salary_Range
2. THE Backend_API SHALL 在现有的简历解析API响应中包含 Salary_Range 数据
3. THE Backend_API SHALL 不增加新的数据库表或外部API依赖
4. THE AI_Model SHALL 在单次API调用中生成所有6个岗位的 Salary_Range
5. WHEN THE AI_Model 生成失败，THE Backend_API SHALL 返回默认 Salary_Range 或省略该字段

### Requirement 5: 数据格式和API响应

**User Story:** 作为前端开发者，我希望后端API返回结构化的薪资数据，以便在前端正确显示。

#### Acceptance Criteria

1. THE Backend_API SHALL 在 job_recommendations 数组的每个对象中添加 salary_range 字段
2. THE salary_range 字段 SHALL 包含 min_salary（整数）和 max_salary（整数）两个子字段
3. THE salary_range 字段 SHALL 包含 city（字符串）子字段，表示薪资对应的城市
4. THE Backend_API SHALL 保持现有的 title、industry、reason、match_level 字段不变
5. THE Backend_API SHALL 返回有效的JSON格式数据

### Requirement 6: UI/UX设计一致性

**User Story:** 作为用户，我希望新增的薪资信息与现有界面风格一致，以便获得流畅的使用体验。

#### Acceptance Criteria

1. THE Frontend_UI SHALL 使用现有的CSS变量和设计系统样式显示 Salary_Range
2. THE Salary_Range SHALL 使用适当的字体大小和颜色，确保可读性
3. THE Job_Recommendation_Card SHALL 保持现有的布局结构和间距
4. THE Frontend_UI SHALL 在移动设备上正确显示 Salary_Range
5. THE Frontend_UI SHALL 为跳转链接添加视觉反馈（如：悬停效果、点击效果）

### Requirement 7: 错误处理和降级

**User Story:** 作为系统管理员，我希望系统在薪资数据生成失败时能够优雅降级，以便不影响核心功能。

#### Acceptance Criteria

1. WHEN THE AI_Model 无法生成 Salary_Range，THE System SHALL 显示岗位推荐但不显示薪资信息
2. WHEN THE Backend_API 响应中缺少 salary_range 字段，THE Frontend_UI SHALL 正常显示其他岗位信息
3. WHEN 跳转链接生成失败，THE System SHALL 记录错误但不阻止页面渲染
4. THE System SHALL 不因薪资数据问题导致整个岗位推荐功能失败
5. WHEN 发生错误，THE System SHALL 在浏览器控制台记录详细错误信息以便调试
