# Implementation Plan: 行业薪资数据参考功能

## Overview

本实现计划将行业薪资数据参考功能分解为可执行的编码任务。该功能通过修改后端AI prompt让智谱AI模型生成基于城市的薪资范围数据,并在前端岗位卡片中显示薪资信息,同时支持点击跳转到Boss直聘搜索相关岗位。

实现策略:
1. 先修改后端AI prompt,确保API返回包含薪资数据的JSON
2. 再修改前端渲染逻辑,显示薪资信息
3. 添加点击跳转功能
4. 完善错误处理和样式优化

## Tasks

- [x] 1. 修改后端AI prompt以生成薪资数据
  - [x] 1.1 在`backend/main.py`的`_parse_resume_with_ai()`函数中修改prompt
    - 在prompt中添加城市提取指令(要求AI从简历中提取城市信息)
    - 在`job_recommendations`字段说明中添加`salary_range`子字段要求
    - 添加薪资推断规则说明(基于岗位、行业、城市的薪资差异)
    - 明确薪资数据格式:`min_salary`和`max_salary`为整数(单位:千元),`city`为字符串
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.4, 5.2_
  
  - [x] 1.2 在prompt中添加顶层`city`字段要求
    - 要求AI在响应的顶层返回`city`字段(从简历中提取的城市)
    - 如果简历中未明确提及城市,返回空字符串
    - _Requirements: 2.1, 2.2, 5.3_
  
  - [ ]* 1.3 编写单元测试验证AI响应格式
    - 测试包含城市信息的简历(如:"北京市朝阳区")
    - 测试不包含城市信息的简历
    - 验证`salary_range`字段包含`min_salary`、`max_salary`、`city`
    - 验证不同城市的薪资差异是否合理(一线城市高于二三线城市)
    - _Requirements: 2.4, 4.4_

- [ ] 2. 增强后端JSON解析的错误处理
  - [ ] 2.1 修改`_to_json_with_fallback()`函数
    - 添加对`salary_range`字段的验证逻辑
    - 如果某个岗位缺少`salary_range`字段,设置为`None`而不是抛出错误
    - 确保即使薪资数据生成失败,其他岗位信息仍能正常返回
    - _Requirements: 4.5, 7.1, 7.2, 7.4_
  
  - [ ]* 2.2 编写单元测试验证错误处理
    - 测试缺少`salary_range`字段的JSON响应
    - 测试`salary_range`字段格式错误的响应(如:缺少`min_salary`)
    - 验证降级逻辑不影响其他字段的解析
    - _Requirements: 7.1, 7.2, 7.4_

- [ ] 3. Checkpoint - 验证后端修改
  - 手动测试:上传包含城市信息的简历,检查API响应是否包含`city`和`salary_range`字段
  - 手动测试:上传不包含城市信息的简历,检查API响应中`city`是否为空字符串
  - 确保所有测试通过,如有问题请向用户反馈

- [x] 4. 修改前端JavaScript以显示薪资信息
  - [x] 4.1 修改`frontend/index.html`中的岗位卡片渲染逻辑
    - 在`renderJobCard()`函数(或类似的渲染函数)中添加薪资显示逻辑
    - 检查`job.salary_range`是否存在且包含有效数据
    - 构建薪资HTML:`<div class="job-salary">...</div>`
    - 薪资格式:`${min_salary}-${max_salary}K`
    - 城市标签格式:`<span class="salary-city">${city}</span>`
    - 如果`salary_range`不存在或无效,不显示薪资信息(降级处理)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 7.2_
  
  - [ ]* 4.2 编写前端单元测试验证薪资显示
    - 测试正常的薪资数据渲染(包含`min_salary`、`max_salary`、`city`)
    - 测试缺少薪资数据时的降级显示(不显示薪资,其他信息正常)
    - 测试不同薪资范围的格式化(如:15-25K、30-50K)
    - _Requirements: 1.1, 1.2, 7.2_

- [x] 5. 添加CSS样式以美化薪资显示
  - [x] 5.1 在`frontend/index.html`的`<style>`标签中添加薪资相关样式
    - 添加`.job-salary`样式(flex布局,间距6px)
    - 添加`.salary-amount`样式(字体大小14px,粗体,品牌色)
    - 添加`.salary-city`样式(字体大小10px,背景色,边框,圆角)
    - 确保样式与现有设计系统一致(使用CSS变量如`var(--brand)`)
    - 确保移动端响应式显示
    - _Requirements: 1.3, 1.4, 6.1, 6.2, 6.3, 6.4_

- [x] 6. 实现点击跳转到Boss直聘功能
  - [x] 6.1 为岗位卡片添加点击事件监听器
    - 在`renderJobCard()`函数中为卡片元素添加`click`事件监听器
    - 构建Boss直聘搜索URL:`https://www.zhipin.com/job_detail/?query=${jobTitle}&city=${city}`
    - 使用`encodeURIComponent()`对岗位名称和城市进行URL编码
    - 如果城市信息为空,省略`city`参数
    - 使用`window.open(url, '_blank')`在新标签页打开链接
    - _Requirements: 3.1, 3.2, 3.3, 3.5_
  
  - [x] 6.2 添加点击视觉反馈样式
    - 修改`.job-card`样式,添加`cursor: pointer`
    - 增强`:hover`效果(边框颜色变为品牌色,阴影加深,轻微上移)
    - 添加`:active`效果(取消上移,提供点击反馈)
    - _Requirements: 3.4, 6.5_
  
  - [x] 6.3 添加跳转错误处理
    - 使用`try-catch`包裹URL构建和跳转逻辑
    - 如果跳转失败,在控制台记录错误信息
    - 提供降级方案:使用不带城市参数的URL
    - _Requirements: 7.3, 7.5_
  
  - [ ]* 6.4 编写前端单元测试验证跳转功能
    - 测试点击卡片是否触发`window.open()`
    - 测试URL参数是否正确编码
    - 测试带城市参数和不带城市参数的URL构建
    - 测试特殊字符的处理(如:岗位名称包含空格、斜杠等)
    - _Requirements: 3.1, 3.2, 3.5_

- [ ] 7. Checkpoint - 验证前端修改
  - 手动测试:上传简历后,检查所有6个岗位卡片是否显示薪资范围
  - 手动测试:检查薪资格式是否正确(如:15-25K)
  - 手动测试:检查城市标签是否正确显示(如:北京、上海)
  - 手动测试:点击岗位卡片,验证是否在新标签页打开Boss直聘
  - 手动测试:检查Boss直聘搜索页面是否显示相关岗位
  - 手动测试:检查移动端显示是否正常
  - 确保所有测试通过,如有问题请向用户反馈

- [ ] 8. 完善错误处理和日志记录
  - [ ] 8.1 在后端添加日志记录
    - 在城市提取后添加日志:`logger.info(f"Extracted city: {city} from resume")`
    - 在薪资生成后添加日志:`logger.info(f"Generated salary range for {job_title}: {min_salary}-{max_salary}K in {city}")`
    - 在JSON解析失败时添加错误日志
    - _Requirements: 7.5_
  
  - [ ] 8.2 在前端添加错误日志
    - 在薪资数据缺失时添加控制台警告:`console.warn('Missing salary_range for job:', job.title)`
    - 在跳转URL构建失败时添加错误日志:`console.error('Failed to open job portal:', error)`
    - _Requirements: 7.5_

- [ ] 9. 端到端集成测试
  - [ ]* 9.1 测试包含城市信息的简历
    - 上传包含"北京"的简历
    - 验证岗位卡片显示北京的薪资范围
    - 验证薪资范围符合一线城市水平(如:算法工程师25-40K)
    - 点击卡片,验证Boss直聘URL包含城市参数
    - _Requirements: 1.5, 2.1, 2.4, 3.5_
  
  - [ ]* 9.2 测试不包含城市信息的简历
    - 上传不包含城市信息的简历
    - 验证岗位卡片显示"全国"的薪资范围
    - 验证薪资范围基于全国平均水平
    - 点击卡片,验证Boss直聘URL不包含城市参数或使用默认值
    - _Requirements: 2.2, 2.3_
  
  - [ ]* 9.3 测试AI生成失败的降级场景
    - 模拟AI返回不包含`salary_range`的响应
    - 验证岗位卡片仍正常显示其他信息(标题、行业、推荐理由)
    - 验证不显示薪资信息
    - 验证点击跳转功能仍正常工作
    - _Requirements: 7.1, 7.2, 7.4_

- [ ] 10. Final Checkpoint - 完整功能验证
  - 确保所有实现任务已完成
  - 运行所有单元测试和集成测试
  - 手动测试完整的用户流程:上传简历 → 查看薪资 → 点击跳转
  - 检查代码质量:无console.error(除了错误处理),代码格式规范
  - 向用户确认功能是否符合预期,如有问题请反馈

## Notes

- 任务标记`*`的为可选测试任务,可根据项目进度决定是否执行
- 每个任务都明确引用了对应的需求编号,确保需求覆盖
- Checkpoint任务用于阶段性验证,确保增量开发的正确性
- 后端使用Python(FastAPI),前端使用JavaScript(HTML/CSS/JS)
- 所有修改都基于现有代码,不引入新的依赖或框架
- 错误处理遵循降级原则:薪资数据失败不影响核心岗位推荐功能
