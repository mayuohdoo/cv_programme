# 小小求职拿下 - Base44 Frontend

基于 Base44 平台构建的求职助手应用前端代码。

## 技术栈

- React 18 + Vite
- Tailwind CSS + shadcn/ui
- React Router v6
- TanStack React Query
- Base44 SDK

## 功能模块

- 📄 简历上传与 AI 解析
- 🎯 AI 岗位推荐
- 🎤 AI 模拟面试
- 📊 投递追踪管理
- 🤖 AI 求职助手聊天

## 开发

```bash
npm install
npm run dev
```

## 注意

此项目依赖 `@base44/sdk` 和 `@base44/vite-plugin`，需要配置相应的环境变量才能正常运行：

```env
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_FUNCTIONS_VERSION=prod
VITE_BASE44_APP_BASE_URL=https://app.base44.com/apps/your_app_id
```
