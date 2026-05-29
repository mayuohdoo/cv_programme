/**
 * FloatingUI - 浮动 UI 管理（Shadow DOM 隔离）
 * 包含：自动填充按钮、确认面板、记录投递按钮、通知
 */
var FloatingUI = (function() {
  'use strict';

  var container = null;
  var shadow = null;
  var triggerBtn = null;
  var confirmPanel = null;
  var recordBtn = null;
  var confirmTimeout = null;

  var CSS = '\
    :host { all: initial; }\
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; }\
    .af-trigger {\
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;\
      width: 52px; height: 52px; border-radius: 50%;\
      background: linear-gradient(135deg, #FFB7C5, #FF9DB3);\
      color: white; border: none; cursor: pointer;\
      box-shadow: 0 4px 16px rgba(255,157,179,0.4);\
      display: flex; align-items: center; justify-content: center;\
      font-size: 22px; transition: all 0.3s;\
      user-select: none;\
    }\
    .af-trigger:hover { transform: scale(1.1); box-shadow: 0 6px 24px rgba(255,157,179,0.6); }\
    .af-trigger.dragging { opacity: 0.8; transition: none; }\
    .af-confirm {\
      position: fixed; bottom: 90px; right: 24px; z-index: 2147483647;\
      background: white; border-radius: 12px; padding: 16px;\
      box-shadow: 0 8px 32px rgba(0,0,0,0.15); width: 280px;\
      animation: afSlideIn 0.3s ease;\
    }\
    @keyframes afSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }\
    .af-confirm-title { font-size: 14px; font-weight: 700; color: #333; margin-bottom: 8px; }\
    .af-confirm-stats { font-size: 12px; color: #666; margin-bottom: 8px; }\
    .af-confirm-stats span { color: #FF9DB3; font-weight: 700; }\
    .af-confirm-list { max-height: 120px; overflow-y: auto; margin-bottom: 10px; }\
    .af-confirm-item { font-size: 11px; color: #555; padding: 3px 0; border-bottom: 1px solid #f0f0f0; }\
    .af-confirm-item strong { color: #333; }\
    .af-confirm-actions { display: flex; gap: 8px; }\
    .af-btn { padding: 6px 14px; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }\
    .af-btn-undo { background: #f0f0f0; color: #666; }\
    .af-btn-undo:hover { background: #e0e0e0; }\
    .af-btn-close { background: #FFB7C5; color: white; }\
    .af-btn-close:hover { background: #FF9DB3; }\
    .af-record {\
      position: fixed; bottom: 86px; right: 24px; z-index: 2147483647;\
      background: linear-gradient(135deg, #FFB7C5, #FF9DB3);\
      color: white; border: none; border-radius: 24px;\
      padding: 8px 16px; font-size: 12px; font-weight: 600;\
      cursor: pointer; box-shadow: 0 4px 12px rgba(255,157,179,0.4);\
      animation: afSlideIn 0.3s ease; transition: all 0.2s;\
    }\
    .af-record:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255,157,179,0.6); }\
    .af-dialog {\
      position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);\
      z-index: 2147483647; background: white; border-radius: 16px;\
      padding: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); width: 320px;\
      animation: afSlideIn 0.3s ease;\
    }\
    .af-dialog-title { font-size: 16px; font-weight: 700; color: #333; margin-bottom: 16px; }\
    .af-dialog-tabs { display: flex; gap: 0; margin-bottom: 16px; border-bottom: 2px solid #f0f0f0; }\
    .af-dtab { flex:1; padding: 8px; border: none; background: transparent; font-size: 13px; font-weight: 600; color: #999; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }\
    .af-dtab:hover { color: #FF9DB3; }\
    .af-dtab.active { color: #FF9DB3; border-bottom-color: #FF9DB3; }\
    .af-dialog-body { min-height: 120px; }\
    .af-screenshot-upload { border: 2px dashed #FFB7C5; border-radius: 10px; padding: 24px; text-align: center; cursor: pointer; background: #FFF5F7; transition: all 0.2s; }\
    .af-screenshot-upload:hover { border-color: #FF9DB3; background: #FFE4E9; }\
    .af-screenshot-placeholder { color: #999; font-size: 14px; line-height: 1.8; }\
    .af-dialog-field { margin-bottom: 12px; }\
    .af-dialog-field label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }\
    .af-dialog-field input { width: 100%; padding: 8px 12px; border: 2px solid #FFE4E9; border-radius: 8px; font-size: 13px; outline: none; }\
    .af-dialog-field input:focus { border-color: #FFB7C5; }\
    .af-dialog-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }\
    .af-btn-save { background: #FFB7C5; color: white; padding: 8px 20px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }\
    .af-btn-save:hover { background: #FF9DB3; }\
    .af-btn-cancel { background: #f0f0f0; color: #666; padding: 8px 20px; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; }\
    .af-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 2147483646; }\
    .af-toast {\
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);\
      z-index: 2147483647; padding: 10px 20px; border-radius: 8px;\
      font-size: 13px; font-weight: 500; animation: afSlideIn 0.3s ease;\
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);\
    }\
    .af-toast-success { background: #d4edda; color: #155724; }\
    .af-toast-error { background: #f8d7da; color: #721c24; }\
    .af-toast-info { background: #d1ecf1; color: #0c5460; }\
    .hidden { display: none !important; }\
  ';

  /**
   * 初始化 Shadow DOM 容器
   */
  function init() {
    if (container) return;
    container = document.createElement('div');
    container.id = 'resume-autofill-ui';
    shadow = container.attachShadow({ mode: 'closed' });

    var style = document.createElement('style');
    style.textContent = CSS;
    shadow.appendChild(style);

    document.body.appendChild(container);
  }

  /**
   * 显示自动填充触发按钮 + 记录投递按钮
   */
  function showAutofillTrigger() {
    init();
    if (triggerBtn) return;

    // 填充按钮
    triggerBtn = document.createElement('button');
    triggerBtn.className = 'af-trigger';
    triggerBtn.innerHTML = '📋';
    triggerBtn.title = '一键填充简历';

    // 拖拽支持
    var isDragging = false, startX, startY, startRight, startBottom;
    triggerBtn.addEventListener('mousedown', function(e) {
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      startRight = parseInt(triggerBtn.style.right || '24');
      startBottom = parseInt(triggerBtn.style.bottom || '24');

      function onMove(ev) {
        var dx = ev.clientX - startX;
        var dy = ev.clientY - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          isDragging = true;
          triggerBtn.classList.add('dragging');
          triggerBtn.style.right = (startRight - dx) + 'px';
          triggerBtn.style.bottom = (startBottom + dy) + 'px';
        }
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        triggerBtn.classList.remove('dragging');
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    triggerBtn.addEventListener('click', function(e) {
      if (isDragging) { e.preventDefault(); return; }
      performAutofill();
    });

    shadow.appendChild(triggerBtn);

    // 记录投递按钮（始终显示，不依赖填充成功）
    showRecordButton();
  }

  /**
   * 隐藏触发按钮
   */
  function hideAutofillTrigger() {
    if (triggerBtn) { triggerBtn.remove(); triggerBtn = null; }
  }

  /**
   * 显示填充确认面板
   */
  function showConfirmation(result) {
    init();
    hideConfirmation();

    confirmPanel = document.createElement('div');
    confirmPanel.className = 'af-confirm';

    var filledCount = result.filled.length;
    var skippedCount = result.skipped.length;

    var listHTML = result.filled.map(function(item) {
      var displayValue = item.value.length > 20 ? item.value.substring(0, 20) + '...' : item.value;
      return '<div class="af-confirm-item"><strong>' + item.fieldName + '</strong>: ' + displayValue + '</div>';
    }).join('');

    confirmPanel.innerHTML = '\
      <div class="af-confirm-title">✅ 填充完成</div>\
      <div class="af-confirm-stats">成功 <span>' + filledCount + '</span> 个字段，跳过 ' + skippedCount + ' 个</div>\
      <div class="af-confirm-list">' + listHTML + '</div>\
      <div class="af-confirm-actions">\
        <button class="af-btn af-btn-undo">↩ 撤销</button>\
        <button class="af-btn af-btn-close">确认</button>\
      </div>';

    confirmPanel.querySelector('.af-btn-undo').addEventListener('click', function() {
      AutofillEngine.undo();
      hideConfirmation();
      showNotification('已撤销填充', 'info');
    });
    confirmPanel.querySelector('.af-btn-close').addEventListener('click', function() {
      hideConfirmation();
    });

    shadow.appendChild(confirmPanel);

    // 10 秒自动消失
    confirmTimeout = setTimeout(function() { hideConfirmation(); }, 10000);
  }

  function hideConfirmation() {
    if (confirmTimeout) { clearTimeout(confirmTimeout); confirmTimeout = null; }
    if (confirmPanel) { confirmPanel.remove(); confirmPanel = null; }
  }

  /**
   * 显示"记录本次投递"按钮
   */
  function showRecordButton() {
    init();
    hideRecordButton();
    recordBtn = document.createElement('button');
    recordBtn.className = 'af-record';
    recordBtn.textContent = '📌 记录本次投递';

    recordBtn.addEventListener('click', function() {
      showRecordDialog();
    });

    shadow.appendChild(recordBtn);
  }

  function hideRecordButton() {
    if (recordBtn) { recordBtn.remove(); recordBtn = null; }
  }

  /**
   * 显示记录投递确认对话框（支持截图解析 + 手动输入）
   */
  function showRecordDialog() {
    var company = InfoExtractor.extractCompany();
    var position = InfoExtractor.extractPosition();

    var overlay = document.createElement('div');
    overlay.className = 'af-overlay';

    var dialog = document.createElement('div');
    dialog.className = 'af-dialog';
    dialog.innerHTML = '\
      <div class="af-dialog-title">📌 记录本次投递</div>\
      <div class="af-dialog-tabs">\
        <button class="af-dtab active" data-mode="screenshot">📷 截图识别</button>\
        <button class="af-dtab" data-mode="manual">✏️ 手动输入</button>\
      </div>\
      <div class="af-dialog-body">\
        <div class="af-mode-screenshot">\
          <div class="af-screenshot-upload" id="af-screenshot-area">\
            <input type="file" id="af-screenshot-input" accept="image/*" style="display:none;" />\
            <div class="af-screenshot-placeholder">📷<br>点击上传投递成功截图<br><span style="font-size:11px;color:#999;">AI 自动识别公司和职位</span></div>\
            <img id="af-screenshot-preview" style="display:none;max-width:100%;border-radius:8px;" />\
          </div>\
          <div id="af-screenshot-status" style="display:none;text-align:center;padding:8px;font-size:12px;color:#666;"></div>\
        </div>\
        <div class="af-mode-manual" style="display:none;">\
          <div class="af-dialog-field">\
            <label>公司名称</label>\
            <input type="text" id="af-company" value="' + company.replace(/"/g, '&quot;') + '" />\
          </div>\
          <div class="af-dialog-field">\
            <label>投递职位</label>\
            <input type="text" id="af-position" value="' + position.replace(/"/g, '&quot;') + '" />\
          </div>\
        </div>\
      </div>\
      <div class="af-dialog-actions">\
        <button class="af-btn-cancel">取消</button>\
        <button class="af-btn-save" id="af-save-btn">保存记录</button>\
      </div>';

    // Tab 切换
    var tabs = dialog.querySelectorAll('.af-dtab');
    var screenshotMode = dialog.querySelector('.af-mode-screenshot');
    var manualMode = dialog.querySelector('.af-mode-manual');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        if (tab.getAttribute('data-mode') === 'screenshot') {
          screenshotMode.style.display = 'block';
          manualMode.style.display = 'none';
        } else {
          screenshotMode.style.display = 'none';
          manualMode.style.display = 'block';
        }
      });
    });

    // 截图上传
    var screenshotArea = dialog.querySelector('#af-screenshot-area');
    var screenshotInput = dialog.querySelector('#af-screenshot-input');
    var screenshotPreview = dialog.querySelector('#af-screenshot-preview');
    var screenshotStatus = dialog.querySelector('#af-screenshot-status');
    var parsedFromScreenshot = { company: '', position: '' };

    screenshotArea.addEventListener('click', function() { screenshotInput.click(); });
    screenshotInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        var base64 = ev.target.result;
        screenshotPreview.src = base64;
        screenshotPreview.style.display = 'block';
        dialog.querySelector('.af-screenshot-placeholder').style.display = 'none';
        screenshotStatus.style.display = 'block';
        screenshotStatus.textContent = '🔄 AI 正在识别...';
        // 调用 AI 解析截图
        parseScreenshot(base64).then(function(result) {
          parsedFromScreenshot = result;
          screenshotStatus.innerHTML = '✅ 识别完成<br><strong>公司：</strong>' + result.company + '<br><strong>职位：</strong>' + result.position;
        }).catch(function(err) {
          screenshotStatus.textContent = '❌ 识别失败：' + err.message + '（请切换到手动输入）';
        });
      };
      reader.readAsDataURL(file);
    });

    // 取消
    dialog.querySelector('.af-btn-cancel').addEventListener('click', function() {
      overlay.remove(); dialog.remove();
    });
    overlay.addEventListener('click', function() {
      overlay.remove(); dialog.remove();
    });

    // 保存
    dialog.querySelector('#af-save-btn').addEventListener('click', function() {
      var activeTab = dialog.querySelector('.af-dtab.active').getAttribute('data-mode');
      var companyVal, positionVal;

      if (activeTab === 'screenshot' && parsedFromScreenshot.company) {
        companyVal = parsedFromScreenshot.company;
        positionVal = parsedFromScreenshot.position;
      } else {
        companyVal = (dialog.querySelector('#af-company') || {}).value || company;
        positionVal = (dialog.querySelector('#af-position') || {}).value || position;
      }

      ApplicationStorage.addRecord({
        url: window.location.href,
        pageTitle: document.title,
        company: companyVal.trim() || company,
        position: positionVal.trim() || position
      }).then(function() {
        overlay.remove(); dialog.remove();
        hideRecordButton();
        showNotification('✅ 投递记录已保存！', 'success');
      }).catch(function(err) {
        showNotification('❌ 保存失败: ' + err.message, 'error');
      });
    });

    shadow.appendChild(overlay);
    shadow.appendChild(dialog);
  }

  /**
   * 用 DeepSeek AI 解析截图，提取公司和职位
   */
  function parseScreenshot(base64Image) {
    return new Promise(function(resolve, reject) {
      // 从 chrome.storage 获取 API Key
      chrome.storage.local.get(['deepseekApiKey'], function(result) {
        var apiKey = result.deepseekApiKey;
        if (!apiKey) {
          reject(new Error('请先在插件设置中配置 DeepSeek API Key'));
          return;
        }

        // 发送给 background.js 处理（避免 CORS）
        chrome.runtime.sendMessage({
          action: 'parseScreenshot',
          imageBase64: base64Image,
          apiKey: apiKey
        }, function(response) {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response ? response.message : '解析失败'));
          }
        });
      });
    });
  }

  /**
   * 显示通知
   */
  function showNotification(message, type) {
    init();
    var toast = document.createElement('div');
    toast.className = 'af-toast af-toast-' + type;
    toast.textContent = message;
    shadow.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
  }

  /**
   * 执行自动填充流程（AI 智能匹配 + 传统匹配 fallback）
   */
  function performAutofill() {
    chrome.storage.local.get(['resume', 'deepseekApiKey'], function(result) {
      var resume = result.resume;
      if (!resume) {
        showNotification('请先在扩展中上传并解析简历', 'info');
        return;
      }

      showNotification('🔍 AI 正在分析页面表单...', 'info');

      // 提取页面表单元素的上下文
      var formContext = extractFormContext();

      if (formContext.length === 0) {
        showNotification('未找到表单字段', 'info');
        return;
      }

      var apiKey = result.deepseekApiKey;
      if (apiKey) {
        // AI 智能匹配模式
        chrome.runtime.sendMessage({
          action: 'aiFieldMatch',
          formContext: formContext,
          resumeFields: Object.keys(resume).filter(function(k) { return resume[k] && typeof resume[k] === 'string' && resume[k].length > 0; }),
          apiKey: apiKey
        }, function(response) {
          if (chrome.runtime.lastError || !response || !response.success) {
            // AI 失败，回退到传统匹配
            console.log('AI 匹配失败，使用传统匹配');
            doTraditionalFill(resume);
            return;
          }
          // AI 返回了映射，按映射填充
          doAIFill(resume, response.mapping, formContext);
        });
      } else {
        // 没有 API Key，直接用传统匹配
        doTraditionalFill(resume);
      }
    });
  }

  /**
   * 提取页面所有表单元素的上下文信息
   */
  function extractFormContext() {
    var elements = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="password"]), textarea, select, [contenteditable="true"], [role="textbox"]');
    var context = [];

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      // 跳过不可见元素
      var rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;

      // 收集上下文
      var info = {
        index: i,
        tag: el.tagName.toLowerCase(),
        type: el.type || '',
        id: el.id || '',
        name: el.getAttribute('name') || '',
        placeholder: el.getAttribute('placeholder') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        label: getElementLabel(el),
        nearbyText: getNearbyText(el)
      };

      // 只保留有意义的上下文
      if (info.label || info.placeholder || info.name || info.ariaLabel || info.nearbyText) {
        context.push(info);
      }
    }

    return context;
  }

  /**
   * 获取元素关联的 label 文本
   */
  function getElementLabel(el) {
    if (el.id) {
      var label = document.querySelector('label[for="' + el.id + '"]');
      if (label) return label.textContent.trim().substring(0, 50);
    }
    var parent = el.closest('label');
    if (parent) return parent.textContent.trim().substring(0, 50);
    // 查找父容器中的 label
    var wrapper = el.closest('[class*="form"], [class*="field"], [class*="item"], [class*="group"]');
    if (wrapper) {
      var lbl = wrapper.querySelector('label, [class*="label"], [class*="title"]');
      if (lbl && lbl !== el) return lbl.textContent.trim().substring(0, 50);
    }
    return '';
  }

  /**
   * 获取元素附近的文本（前一个兄弟元素）
   */
  function getNearbyText(el) {
    var prev = el.previousElementSibling;
    if (prev) {
      var text = prev.textContent.trim();
      if (text.length > 0 && text.length < 50) return text;
    }
    return '';
  }

  /**
   * AI 匹配后填充
   */
  function doAIFill(resume, mapping, formContext) {
    var elements = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="password"]), textarea, select, [contenteditable="true"], [role="textbox"]');
    var filled = 0;
    var total = Object.keys(mapping).length;

    Object.keys(mapping).forEach(function(indexStr) {
      var fieldName = mapping[indexStr];
      var idx = parseInt(indexStr);
      if (isNaN(idx) || idx >= elements.length) return;

      var el = elements[idx];
      var value = getResumeFieldValue(resume, fieldName);
      if (!value) return;

      try {
        fillElement(el, value);
        filled++;
      } catch (e) {
        console.error('填充失败:', e);
      }
    });

    if (filled > 0) {
      showNotification('✅ AI 智能填充完成！成功 ' + filled + '/' + total + ' 个字段', 'success');
      showRecordButton();
    } else {
      showNotification('未能填充任何字段', 'info');
    }
  }

  /**
   * 传统匹配填充（fallback）
   */
  function doTraditionalFill(resume) {
    var fillResult = AutofillEngine.fill(resume);
    if (fillResult.filled.length > 0) {
      showConfirmation(fillResult);
    } else {
      showNotification('未找到可填充的表单字段', 'info');
    }
  }

  /**
   * 获取简历字段值
   */
  function getResumeFieldValue(resume, fieldName) {
    if (fieldName === 'workExperience' && resume.workExperiences && resume.workExperiences.length > 0) {
      return resume.workExperiences.map(function(exp) {
        return (exp.company || '') + ' ' + (exp.position || '') + ' ' + (exp.period || '') + '\n' + (exp.description || '');
      }).join('\n\n');
    }
    return resume[fieldName] || '';
  }

  /**
   * 填充单个元素
   */
  function fillElement(el, value) {
    if (el.tagName === 'SELECT') {
      var options = Array.from(el.options);
      var match = options.find(function(o) { return o.text.indexOf(value) !== -1 || value.indexOf(o.text) !== -1; });
      if (match) el.value = match.value;
    } else if (el.getAttribute('contenteditable') === 'true') {
      el.textContent = value;
    } else {
      var maxLen = el.getAttribute('maxlength');
      if (maxLen) value = value.substring(0, parseInt(maxLen));
      // React 兼容
      var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (el.tagName === 'TEXTAREA') setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
      if (setter && setter.set) setter.set.call(el, value);
      else el.value = value;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  return {
    showAutofillTrigger: showAutofillTrigger,
    hideAutofillTrigger: hideAutofillTrigger,
    showConfirmation: showConfirmation,
    showRecordButton: showRecordButton,
    hideRecordButton: hideRecordButton,
    showNotification: showNotification,
    performAutofill: performAutofill
  };
})();
