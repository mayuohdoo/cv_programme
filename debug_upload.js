// 在浏览器控制台运行这个脚本来诊断上传问题
// 打开 https://catarina-xxxcc.github.io/cv_programme/
// 按F12打开控制台，粘贴这段代码并回车

console.log("🔍 开始诊断上传问题...\n");

// 1. 检查API配置
console.log("1️⃣ 检查API配置:");
console.log("   API_BASE_URL:", window.APP_CONFIG?.API_BASE_URL || "未定义");
console.log("");

// 2. 测试后端连接
console.log("2️⃣ 测试后端API连接:");
fetch("https://cv-programme.onrender.com/docs")
  .then(res => {
    console.log("   ✅ 后端API可访问，状态码:", res.status);
  })
  .catch(err => {
    console.log("   ❌ 后端API连接失败:", err.message);
  });

// 3. 测试CORS
console.log("\n3️⃣ 测试CORS配置:");
fetch("https://cv-programme.onrender.com/upload", {
  method: "OPTIONS",
  headers: {
    "Origin": window.location.origin,
    "Access-Control-Request-Method": "POST"
  }
})
  .then(res => {
    console.log("   ✅ CORS预检成功，状态码:", res.status);
    console.log("   允许的源:", res.headers.get("access-control-allow-origin"));
  })
  .catch(err => {
    console.log("   ❌ CORS预检失败:", err.message);
  });

// 4. 模拟上传请求
console.log("\n4️⃣ 模拟上传请求（无文件）:");
const formData = new FormData();
fetch("https://cv-programme.onrender.com/upload", {
  method: "POST",
  body: formData
})
  .then(res => res.json())
  .then(data => {
    console.log("   响应:", data);
  })
  .catch(err => {
    console.log("   ❌ 请求失败:", err.message);
  });

console.log("\n✅ 诊断完成！请查看上面的输出结果。");
console.log("如果看到错误，请截图发给我。");