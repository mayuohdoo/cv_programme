/**
 * Content Script - 重构版
 * 集成：字段匹配、自动填充、浮动UI、投递记录、信息提取、网站桥接
 */

// 注入扩展 ID 标记
document.documentElement.setAttribute('data-resume-ext-id', chrome.runtime.id);

// ===== 页面加载后显示浮动按钮 =====
function initAutofillTrigger() {
  // 排除自己的网站
  var host = window.location.hostname;
  if (host === 'catarina-xxxcc.github.io' || host === 'cv-programme.vercel.app') return;

  // 始终显示浮动按钮（填充+记录）
  FloatingUI.showAutofillTrigger();
}

// 延迟初始化（等待页面加载完成）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initAutofillTrigger, 1000);
  });
} else {
  setTimeout(initAutofillTrigger, 1000);
}

// ===== postMessage 桥接（网站 ↔ 扩展通信）=====
window.addEventListener('message', function(event) {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== 'RESUME_EXT_MSG') return;

  var payload = event.data.payload;
  var requestId = event.data.requestId;

  // 处理投递记录相关 action
  if (payload.action === 'getApplicationRecords') {
    ApplicationStorage.getRecords().then(function(records) {
      sendResponse(requestId, { success: true, data: records });
    }).catch(function(err) {
      sendResponse(requestId, { success: false, message: err.message });
    });
    return;
  }

  if (payload.action === 'updateApplicationRecord') {
    ApplicationStorage.updateRecord(payload.id, payload.data).then(function(record) {
      sendResponse(requestId, { success: true, data: record });
    }).catch(function(err) {
      sendResponse(requestId, { success: false, message: err.message });
    });
    return;
  }

  if (payload.action === 'deleteApplicationRecord') {
    ApplicationStorage.deleteRecord(payload.id).then(function() {
      sendResponse(requestId, { success: true });
    }).catch(function(err) {
      sendResponse(requestId, { success: false, message: err.message });
    });
    return;
  }

  // 其他 action 转发给 background
  chrome.runtime.sendMessage(payload, function(response) {
    sendResponse(requestId, response);
  });
});

function sendResponse(requestId, response) {
  window.postMessage({
    type: 'RESUME_EXT_RESPONSE',
    requestId: requestId,
    response: response
  }, '*');
}

// ===== 监听来自 background 的消息 =====
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'autofill') {
    FloatingUI.performAutofill();
  }
});

// 添加动画样式（用于旧版通知兼容）
var style = document.createElement('style');
style.textContent = '@keyframes slideIn{from{transform:translateX(400px);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes slideOut{from{transform:translateX(0);opacity:1}to{transform:translateX(400px);opacity:0}}';
document.head.appendChild(style);
