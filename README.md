# 小小求职拿下 ✨

> AI 驱动的一站式求职助手，帮你优化简历、匹配岗位、模拟面试、追踪投递进度。

🔗 **在线体验**：[https://catarina-xxxcc.github.io/cv_programme/](https://catarina-xxxcc.github.io/cv_programme/)

---

## 🎯 核心功能

### 📋 简历诊断
- 上传简历（PDF/DOCX/TXT），AI 自动检测错别字、语法问题
- 给出优化建议和综合评分
- 支持 Chrome 扩展一键填充招聘网站表单

### 🧠 岗位推荐
- 基于简历内容智能匹配最适合的职业方向
- MBTI 性格辅助分析（选填）
- 展示匹配度、薪资范围、成长路径

### 💬 面试辅导（RAG 增强）
- AI 模拟面试官，练习回答技巧
- **知识库增强**：基于真实面经数据（牛客网 84+ 条面经），AI 回答更专业
- 支持多种模式：换赛道、修改简历、职业规划、模拟面试

### 📊 投递追踪
- 记录每次投递，可视化追踪进度
- 智能提醒：超时未回复、转化率分析
- Chrome 扩展自动记录投递

---

## 🖥️ 界面预览

- **冷启动欢迎页**：产品功能预览 + 个人信息设置
- **主页面**：3D 旋转木马卡片轮播，四大功能一目了然
- **侧边栏**：用户头像 + 简历管理

---

## 🛠️ 技术架构

| 层级 | 技术栈 |
|------|--------|
| 前端 | HTML/CSS/JS + Tailwind（冷启动页）|
| 后端 | Python FastAPI |
| AI | DeepSeek Chat + DeepSeek Embedding |
| 数据库 | Supabase PostgreSQL + pgvector |
| 知识库 | RAG（检索增强生成）|
| 扩展 | Chrome Extension（简历解析 + 自动填充）|
| 部署 | GitHub Pages（前端）|

---

## 📁 项目结构

```
├── index.html              # 主网站
├── dashboard.js            # 仪表盘（3D 旋转木马）
├── onboarding.js           # 冷启动引导
├── landing.html            # React 欢迎页（SVG 图表）
├── tracking.js             # 投递追踪
├── backend/
│   ├── main.py             # FastAPI 后端
│   └── rag/                # RAG 知识库模块
│       ├── config.py       # 配置管理
│       ├── embedding.py    # DeepSeek Embedding
│       ├── chunking.py     # 文档分块引擎
│       ├── pipeline.py     # RAG 检索管道
│       ├── context_builder.py  # 上下文构建
│       └── knowledge_base.py   # 知识库管理
├── chrome-extension-mvp/   # Chrome 扩展
├── scripts/
│   ├── crawl_nowcoder.py   # 牛客网面经爬虫
│   ├── clean_data.py       # 数据清理
│   └── ingest_data.py      # 知识库数据导入
└── data/                   # 面经数据（不上传）
```

---

## 🚀 快速开始

### 前端（GitHub Pages 已部署）
直接访问：[https://catarina-xxxcc.github.io/cv_programme/](https://catarina-xxxcc.github.io/cv_programme/)

### 后端本地运行

```bash
# 1. 安装依赖
cd backend
pip install fastapi uvicorn openai python-dotenv supabase httpx PyMuPDF python-docx

# 2. 配置环境变量
# 编辑 .env 文件，填入 DeepSeek API Key 和 Supabase Key

# 3. 启动服务
python main.py
# 或
uvicorn main:app --reload --port 8000
```

### 知识库数据导入

```bash
# 1. 爬取牛客网面经
pip install playwright && playwright install chromium
python scripts/crawl_nowcoder.py

# 2. 清理数据
python scripts/clean_data.py

# 3. 导入 Supabase
python scripts/ingest_data.py
```

### Chrome 扩展安装

1. 打开 `chrome://extensions`
2. 开启开发者模式
3. 加载已解压的扩展程序 → 选择 `chrome-extension-mvp/` 文件夹

---

## 🔑 环境变量

```env
# DeepSeek API
DEEPSEEK_API_KEY=your-key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# RAG 参数
RAG_TOP_K=3
RAG_SIMILARITY_THRESHOLD=0.7
```

---

## 📝 开发计划

- [x] 简历诊断（AI 评分 + 优化建议）
- [x] 岗位推荐（MBTI + 技能匹配）
- [x] 面试辅导（AI 对话 + RAG 知识库）
- [x] 投递追踪（Chrome 扩展 + 可视化）
- [x] 冷启动引导（欢迎页 + 个人信息设置）
- [x] RAG 知识库（牛客面经 84 条 + DeepSeek Embedding）
- [ ] 更多面经数据源（BOSS直聘、脉脉等）
- [ ] 面试模拟评分系统完善
- [ ] 移动端适配优化

---

## 👩‍💻 作者

**catarina-xxxcc**

---

*让求职更高效，更有方向。*
