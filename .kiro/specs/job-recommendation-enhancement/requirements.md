# 需求文档：岗位推荐增强功能

## 简介

本功能旨在增强现有的岗位推荐系统，为用户提供更详细、更有价值的岗位信息。通过添加匹配度百分比、缺失技能分析和成长路径说明，帮助求职者更全面地了解每个推荐岗位，做出更明智的职业选择。

## 术语表

- **Job_Recommendation_System**: 岗位推荐系统，负责根据候选人简历生成岗位推荐列表
- **AI_Analyzer**: AI 分析器，使用智谱 AI (GLM-4-flash) 进行简历分析和岗位推荐
- **Frontend_Display**: 前端展示模块，负责在用户界面展示岗位推荐信息
- **Match_Score**: 匹配度分数，表示候选人与岗位的匹配程度（0-100 的整数）
- **Skill_Gap**: 技能缺口，候选人当前技能与岗位要求之间的差距
- **Career_Path**: 职业成长路径，该岗位的职业发展方向和晋升路线
- **Recommendation_Card**: 推荐卡片，前端展示单个岗位推荐的 UI 组件

## 需求

### 需求 1：匹配度百分比计算与展示

**用户故事：** 作为求职者，我希望看到每个推荐岗位的精确匹配度百分比，以便快速评估岗位的适合程度。

#### 验收标准

1. WHEN AI_Analyzer 分析候选人简历和岗位信息时，THE Job_Recommendation_System SHALL 计算 0-100 之间的整数匹配度分数
2. THE Match_Score SHALL 基于以下因素综合计算：技能匹配度（40%权重）、教育背景匹配度（20%权重）、工作经验匹配度（25%权重）、MBTI 人格匹配度（15%权重）
3. WHEN Match_Score 大于等于 80 时，THE Frontend_Display SHALL 显示"高匹配"标签和绿色视觉样式
4. WHEN Match_Score 在 60-79 之间时，THE Frontend_Display SHALL 显示"中匹配"标签和黄色视觉样式
5. WHEN Match_Score 小于 60 时，THE Frontend_Display SHALL 显示"低匹配"标签和灰色视觉样式
6. THE Frontend_Display SHALL 在 Recommendation_Card 的显著位置展示匹配度百分比（格式："85%"）

### 需求 2：推荐原因保留与优化

**用户故事：** 作为求职者，我希望继续看到岗位推荐原因，以便理解为什么这个岗位适合我。

#### 验收标准

1. THE Job_Recommendation_System SHALL 保留现有的推荐原因生成功能
2. THE AI_Analyzer SHALL 生成 30-50 字的推荐原因，结合候选人的技能、经验和 MBTI 特质
3. THE Frontend_Display SHALL 在 Recommendation_Card 中展示推荐原因文本
4. THE 推荐原因 SHALL 使用积极、鼓励的语气，突出候选人的优势

### 需求 3：缺失技能分析与展示

**用户故事：** 作为求职者，我希望了解每个岗位要求的技能中我还缺少哪些，以便有针对性地学习和提升。

#### 验收标准

1. WHEN AI_Analyzer 分析岗位要求时，THE Job_Recommendation_System SHALL 识别候选人简历中未体现的关键技能
2. THE Skill_Gap 列表 SHALL 包含 0-5 个缺失技能项
3. WHEN 候选人技能完全满足岗位要求时，THE Skill_Gap 列表 SHALL 为空数组
4. THE Frontend_Display SHALL 在 Recommendation_Card 中展示缺失技能列表，每个技能使用标签样式
5. WHEN Skill_Gap 列表为空时，THE Frontend_Display SHALL 显示"技能完全匹配 ✓"提示
6. THE 缺失技能 SHALL 按重要性排序，优先展示核心技能缺口

### 需求 4：薪资范围保留与展示

**用户故事：** 作为求职者，我希望继续看到岗位的薪资范围信息，以便评估经济回报。

#### 验收标准

1. THE Job_Recommendation_System SHALL 保留现有的薪资范围推断功能
2. THE 薪资范围 SHALL 包含最低月薪、最高月薪（单位：千元）和对应城市
3. THE AI_Analyzer SHALL 根据岗位名称、行业、城市和候选人背景推断 2024-2025 年的合理薪资范围
4. THE Frontend_Display SHALL 在 Recommendation_Card 中展示薪资范围（格式："15-25K"）和城市标签
5. WHEN 城市信息缺失时，THE Frontend_Display SHALL 显示"全国"作为默认城市

### 需求 5：成长路径说明生成与展示

**用户故事：** 作为求职者，我希望了解每个岗位的职业发展方向，以便规划长期职业路径。

#### 验收标准

1. WHEN AI_Analyzer 分析岗位时，THE Job_Recommendation_System SHALL 生成该岗位的 Career_Path 说明
2. THE Career_Path SHALL 包含 2-4 个职业发展阶段，描述从当前岗位到高级岗位的晋升路线
3. THE Career_Path 文本 SHALL 控制在 60-100 字以内，简洁明了
4. THE Career_Path SHALL 包含具体的岗位名称（如："初级产品经理 → 产品经理 → 高级产品经理 → 产品总监"）
5. THE Frontend_Display SHALL 在 Recommendation_Card 中展示成长路径，使用箭头或步骤样式
6. THE Career_Path SHALL 基于行业标准和岗位特点生成，确保真实可行

### 需求 6：前端展示布局优化

**用户故事：** 作为求职者，我希望新增的信息能够清晰、美观地展示在推荐卡片中，不影响阅读体验。

#### 验收标准

1. THE Recommendation_Card SHALL 采用垂直布局，从上到下依次展示：岗位标题、匹配度百分比、行业标签、薪资范围、推荐原因、缺失技能、成长路径
2. THE Frontend_Display SHALL 为每个信息模块使用视觉分隔（如间距、分割线或背景色）
3. THE Recommendation_Card 高度 SHALL 自适应内容，但不超过 400px
4. WHEN 内容超出卡片高度时，THE Frontend_Display SHALL 提供滚动或展开功能
5. THE Frontend_Display SHALL 保持现有的樱花粉配色系统和设计风格
6. THE Recommendation_Card SHALL 在鼠标悬停时显示边框高亮和阴影效果

### 需求 7：后端 API 数据结构扩展

**用户故事：** 作为开发者，我需要后端 API 返回扩展后的岗位推荐数据结构，以支持前端展示新增字段。

#### 验收标准

1. THE Job_Recommendation_System SHALL 在 `/upload` 接口的响应中扩展 `job_recommendations` 数组的每个对象
2. THE 岗位推荐对象 SHALL 包含以下字段：`title`（字符串）、`industry`（字符串）、`match_score`（整数 0-100）、`reason`（字符串）、`salary_range`（对象）、`missing_skills`（字符串数组）、`career_path`（字符串）
3. THE `salary_range` 对象 SHALL 包含 `min_salary`（整数）、`max_salary`（整数）、`city`（字符串）
4. THE `missing_skills` 数组 SHALL 包含 0-5 个字符串元素，每个元素为一个技能名称
5. WHEN AI_Analyzer 生成推荐时，THE Job_Recommendation_System SHALL 确保所有必需字段都有有效值
6. WHEN 某个字段无法生成时，THE Job_Recommendation_System SHALL 使用合理的默认值（空字符串或空数组）

### 需求 8：AI Prompt 优化

**用户故事：** 作为系统维护者，我需要优化 AI prompt 以确保生成的新增字段质量高、准确性好。

#### 验收标准

1. THE AI_Analyzer prompt SHALL 明确要求生成 `match_score`、`missing_skills` 和 `career_path` 字段
2. THE prompt SHALL 提供清晰的字段格式说明和示例
3. THE prompt SHALL 要求 AI 基于简历内容和岗位特点进行分析，避免生成通用模板化内容
4. THE prompt SHALL 要求 `missing_skills` 只包含对岗位重要但候选人简历中未体现的技能
5. THE prompt SHALL 要求 `career_path` 基于真实的行业职业发展路径，避免虚构
6. THE AI_Analyzer SHALL 使用智谱 AI (GLM-4-flash) 模型生成响应

### 需求 9：响应式设计适配

**用户故事：** 作为移动端用户，我希望在手机上也能清晰查看增强后的岗位推荐信息。

#### 验收标准

1. WHEN 屏幕宽度小于 900px 时，THE Frontend_Display SHALL 将岗位推荐网格从 3 列调整为 2 列
2. WHEN 屏幕宽度小于 560px 时，THE Frontend_Display SHALL 将岗位推荐网格调整为 1 列
3. THE Recommendation_Card 内部元素 SHALL 在小屏幕上保持可读性，字体大小不小于 11px
4. THE Frontend_Display SHALL 确保所有交互元素（按钮、标签）在触摸屏上易于点击（最小点击区域 44x44px）
5. THE 成长路径和缺失技能列表 SHALL 在小屏幕上自动换行，不出现横向滚动

### 需求 10：错误处理与降级

**用户故事：** 作为用户，当系统无法生成某些新增字段时，我希望仍能看到基本的岗位推荐信息，而不是完全失败。

#### 验收标准

1. WHEN AI_Analyzer 无法生成 `match_score` 时，THE Job_Recommendation_System SHALL 使用默认值 70 并记录警告日志
2. WHEN AI_Analyzer 无法生成 `missing_skills` 时，THE Job_Recommendation_System SHALL 使用空数组作为默认值
3. WHEN AI_Analyzer 无法生成 `career_path` 时，THE Job_Recommendation_System SHALL 使用空字符串作为默认值
4. THE Frontend_Display SHALL 优雅处理缺失字段，不显示空白或错误信息
5. WHEN `missing_skills` 为空时，THE Frontend_Display SHALL 显示"技能完全匹配 ✓"而不是空白区域
6. WHEN `career_path` 为空时，THE Frontend_Display SHALL 隐藏成长路径模块，不占用空间
7. THE Job_Recommendation_System SHALL 在日志中记录所有字段生成失败的情况，便于调试和监控

## 非功能性需求

### 性能需求

1. THE AI_Analyzer SHALL 在 10 秒内完成单份简历的分析和岗位推荐生成（包括新增字段）
2. THE Frontend_Display SHALL 在 100 毫秒内完成岗位推荐卡片的渲染

### 兼容性需求

1. THE Frontend_Display SHALL 支持 Chrome 90+、Firefox 88+、Safari 14+、Edge 90+ 浏览器
2. THE 系统 SHALL 保持与现有 Python FastAPI 后端和原生 JavaScript 前端的兼容性

### 可维护性需求

1. THE 新增代码 SHALL 遵循现有项目的代码风格和命名规范
2. THE AI prompt 修改 SHALL 在代码中使用清晰的注释标注变更内容
3. THE 前端样式 SHALL 使用现有的 CSS 变量系统，不引入新的颜色或字体定义
