# Requirements Document

## Introduction

本文档定义了简历解析系统的用户"我的"浮窗管理功能。该功能在页面左侧提供一个可展开/收起的侧边栏,用于管理用户信息、简历上传、查看已上传简历列表以及切换不同简历的解析结果。所有数据通过浏览器localStorage持久化存储,无需后端支持。

## Glossary

- **System**: 简历解析系统,包含前端界面和后端API服务
- **Profile_Sidebar**: "我的"浮窗,固定在页面左侧的可展开/收起侧边栏
- **User_Info**: 用户信息,包括用户名称和头像
- **Resume_List**: 已上传简历列表,显示所有历史上传的简历
- **Resume_Item**: 简历列表中的单个简历条目,包含文件名、上传时间和解析结果
- **Active_Resume**: 当前正在查看的简历
- **Upload_Area**: 上传区域,包含上传按钮、拖拽区域和进度条
- **Result_Panel**: 结果面板,显示MBTI推断、岗位推荐和简历诊断结果
- **LocalStorage**: 浏览器本地存储,用于持久化用户数据
- **Collapsed_State**: 收起状态,浮窗显示为细长条带箭头图标
- **Expanded_State**: 展开状态,浮窗显示完整内容
- **Main_Layout**: 主布局,包含Profile_Sidebar、诊断框和Result_Panel
- **Diagnosis_Box**: 简历诊断框,显示简历质量评分和改进建议

## Requirements

### Requirement 1: 浮窗UI结构和定位

**User Story:** 作为用户,我希望在页面左侧看到一个固定的"我的"浮窗,以便快速访问我的简历管理功能。

#### Acceptance Criteria

1. THE Profile_Sidebar SHALL 固定在页面左侧
2. WHEN THE Profile_Sidebar 处于 Expanded_State,THE Profile_Sidebar SHALL 占据页面宽度的20%
3. WHEN THE Profile_Sidebar 处于 Collapsed_State,THE Profile_Sidebar SHALL 显示为宽度不超过60px的细长条
4. THE Profile_Sidebar SHALL 使用与现有樱花粉配色系统一致的视觉样式
5. THE Profile_Sidebar SHALL 在页面滚动时保持固定位置
6. THE Profile_Sidebar SHALL 显示展开/收起切换按钮

### Requirement 2: 浮窗展开和收起交互

**User Story:** 作为用户,我希望能够展开或收起"我的"浮窗,以便在需要时访问功能,不需要时节省屏幕空间。

#### Acceptance Criteria

1. WHEN 用户点击展开/收起按钮,THE System SHALL 切换 Profile_Sidebar 的展开/收起状态
2. WHEN THE Profile_Sidebar 从 Collapsed_State 切换到 Expanded_State,THE System SHALL 在300ms内完成平滑动画过渡
3. WHEN THE Profile_Sidebar 从 Expanded_State 切换到 Collapsed_State,THE System SHALL 在300ms内完成平滑动画过渡
4. WHEN THE Profile_Sidebar 状态改变,THE System SHALL 将新状态保存到 LocalStorage
5. WHEN 页面加载,THE System SHALL 从 LocalStorage 恢复上次的展开/收起状态
6. WHEN THE Profile_Sidebar 处于 Collapsed_State,THE System SHALL 显示箭头图标指示可展开方向

### Requirement 3: 用户信息区域

**User Story:** 作为用户,我希望在浮窗中看到和编辑我的个人信息,以便个性化我的使用体验。

#### Acceptance Criteria

1. WHEN THE Profile_Sidebar 处于 Expanded_State,THE System SHALL 在顶部显示 User_Info 区域
2. THE User_Info 区域 SHALL 显示用户头像和用户名称
3. WHEN 用户点击用户名称,THE System SHALL 允许用户编辑名称
4. WHEN 用户点击头像,THE System SHALL 允许用户上传自定义头像图片
5. WHEN 用户修改 User_Info,THE System SHALL 将更新后的信息保存到 LocalStorage
6. WHEN 用户首次访问且 LocalStorage 中无 User_Info,THE System SHALL 显示默认头像和默认名称"用户"

### Requirement 4: 简历列表显示

**User Story:** 作为用户,我希望看到我所有已上传的简历列表,以便管理和切换不同的简历。

#### Acceptance Criteria

1. WHEN THE Profile_Sidebar 处于 Expanded_State,THE System SHALL 显示 Resume_List 区域
2. THE Resume_List 区域 SHALL 显示标题"我的简历 (数量)",其中数量为已上传简历的总数
3. THE System SHALL 为每个已上传简历显示一个 Resume_Item
4. THE Resume_Item SHALL 显示简历文件名和上传时间
5. WHEN 某个 Resume_Item 对应 Active_Resume,THE System SHALL 在该 Resume_Item 旁显示✓标记
6. WHEN Resume_List 为空,THE System SHALL 显示提示文本"还没有上传简历"

### Requirement 5: 简历切换功能

**User Story:** 作为用户,我希望点击简历列表中的任意简历,以便查看该简历的解析结果。

#### Acceptance Criteria

1. WHEN 用户点击 Resume_List 中的某个 Resume_Item,THE System SHALL 将该简历设置为 Active_Resume
2. WHEN Active_Resume 改变,THE System SHALL 更新 Result_Panel 显示新简历的解析结果
3. WHEN Active_Resume 改变,THE System SHALL 更新 Diagnosis_Box 显示新简历的诊断结果
4. WHEN Active_Resume 改变,THE System SHALL 将新的 Active_Resume ID 保存到 LocalStorage
5. WHEN 切换简历,THE System SHALL 在500ms内完成结果更新
6. WHEN 切换简历时发生错误,THE System SHALL 显示错误提示并保持当前 Active_Resume 不变

### Requirement 6: 上传区域集成

**User Story:** 作为用户,我希望在"我的"浮窗中上传新简历,以便集中管理所有简历相关操作。

#### Acceptance Criteria

1. WHEN THE Profile_Sidebar 处于 Expanded_State,THE System SHALL 在底部显示 Upload_Area
2. THE Upload_Area SHALL 包含上传按钮、拖拽上传区域和开始解析按钮
3. WHEN 用户通过 Upload_Area 上传新简历,THE System SHALL 将新简历添加到 Resume_List
4. WHEN 新简历上传成功,THE System SHALL 将该简历设置为 Active_Resume
5. WHEN 简历解析开始,THE Upload_Area SHALL 显示进度条
6. WHEN 简历解析完成,THE System SHALL 更新 Result_Panel 和 Diagnosis_Box

### Requirement 7: 首次访问体验

**User Story:** 作为首次访问的用户,我希望看到清晰的引导,以便快速了解如何使用系统。

#### Acceptance Criteria

1. WHEN 用户首次访问且 LocalStorage 中无简历数据,THE Profile_Sidebar SHALL 默认处于 Expanded_State
2. WHEN 用户首次访问,THE System SHALL 在 Upload_Area 显示上传引导文本
3. WHEN 用户上传第一份简历,THE System SHALL 自动开始解析
4. WHEN 第一份简历解析完成,THE System SHALL 自动将 Profile_Sidebar 切换到 Collapsed_State
5. WHEN 第一份简历解析完成,THE System SHALL 在 Result_Panel 显示解析结果
6. WHEN 用户首次访问,THE System SHALL 不显示 Diagnosis_Box

### Requirement 8: 布局调整和响应式设计

**User Story:** 作为用户,我希望新的浮窗不影响现有功能的使用,并且在不同设备上都能正常显示。

#### Acceptance Criteria

1. WHEN THE Profile_Sidebar 添加到页面,THE System SHALL 调整 Main_Layout 以容纳 Profile_Sidebar
2. WHEN THE Profile_Sidebar 处于 Expanded_State,THE Diagnosis_Box SHALL 占据原上传框和诊断框的空间
3. THE Result_Panel SHALL 保持原有位置和尺寸不变
4. WHEN 视口宽度大于1024px,THE Profile_Sidebar 在 Expanded_State 时 SHALL 占据20%宽度
5. WHEN 视口宽度在768px到1024px之间,THE Profile_Sidebar 在 Expanded_State 时 SHALL 占据25%宽度
6. WHEN 视口宽度小于768px,THE Profile_Sidebar 在 Expanded_State 时 SHALL 全屏覆盖并显示关闭按钮

### Requirement 9: 数据持久化

**User Story:** 作为用户,我希望我的简历数据和设置在刷新页面后仍然保留,以便继续使用。

#### Acceptance Criteria

1. THE System SHALL 将 User_Info 存储到 LocalStorage
2. THE System SHALL 将 Resume_List 存储到 LocalStorage,包括文件名、上传时间和解析结果
3. THE System SHALL 将 Active_Resume ID 存储到 LocalStorage
4. THE System SHALL 将 Profile_Sidebar 的展开/收起状态存储到 LocalStorage
5. WHEN 页面加载,THE System SHALL 从 LocalStorage 恢复所有用户数据和设置
6. WHEN LocalStorage 数据损坏或无效,THE System SHALL 使用默认值并记录错误到浏览器控制台

### Requirement 10: 动画和视觉反馈

**User Story:** 作为用户,我希望界面交互流畅自然,以便获得良好的使用体验。

#### Acceptance Criteria

1. THE Profile_Sidebar 展开/收起动画 SHALL 使用缓动函数实现平滑过渡
2. WHEN 用户悬停在 Resume_Item 上,THE System SHALL 显示视觉反馈(如背景色变化)
3. WHEN 用户点击 Resume_Item,THE System SHALL 显示点击反馈动画
4. WHEN 简历切换时,THE Result_Panel SHALL 显示淡入淡出过渡效果
5. THE Upload_Area 进度条 SHALL 显示平滑的进度动画
6. WHEN Profile_Sidebar 状态改变,THE Main_Layout 其他元素 SHALL 平滑调整位置和尺寸

### Requirement 11: 错误处理和边界情况

**User Story:** 作为用户,我希望系统能够妥善处理异常情况,以便在出错时仍能继续使用。

#### Acceptance Criteria

1. WHEN LocalStorage 存储空间不足,THE System SHALL 显示错误提示并建议用户删除旧简历
2. WHEN 用户上传的简历文件超过5MB,THE System SHALL 拒绝上传并显示错误提示
3. WHEN 简历解析失败,THE System SHALL 显示错误信息但保留简历在 Resume_List 中
4. WHEN 用户尝试上传不支持的文件格式,THE System SHALL 显示错误提示
5. WHEN Resume_List 包含超过20份简历,THE System SHALL 显示滚动条
6. WHEN 用户删除 Active_Resume,THE System SHALL 自动选择最近上传的简历作为新的 Active_Resume

### Requirement 12: 性能要求

**User Story:** 作为用户,我希望浮窗操作响应迅速,以便流畅使用系统。

#### Acceptance Criteria

1. THE Profile_Sidebar 展开/收起操作 SHALL 在300ms内完成
2. THE System SHALL 在100ms内从 LocalStorage 加载用户数据
3. WHEN 用户切换简历,THE System SHALL 在500ms内更新 Result_Panel
4. THE Resume_List SHALL 支持至少50份简历而不影响性能
5. THE System SHALL 在页面加载后1秒内完成 Profile_Sidebar 的初始化渲染
6. WHEN 用户编辑 User_Info,THE System SHALL 在200ms内保存到 LocalStorage

