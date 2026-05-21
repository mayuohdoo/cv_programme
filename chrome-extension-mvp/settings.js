/**
 * 设置页面脚本
 */

const form = document.getElementById('settingsForm');
const apiKeyInput = document.getElementById('apiKey');
const testBtn = document.getElementById('testBtn');
const statusDiv = document.getElementById('status');

// 加载已保存的设置
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const result = await chrome.storage.local.get(['deepseekApiKey']);
    if (result.deepseekApiKey) {
      apiKeyInput.value = result.deepseekApiKey;
    }
  } catch (error) {
    console.error('加载设置失败:', error);
  }
});

// 保存设置
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    showStatus('请输入 API Key', 'error');
    return;
  }
  
  if (!apiKey.startsWith('sk-')) {
    showStatus('API Key 格式不正确，应该以 sk- 开头', 'error');
    return;
  }
  
  try {
    await chrome.storage.local.set({ deepseekApiKey: apiKey });
    showStatus('✅ 设置保存成功！', 'success');
  } catch (error) {
    showStatus('❌ 保存失败：' + error.message, 'error');
  }
});

// 测试连接
testBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    showStatus('请先输入 API Key', 'error');
    return;
  }
  
  testBtn.disabled = true;
  testBtn.textContent = '测试中...';
  
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: '你好' }
        ],
        max_tokens: 10
      })
    });
    
    if (response.ok) {
      showStatus('✅ 连接成功！API Key 有效', 'success');
    } else {
      const error = await response.json();
      showStatus('❌ 连接失败：' + (error.error?.message || '未知错误'), 'error');
    }
  } catch (error) {
    showStatus('❌ 连接失败：' + error.message, 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = '🧪 测试连接';
  }
});

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  setTimeout(() => {
    statusDiv.className = 'status';
  }, 3000);
}
