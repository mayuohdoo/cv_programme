# 📦 下载并集成本地库文件

## 方案说明

将 pdf.js 和 mammoth.js 下载到本地，打包进扩展，这样就不依赖 CDN 了。

## 步骤 1：下载库文件

### 下载 PDF.js
1. 访问：https://github.com/mozilla/pdf.js/releases
2. 下载最新的 `pdfjs-*-dist.zip`（例如 `pdfjs-4.0.379-dist.zip`）
3. 解压后，将以下文件复制到 `chrome-extension-mvp/libs/` 目录：
   - `build/pdf.min.js`
   - `build/pdf.worker.min.js`

### 下载 Mammoth.js
1. 访问：https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js
2. 右键 → 另存为 → 保存到 `chrome-extension-mvp/libs/mammoth.browser.min.js`

## 步骤 2：创建目录结构

```
chrome-extension-mvp/
├── libs/
│   ├── pdf.min.js              # PDF.js 核心库
│   ├── pdf.worker.min.js       # PDF.js Worker
│   └── mammoth.browser.min.js  # Mammoth.js 库
├── manifest.json
├── popup-v4-local.html         # 新版本（使用本地库）
└── popup-v4-local.js           # 新版本逻辑
```

## 步骤 3：更新 manifest.json

需要在 `web_accessible_resources` 中声明这些库文件，让扩展可以访问。

## 自动化脚本（可选）

如果你想自动下载，可以运行：

```bash
cd chrome-extension-mvp
mkdir -p libs

# 下载 Mammoth.js
curl -o libs/mammoth.browser.min.js https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js

# PDF.js 需要手动下载（因为是 zip 包）
echo "请手动下载 PDF.js: https://github.com/mozilla/pdf.js/releases"
```

## 下一步

下载完成后，我会帮你创建 V4 版本，使用本地库文件。
