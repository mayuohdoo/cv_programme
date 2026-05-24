#!/bin/bash

# 下载 PDF.js 完整包
echo "正在下载 PDF.js..."
cd chrome-extension-mvp

# 下载最新版本
curl -L -o pdfjs.zip https://github.com/mozilla/pdf.js/releases/download/v4.0.379/pdfjs-4.0.379-dist.zip

# 解压
echo "正在解压..."
unzip -q pdfjs.zip

# 复制需要的文件
echo "正在复制文件..."
cp build/pdf.min.js libs/
cp build/pdf.worker.min.js libs/

# 清理
echo "正在清理..."
rm pdfjs.zip
rm -rf build web

echo "✅ PDF.js 下载完成！"
ls -lh libs/
