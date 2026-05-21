# GitHub Pages 部署说明

## 问题诊断

你的GitHub仓库文件已经正确上传，但GitHub Pages返回404。这通常是因为：

1. GitHub Pages没有启用
2. 部署源配置不正确
3. 需要等待部署完成

## 解决方案

### 方法1：启用GitHub Pages（推荐）

1. 访问你的GitHub仓库：https://github.com/catarina-xxxcc/cv_programme
2. 点击 **Settings** 标签页
3. 在左侧菜单中找到 **Pages**
4. 在 **Source** 部分选择：
   - **Deploy from a branch**
   - Branch: **main**
   - Folder: **/ (root)**
5. 点击 **Save**
6. 等待几分钟让GitHub Pages部署

### 方法2：使用Vercel部署（备选）

如果GitHub Pages有问题，你可以使用Vercel：

1. 访问 https://vercel.com
2. 用GitHub账号登录
3. 点击 "New Project"
4. 选择你的 `cv_programme` 仓库
5. 部署设置：
   - Framework Preset: **Other**
   - Root Directory: **.**
   - Build Command: 留空
   - Output Directory: 留空
6. 点击 "Deploy"

### 方法3：使用Netlify部署（备选）

1. 访问 https://netlify.com
2. 用GitHub账号登录
3. 点击 "New site from Git"
4. 选择GitHub，然后选择 `cv_programme` 仓库
5. 部署设置：
   - Branch: **main**
   - Build command: 留空
   - Publish directory: **.**
6. 点击 "Deploy site"

## 当前状态

- ✅ 后端API正常运行：https://cv-programme.onrender.com
- ✅ 前端文件已上传到GitHub
- ❌ GitHub Pages需要手动启用

## 测试链接

一旦GitHub Pages启用，你的应用将在以下地址可用：
- https://catarina-xxxcc.github.io/cv_programme/

## 备用测试

如果你想立即测试，可以：
1. 下载根目录的 `index.html` 和 `config.js` 文件
2. 在本地打开 `index.html`
3. 应该能正常使用（因为后端API已经配置了CORS）