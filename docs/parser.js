/**
 * 智能简历解析器 - 网站集成版
 * 从 Chrome 扩展 V6 适配而来，使用 localStorage 替代 chrome.storage
 * 支持 PDF/DOCX/TXT 解析，DeepSeek AI + 正则回退
 */
(function() {
  'use strict';

  // --- 元素引用 ---
  const parserModalOverlay = document.getElementById('parserModalOverlay');
  const settingsModalOverlay = document.getElementById('settingsModalOverlay');
  const btnSmartParser = document.getElementById('btnSmartParser');
  const parserCloseBtn = document.getElementById('parserCloseBtn');
  const settingsCloseBtn = document.getElementById('settingsCloseBtn');
  const parserTabs = document.querySelectorAll('.parser-tab[data-parser-tab]');
  const parserUploadTab = document.getElementById('parserUploadTab');
  const parserManualTab = document.getElementById('parserManualTab');
  const parserUploadArea = document.getElementById('parserUploadArea');
  const parserFileInput = document.getElementById('parserFileInput');
  const parserFileInfo = document.getElementById('parserFileInfo');
  const parserFileName = document.getElementById('parserFileName');
  const parserFileSize = document.getElementById('parserFileSize');
  const parserParseBtn = document.getElementById('parserParseBtn');
  const parserEditBtn = document.getElementById('parserEditBtn');
  const parserSettingsBtn = document.getElementById('parserSettingsBtn');
  const parserLoading = document.getElementById('parserLoading');
  const parserStatus = document.getElementById('parserStatus');
  const parserPreview = document.getElementById('parserPreview');
  const parserManualForm = document.getElementById('parserManualForm');
  const parserFormStatus = document.getElementById('parserFormStatus');
  const settingsApiKey = document.getElementById('settingsApiKey');
  const settingsTestBtn = document.getElementById('settingsTestBtn');
  const settingsSaveBtn = document.getElementById('settingsSaveBtn');
  const settingsStatus = document.getElementById('settingsStatus');

  let parserSelectedFile = null;
  let libsLoaded = false;

  // --- Toast 通知 ---
  function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = 'parser-toast ' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(function() { toast.classList.add('show'); });
    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  }

  function showStatusMsg(el, message, type) {
    el.textContent = message;
    el.className = 'parser-status-msg ' + type;
    el.style.display = 'block';
  }
  function hideStatusMsg(el) { el.style.display = 'none'; }

  // --- 模态框开关 ---
  function openParserModal() {
    parserModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    loadLibraries();
    prefillManualForm();
  }
  function closeParserModal() {
    parserModalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  function openSettingsModal() {
    settingsModalOverlay.classList.add('active');
    var key = localStorage.getItem('deepseekApiKey') || '';
    settingsApiKey.value = key;
    hideStatusMsg(settingsStatus);
  }
  function closeSettingsModal() {
    settingsModalOverlay.classList.remove('active');
  }

  btnSmartParser.addEventListener('click', openParserModal);
  parserCloseBtn.addEventListener('click', closeParserModal);
  settingsCloseBtn.addEventListener('click', closeSettingsModal);
  parserModalOverlay.addEventListener('click', function(e) {
    if (e.target === parserModalOverlay) closeParserModal();
  });
  settingsModalOverlay.addEventListener('click', function(e) {
    if (e.target === settingsModalOverlay) closeSettingsModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (settingsModalOverlay.classList.contains('active')) closeSettingsModal();
      else if (parserModalOverlay.classList.contains('active')) closeParserModal();
    }
  });

  // --- Tab 切换 ---
  parserTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      parserTabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var tabName = tab.dataset.parserTab;
      if (tabName === 'upload') {
        parserUploadTab.classList.add('active');
        parserManualTab.classList.remove('active');
      } else {
        parserUploadTab.classList.remove('active');
        parserManualTab.classList.add('active');
        prefillManualForm();
      }
    });
  });

  // --- 设置按钮 ---
  parserSettingsBtn.addEventListener('click', openSettingsModal);

  // --- 文件上传 ---
  parserUploadArea.addEventListener('click', function() { parserFileInput.click(); });
  parserFileInput.addEventListener('change', function(e) {
    if (e.target.files[0]) handleParserFile(e.target.files[0]);
  });
  parserUploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    parserUploadArea.classList.add('dragover');
  });
  parserUploadArea.addEventListener('dragleave', function() {
    parserUploadArea.classList.remove('dragover');
  });
  parserUploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    parserUploadArea.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleParserFile(e.dataTransfer.files[0]);
  });

  function handleParserFile(file) {
    var ext = file.name.split('.').pop().toLowerCase();
    if (['pdf', 'docx', 'txt'].indexOf(ext) === -1) {
      showStatusMsg(parserStatus, '不支持的文件格式，请上传 PDF、DOCX 或 TXT 文件', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showStatusMsg(parserStatus, '文件过大，请上传小于 10MB 的文件', 'error');
      return;
    }
    parserSelectedFile = file;
    parserFileName.textContent = '\u{1F4CE} ' + file.name;
    parserFileSize.textContent = (file.size / 1024).toFixed(1) + ' KB';
    parserFileInfo.style.display = 'block';
    parserParseBtn.disabled = false;
    hideStatusMsg(parserStatus);

    // 自动开始解析 - 用户上传后立即解析
    startParsing();
  }

  // --- 动态加载库 ---
  function loadLibraries() {
    if (libsLoaded) return Promise.resolve();
    return new Promise(function(resolve) {
      var loaded = 0;
      function check() { if (++loaded >= 2) { libsLoaded = true; resolve(); } }

      if (typeof pdfjsLib === 'undefined') {
        var s1 = document.createElement('script');
        s1.src = 'libs/pdf.min.js';
        s1.onload = function() {
          if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/pdf.worker.min.js';
          }
          check();
        };
        s1.onerror = check;
        document.head.appendChild(s1);
      } else { check(); }

      if (typeof mammoth === 'undefined') {
        var s2 = document.createElement('script');
        s2.src = 'libs/mammoth.browser.min.js';
        s2.onload = check;
        s2.onerror = check;
        document.head.appendChild(s2);
      } else { check(); }
    });
  }

  // --- 文本提取 ---
  async function extractPdfText(file) {
    if (typeof pdfjsLib === 'undefined') throw new Error('PDF 库未加载');
    var arrayBuffer = await file.arrayBuffer();
    var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    var fullText = '';
    for (var i = 1; i <= pdf.numPages; i++) {
      var page = await pdf.getPage(i);
      var tc = await page.getTextContent();
      fullText += tc.items.map(function(item) { return item.str; }).join(' ') + '\n';
    }
    return fullText;
  }

  async function extractDocxText(file) {
    if (typeof mammoth === 'undefined') throw new Error('DOCX 库未加载');
    var arrayBuffer = await file.arrayBuffer();
    var result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    return result.value;
  }

  function readTxtFile(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) { resolve(e.target.result); };
      reader.onerror = function() { reject(new Error('文件读取失败')); };
      reader.readAsText(file, 'UTF-8');
    });
  }

  // --- DeepSeek AI 解析 ---
  async function parseWithAI(text, apiKey) {
    var prompt = '你是一个专业的简历解析助手。请从以下简历文本中提取结构化信息，并以 JSON 格式返回。\n\n简历文本：\n' + text + '\n\n请提取以下信息（如果某项信息不存在，请返回空字符串或空数组）：\n1. name: 姓名\n2. email: 邮箱地址\n3. phone: 电话号码（保留原格式）\n4. education: 学校名称\n5. major: 专业名称\n6. degree: 学历（本科/硕士/博士/大专等）\n7. graduationDate: 毕业时间\n8. workExperiences: 工作经验数组，每段经历包含：company, position, period, description\n9. workExperience: 所有工作经验的合并文本\n10. skills: 技能列表（用分号分隔）\n11. skillsDetailed: 技能详细分类（JSON对象，key是分类名，value是该分类下的技能描述）\n12. introduction: 自我介绍或自我评价\n\n注意：\n- 对于"深圳大学-金融科技专业 2023.9-2027.6"格式，拆分为 education="深圳大学", major="金融科技", graduationDate="2027-06"\n- 对于技能，如果有明确分类（如"语言："、"编程技能："），保留到 skillsDetailed\n- 只返回 JSON 对象，不要包含其他文字';

    var response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一个专业的简历解析助手，擅长从各种格式的简历中准确提取结构化信息。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      var err = await response.json().catch(function() { return {}; });
      throw new Error('API 调用失败：' + (err.error && err.error.message ? err.error.message : response.status));
    }

    var data = await response.json();
    var aiResponse = data.choices[0].message.content;

    var jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 响应格式错误');

    var parsed = JSON.parse(jsonMatch[0]);
    var defaults = { name:'', email:'', phone:'', education:'', major:'', degree:'', graduationDate:'', workExperiences:[], workExperience:'', skills:'', skillsDetailed:{}, introduction:'' };
    return Object.assign({}, defaults, parsed);
  }

  // --- 正则回退解析 ---
  function parseWithRegex(text) {
    var data = { name:'', email:'', phone:'', education:'', major:'', degree:'', graduationDate:'', workExperiences:[], workExperience:'', skills:'', skillsDetailed:{}, introduction:'' };
    var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });

    // 邮箱
    var emailMatch = text.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) data.email = emailMatch[1];

    // 电话
    var phoneMatch = text.match(/(?:^|[^\d])(\+?86[\s\-]?)?1[3-9]\d{9}(?:[^\d]|$)/);
    if (phoneMatch) data.phone = phoneMatch[0].replace(/[^\d+]/g, '');

    // 姓名
    if (lines.length > 0) {
      var parts = lines[0].split(/[\s|｜]+/);
      for (var p = 0; p < parts.length; p++) {
        var cleaned = parts[p].trim();
        if (cleaned.length >= 2 && cleaned.length <= 15 && cleaned.indexOf('@') === -1 && !/\d{6,}/.test(cleaned) && !/^(?:电话|手机|邮箱|phone|email)/i.test(cleaned)) {
          data.name = cleaned;
          break;
        }
      }
    }

    // 教育背景
    var eduSection = text.match(/教育背景[\s\S]{0,500}/i);
    var eduText = eduSection ? eduSection[0] : text;
    var eduLines = eduText.split('\n').filter(function(line) { return /(?:大学|学院|University|College)/i.test(line); });
    if (eduLines.length > 0) {
      var eduLine = eduLines[0];
      var schoolMatch = eduLine.match(/([^\d\s]{2,10}(?:大学|学院))/);
      if (schoolMatch) data.education = schoolMatch[1];
      var majorMatch = eduLine.match(/(?:大学|学院)[\s\-\u2014\u2013\u00b7]*([^\d\s]{2,15})(?:专业)?[\s\d]/);
      if (majorMatch) { var m = majorMatch[1].trim().replace(/专业$/, ''); if (m.length >= 2 && m.length <= 20) data.major = m; }
      var dateMatch = eduLine.match(/(\d{4})[\.\-\/年]*(\d{1,2})?[\s\-\u2014\u2013]*(\d{4})[\.\-\/年]*(\d{1,2})?/);
      if (dateMatch) data.graduationDate = dateMatch[4] ? dateMatch[3] + '-' + dateMatch[4].padStart(2, '0') : dateMatch[3];
    }

    // 学历
    var degreeMatch = eduText.match(/(博士|硕士|学士|本科|研究生|大专)/i);
    if (degreeMatch) {
      var map = { '博士':'博士', '硕士':'硕士', '研究生':'硕士', '学士':'本科', '本科':'本科', '大专':'大专' };
      data.degree = map[degreeMatch[1]] || degreeMatch[1];
    }

    // 技能
    var skillsSection = text.match(/(?:技能|Skills?)[\s&]*(?:自我评价)?[\s\S]{0,800}/i);
    if (skillsSection) {
      var skillsText = skillsSection[0];
      var categories = skillsText.match(/([^\n:：]{2,15})[:：]([^\n]{10,200})/g);
      if (categories && categories.length > 0) {
        var allSkills = [];
        categories.forEach(function(cat) {
          var cm = cat.match(/([^\n:：]{2,15})[:：]([^\n]{10,200})/);
          if (cm && !/自我评价|自我介绍|个人简介/i.test(cm[1])) {
            data.skillsDetailed[cm[1].trim()] = cm[2].trim();
            allSkills.push(cm[2].trim());
          }
        });
        data.skills = allSkills.join('；');
      } else {
        data.skills = skillsText.split('\n').slice(1, 4).join(' ').trim().substring(0, 300);
      }
    }

    // 工作经验
    var workSection = text.match(/(?:实习经验|工作经历|工作经验|Experience)[\s\S]{0,500}/i);
    if (workSection) {
      var workText = workSection[0].split(/\n\n/)[0].trim().substring(0, 300);
      if (workText.length > 20) data.workExperience = workText;
    }

    // 自我介绍
    var introMatch = text.match(/(?:自我评价|自我介绍|个人简介)[:：\s]*([^\n]{20,300})/i);
    if (introMatch) data.introduction = introMatch[1].trim();

    return data;
  }

  // --- 主解析流程 ---
  parserParseBtn.addEventListener('click', function() { startParsing(); });

  async function startParsing() {
    if (!parserSelectedFile) return;

    parserLoading.style.display = 'block';
    parserParseBtn.disabled = true;
    parserPreview.style.display = 'none';
    parserEditBtn.style.display = 'none';
    hideStatusMsg(parserStatus);

    try {
      await loadLibraries();

      // 提取文本
      var text = '';
      var ext = parserSelectedFile.name.split('.').pop().toLowerCase();
      if (ext === 'pdf') {
        text = await extractPdfText(parserSelectedFile);
      } else if (ext === 'docx' || ext === 'doc') {
        text = await extractDocxText(parserSelectedFile);
      } else {
        text = await readTxtFile(parserSelectedFile);
      }

      if (!text || text.trim().length === 0) throw new Error('文件内容为空或无法提取文本');

      // 解析
      var apiKey = localStorage.getItem('deepseekApiKey');
      var resumeData;

      if (apiKey) {
        try {
          resumeData = await parseWithAI(text, apiKey);
        } catch (aiErr) {
          console.error('AI 解析失败，回退到正则:', aiErr);
          showStatusMsg(parserStatus, '⚠️ AI 解析失败，使用备用方案...', 'warning');
          resumeData = parseWithRegex(text);
        }
      } else {
        showStatusMsg(parserStatus, '💡 提示：配置 DeepSeek API 可获得更准确的解析结果', 'info');
        resumeData = parseWithRegex(text);
      }

      // 检查必填字段
      var missing = [];
      if (!resumeData.name) missing.push('姓名');
      if (!resumeData.email) missing.push('邮箱');
      if (!resumeData.phone) missing.push('电话');

      // 保存到 localStorage
      localStorage.setItem('resume', JSON.stringify(resumeData));

      // 显示预览
      renderPreview(resumeData);
      parserPreview.style.display = 'block';
      parserEditBtn.style.display = 'inline-block';

      if (missing.length > 0) {
        showStatusMsg(parserStatus, '⚠️ 部分信息未提取到：' + missing.join('、') + '。已保存其他信息，请点击"编辑"补充。', 'warning');
      } else {
        showToast('✅ 解析成功！已提取：' + resumeData.name, 'success');
      }

    } catch (err) {
      console.error('解析失败:', err);
      showStatusMsg(parserStatus, '❌ ' + err.message, 'error');
    } finally {
      parserLoading.style.display = 'none';
      parserParseBtn.disabled = false;
    }
  }

  // --- 预览渲染 ---
  function renderPreview(data) {
    var fields = [
      { label: '姓名', key: 'name', required: true },
      { label: '邮箱', key: 'email', required: true },
      { label: '电话', key: 'phone', required: true },
      { label: '学校', key: 'education' },
      { label: '专业', key: 'major' },
      { label: '学历', key: 'degree' },
      { label: '毕业时间', key: 'graduationDate' }
    ];

    var html = '<div style="margin-bottom:10px;font-weight:700;color:var(--sakura-primary);">解析结果预览</div>';

    fields.forEach(function(f) {
      var val = data[f.key] || '';
      var cls = val ? 'preview-value' : 'preview-value empty';
      var mark = f.required ? ' *' : '';
      html += '<div class="preview-item"><div class="preview-label">' + f.label + mark + ':</div><div class="' + cls + '">' + (val || '未提取') + '</div></div>';
    });

    // 工作经验
    if (data.workExperiences && data.workExperiences.length > 0) {
      html += '<div class="preview-item"><div class="preview-label">工作经验:</div><div class="preview-value">' + data.workExperiences.length + ' 段</div></div>';
      data.workExperiences.forEach(function(exp, i) {
        html += '<div class="preview-card"><div class="preview-card-title">' + (i+1) + '. ' + (exp.company || '未知公司') + '</div><div class="preview-card-detail">';
        if (exp.position) html += '<div>职位：' + exp.position + '</div>';
        if (exp.period) html += '<div>时间：' + exp.period + '</div>';
        if (exp.description) html += '<div>描述：' + exp.description.substring(0, 100) + '</div>';
        html += '</div></div>';
      });
    } else if (data.workExperience) {
      html += '<div class="preview-item"><div class="preview-label">工作经验:</div><div class="preview-value">' + data.workExperience.substring(0, 100) + '</div></div>';
    }

    // 技能
    if (data.skillsDetailed && Object.keys(data.skillsDetailed).length > 0) {
      html += '<div class="preview-item"><div class="preview-label">技能:</div><div class="preview-value"></div></div>';
      Object.entries(data.skillsDetailed).forEach(function(entry) {
        html += '<div class="preview-skill-category"><strong>' + entry[0] + ':</strong> <span>' + entry[1] + '</span></div>';
      });
    } else if (data.skills) {
      html += '<div class="preview-item"><div class="preview-label">技能:</div><div class="preview-value">' + data.skills + '</div></div>';
    }

    // 自我介绍
    if (data.introduction) {
      html += '<div class="preview-item"><div class="preview-label">自我介绍:</div><div class="preview-value">' + data.introduction.substring(0, 150) + '</div></div>';
    }

    parserPreview.innerHTML = html;
  }

  // --- 编辑按钮 ---
  parserEditBtn.addEventListener('click', function() {
    document.querySelector('[data-parser-tab="manual"]').click();
  });

  // --- 手动填写表单 ---
  function prefillManualForm() {
    try {
      var saved = JSON.parse(localStorage.getItem('resume') || '{}');
      document.getElementById('parserName').value = saved.name || '';
      document.getElementById('parserEmail').value = saved.email || '';
      document.getElementById('parserPhone').value = saved.phone || '';
      document.getElementById('parserEducation').value = saved.education || '';
      document.getElementById('parserMajor').value = saved.major || '';
      document.getElementById('parserDegree').value = saved.degree || '';
      document.getElementById('parserGradDate').value = saved.graduationDate || '';

      var workText = '';
      if (saved.workExperiences && saved.workExperiences.length > 0) {
        workText = saved.workExperiences.map(function(exp) {
          var t = '';
          if (exp.company) t += exp.company;
          if (exp.position) t += ' - ' + exp.position;
          if (exp.period) t += ' (' + exp.period + ')';
          if (exp.description) t += '\n' + exp.description;
          return t;
        }).join('\n\n');
      } else {
        workText = saved.workExperience || '';
      }
      document.getElementById('parserWorkExp').value = workText;
      document.getElementById('parserSkills').value = saved.skills || '';
      document.getElementById('parserIntro').value = saved.introduction || '';
    } catch (e) { /* ignore */ }
  }

  parserManualForm.addEventListener('submit', function(e) {
    e.preventDefault();
    hideStatusMsg(parserFormStatus);

    var name = document.getElementById('parserName').value.trim();
    var email = document.getElementById('parserEmail').value.trim();
    var phone = document.getElementById('parserPhone').value.trim();

    if (!name || !email || !phone) {
      showStatusMsg(parserFormStatus, '请填写所有必填字段（姓名、邮箱、电话）', 'error');
      return;
    }

    var resumeData = {
      name: name,
      email: email,
      phone: phone,
      education: document.getElementById('parserEducation').value.trim(),
      major: document.getElementById('parserMajor').value.trim(),
      degree: document.getElementById('parserDegree').value,
      graduationDate: document.getElementById('parserGradDate').value.trim(),
      workExperience: document.getElementById('parserWorkExp').value.trim(),
      skills: document.getElementById('parserSkills').value.trim(),
      introduction: document.getElementById('parserIntro').value.trim()
    };

    localStorage.setItem('resume', JSON.stringify(resumeData));
    showToast('✅ 简历保存成功！', 'success');
    showStatusMsg(parserFormStatus, '✅ 简历保存成功！', 'success');

    setTimeout(function() { closeParserModal(); }, 1500);
  });

  // --- 设置功能 ---
  settingsSaveBtn.addEventListener('click', function() {
    var key = settingsApiKey.value.trim();
    if (!key.startsWith('sk-')) {
      showStatusMsg(settingsStatus, 'API Key 格式不正确，应该以 sk- 开头', 'error');
      return;
    }
    localStorage.setItem('deepseekApiKey', key);
    showStatusMsg(settingsStatus, '✅ API Key 已保存', 'success');
  });

  settingsTestBtn.addEventListener('click', async function() {
    var key = settingsApiKey.value.trim();
    if (!key.startsWith('sk-')) {
      showStatusMsg(settingsStatus, 'API Key 格式不正确，应该以 sk- 开头', 'error');
      return;
    }

    settingsTestBtn.disabled = true;
    settingsTestBtn.textContent = '测试中...';
    hideStatusMsg(settingsStatus);

    try {
      var response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: '你好' }],
          max_tokens: 10
        })
      });

      if (response.ok) {
        showStatusMsg(settingsStatus, '✅ 连接成功！API Key 有效', 'success');
      } else {
        var err = await response.json().catch(function() { return {}; });
        showStatusMsg(settingsStatus, '❌ 连接失败：' + (err.error && err.error.message ? err.error.message : '状态码 ' + response.status), 'error');
      }
    } catch (err) {
      showStatusMsg(settingsStatus, '❌ 网络请求失败，请检查网络连接', 'error');
    } finally {
      settingsTestBtn.disabled = false;
      settingsTestBtn.textContent = '测试连接';
    }
  });

})();
