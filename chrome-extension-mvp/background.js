/**
 * Background Service Worker
 * 负责管理简历数据存储 + 接收网站消息
 */

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveResume') {
    chrome.storage.local.set({ resume: request.data }, () => {
      console.log('简历已保存:', request.data);
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'getResume') {
    chrome.storage.local.get(['resume'], (result) => {
      sendResponse({ resume: result.resume || null });
    });
    return true;
  }
  
  if (request.action === 'triggerAutofill') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'autofill' });
      }
    });
    sendResponse({ success: true });
    return true;
  }

  // 解析截图（通过 DeepSeek Vision API）
  if (request.action === 'parseScreenshot') {
    parseScreenshotWithAI(request.imageBase64, request.apiKey)
      .then(data => sendResponse({ success: true, data: data }))
      .catch(err => sendResponse({ success: false, message: err.message }));
    return true;
  }

  // AI 智能字段匹配
  if (request.action === 'aiFieldMatch') {
    aiFieldMatch(request.formContext, request.resumeFields, request.apiKey)
      .then(mapping => sendResponse({ success: true, mapping: mapping }))
      .catch(err => sendResponse({ success: false, message: err.message }));
    return true;
  }
});

// 监听来自网站的外部消息（externally_connectable）
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('收到外部消息:', request.action, '来自:', sender.url);
  
  // 检测扩展是否存在（ping）
  if (request.action === 'ping') {
    sendResponse({ success: true, version: chrome.runtime.getManifest().version });
    return true;
  }
  
  // 保存解析后的简历数据到扩展 storage
  if (request.action === 'saveResume') {
    chrome.storage.local.set({ resume: request.data }, () => {
      console.log('从网站保存简历:', request.data);
      sendResponse({ success: true, message: '简历已保存到扩展' });
    });
    return true;
  }
  
  // 获取扩展中存储的简历数据
  if (request.action === 'getResume') {
    chrome.storage.local.get(['resume'], (result) => {
      sendResponse({ success: true, resume: result.resume || null });
    });
    return true;
  }
  
  // 获取 API Key
  if (request.action === 'getApiKey') {
    chrome.storage.local.get(['deepseekApiKey'], (result) => {
      sendResponse({ success: true, apiKey: result.deepseekApiKey || null });
    });
    return true;
  }
  
  // 保存 API Key
  if (request.action === 'saveApiKey') {
    chrome.storage.local.set({ deepseekApiKey: request.apiKey }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  sendResponse({ success: false, message: '未知操作' });
  return true;
});

// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('简历自动填充扩展已安装 v' + chrome.runtime.getManifest().version);
});

/**
 * 用 DeepSeek Vision API 解析截图，提取公司和职位信息
 */
async function parseScreenshotWithAI(imageBase64, apiKey) {
  // 去掉 data:image/xxx;base64, 前缀
  const base64Data = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个截图信息提取助手。用户会上传求职投递成功的截图，请从中提取公司名称和投递的职位名称。只返回JSON格式：{"company":"公司名","position":"职位名"}'
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${base64Data}` }
            },
            {
              type: 'text',
              text: '请从这张截图中提取：1. 公司名称 2. 投递的职位名称。只返回JSON：{"company":"...","position":"..."}'
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 200
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    // 如果 vision 不支持，回退到纯文本 OCR 方式
    if (err.error && err.error.message && err.error.message.includes('image')) {
      throw new Error('当前 API 不支持图片识别，请手动输入');
    }
    throw new Error(err.error?.message || `API 错误 ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // 提取 JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      company: parsed.company || '未识别',
      position: parsed.position || '未识别'
    };
  }

  throw new Error('AI 响应格式错误');
}

/**
 * AI 智能字段匹配 - 用 DeepSeek 分析页面表单结构，返回字段映射
 */
async function aiFieldMatch(formContext, resumeFields, apiKey) {
  // 构建表单描述
  const formDescription = formContext.map((item, idx) => {
    let desc = `[${idx}] `;
    if (item.label) desc += `label="${item.label}" `;
    if (item.placeholder) desc += `placeholder="${item.placeholder}" `;
    if (item.ariaLabel) desc += `aria-label="${item.ariaLabel}" `;
    if (item.name) desc += `name="${item.name}" `;
    if (item.nearbyText) desc += `nearby="${item.nearbyText}" `;
    desc += `(${item.tag}${item.type ? '[' + item.type + ']' : ''})`;
    return desc;
  }).join('\n');

  const prompt = `你是一个表单字段匹配助手。下面是一个网页表单中所有输入框的信息，请判断每个输入框应该填入简历的哪个字段。

表单字段列表：
${formDescription}

可用的简历字段：${resumeFields.join(', ')}

重要规则：
1. 只匹配你非常确定的字段（姓名、邮箱、电话、学校、专业、学历等基本信息）
2. 如果表单字段是"项目名称"、"项目描述"、"项目角色"等具体项目信息，而简历字段里没有精确对应的数据，就不要匹配
3. 不要把"自我介绍/introduction"填到"项目名称"或"角色"里
4. 不要把"公司名"填到"时间"字段里
5. 宁可少填也不要填错
6. 只返回 JSON，不要其他文字

示例返回：{"0":"name","1":"phone","3":"email","5":"education"}`;

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是表单字段匹配助手，只返回JSON。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API 错误 ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI 响应格式错误');

  return JSON.parse(jsonMatch[0]);
}
