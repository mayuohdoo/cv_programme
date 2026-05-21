/**
 * Popup Script V6 - AI 智能解析版本
 * 使用 DeepSeek API 进行智能简历解析
 */

// DOM 元素
const tabs = document.querySelectorAll('.tab');
const uploadTab = document.getElementById('uploadTab');
const manualTab = document.getElementById('manualTab');
const uploadSection = document.getElementById('uploadSection');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const parseBtn = document.getElementById('parseBtn');
const autofillBtn1 = document.getElementById('autofillBtn1');
const autofillBtn2 = document.getElementById('autofillBtn2');
const loading = document.getElementById('loading');
const status1 = document.getElementById('status1');
const status2 = document.getElementById('status2');
const form = document.getElementById('resumeForm');
const previewSection = document.getElementById('previewSection');
const previewContent = document.getElementById('previewContent');
const editBtn = document.getElementById('editBtn');
const settingsBtn = document.getElementById('settingsBtn');

let selectedFile = null;

// 标签页切换
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    if (tabName === 'upload') {
      uploadTab.classList.add('active');
      manualTab.classList.remove('active');
    } else {
      uploadTab.classList.remove('active');
      manualTab.classList.add('active');
    }
  });
});

// 设置按钮
settingsBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
});

// 文件上传
uploadSection.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleFileSelect(file);
});

uploadSection.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadSection.style.borderColor = '#FF1493';
});

uploadSection.addEventListener('dragleave', () => {
  uploadSection.style.borderColor = '#FFB6C1';
});

uploadSection.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadSection.style.borderColor = '#FFB6C1';
  const file = e.dataTransfer.files[0];
  if (file) handleFileSelect(file);
});

function handleFileSelect(file) {
  selectedFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = `文件大小: ${(file.size / 1024).toFixed(2)} KB`;
  fileInfo.classList.add('active');
  parseBtn.disabled = false;
  showStatus('文件已选择，点击"解析简历"开始解析', 'info', status1);
}

// 解析简历
parseBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    showStatus('请先选择文件', 'error', status1);
    return;
  }
  
  loading.classList.add('active');
  parseBtn.disabled = true;
  status1.className = 'status';
  
  try {
    console.log('开始解析文件:', selectedFile.name, selectedFile.type);
    
    let text = '';
    const fileType = selectedFile.type;
    const fileExt = selectedFile.name.split('.').pop().toLowerCase();
    
    // 根据文件类型选择解析方法
    if (fileType === 'application/pdf' || fileExt === 'pdf') {
      text = await extractPDF(selectedFile);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               fileType === 'application/msword' || 
               fileExt === 'docx' || fileExt === 'doc') {
      text = await extractDOCX(selectedFile);
    } else if (fileType === 'text/plain' || fileExt === 'txt') {
      text = await readTextFile(selectedFile);
    } else {
      throw new Error('不支持的文件格式，请上传 PDF、DOCX 或 TXT 文件');
    }
    
    console.log('文本提取成功，长度:', text.length);
    console.log('前200字符:', text.substring(0, 200));
    
    if (!text || text.trim().length === 0) {
      throw new Error('文件内容为空或无法提取文本');
    }
    
    // 使用 AI 解析简历
    console.log('开始 AI 解析简历...');
    const resumeData = await parseResumeWithAI(text);
    console.log('AI 解析结果:', resumeData);
    
    // 检查必填字段
    const missingFields = [];
    if (!resumeData.name) missingFields.push('姓名');
    if (!resumeData.email) missingFields.push('邮箱');
    if (!resumeData.phone) missingFields.push('电话');
    
    if (missingFields.length > 0) {
      // 仍然保存已提取的信息
      await chrome.storage.local.set({ resume: resumeData });
      
      loading.classList.remove('active');
      parseBtn.disabled = false;
      
      // 显示解析结果预览（即使不完整）
      showPreview(resumeData);
      
      showStatus(
        `⚠️ 部分信息未提取到：${missingFields.join('、')}。\n` +
        `已保存其他信息，请点击"编辑"补充。`,
        'info',
        status1
      );
      
      // 启用自动填充（即使信息不完整）
      autofillBtn1.disabled = false;
      autofillBtn2.disabled = false;
      
      return;
    }
    
    // 保存到 storage
    await chrome.storage.local.set({ resume: resumeData });
    console.log('简历已保存');
    
    loading.classList.remove('active');
    showStatus(`✅ 解析成功！已提取：${resumeData.name}`, 'success', status1);
    
    // 显示解析结果预览
    showPreview(resumeData);
    
    autofillBtn1.disabled = false;
    autofillBtn2.disabled = false;
    
  } catch (error) {
    console.error('解析失败:', error);
    loading.classList.remove('active');
    parseBtn.disabled = false;
    showStatus(`❌ ${error.message}`, 'error', status1);
  }
});

/**
 * 使用 DeepSeek AI 解析简历
 */
async function parseResumeWithAI(text) {
  // 检查是否配置了 API Key
  const result = await chrome.storage.local.get(['deepseekApiKey']);
  const apiKey = result.deepseekApiKey;
  
  if (!apiKey) {
    console.log('未配置 API Key，使用正则表达式解析');
    showStatus('💡 提示：配置 DeepSeek API 可获得更准确的解析结果', 'info', status1);
    return parseResumeWithRegex(text);
  }
  
  try {
    // 构建 AI 提示词
    const prompt = `你是一个专业的简历解析助手。请从以下简历文本中提取结构化信息，并以 JSON 格式返回。

简历文本：
${text}

请提取以下信息（如果某项信息不存在，请返回空字符串或空数组）：
1. name: 姓名
2. email: 邮箱地址
3. phone: 电话号码（保留原格式）
4. education: 学校名称（仅学校名，不包含专业和时间）
5. major: 专业名称（仅专业名）
6. degree: 学历（本科/硕士/博士/大专等）
7. graduationDate: 毕业时间（格式：YYYY-MM）
8. workExperiences: 工作经验数组，每段经历包含：
   - company: 公司名称
   - position: 职位名称
   - period: 时间段（如"2023.06-2023.09"）
   - description: 工作内容描述（100字以内）
9. workExperience: 所有工作经验的合并文本（用于兼容旧版本，200字以内）
10. skills: 技能列表（用分号分隔）
11. skillsDetailed: 技能详细分类（JSON对象，key是分类名如"语言"、"编程技能"等，value是该分类下的技能描述）
12. introduction: 自我介绍或自我评价（200字以内）

注意事项：
- 对于教育背景，如果格式是"深圳大学-金融科技专业 2023.9-2027.6"，请正确拆分为：education="深圳大学", major="金融科技", graduationDate="2027-06"
- 对于工作经验，请识别每一段独立的经历，提取公司名、职位、时间段和工作内容
- 对于技能，如果简历中有明确的分类（如"语言："、"编程技能："等），请保留这些分类到 skillsDetailed 中
- 电话号码保留原始格式，不要添加或删除任何字符
- 只返回 JSON 对象，不要包含任何其他文字

返回格式示例：
{
  "name": "张三",
  "email": "zhangsan@example.com",
  "phone": "13800138000",
  "education": "深圳大学",
  "major": "金融科技",
  "degree": "本科",
  "graduationDate": "2027-06",
  "workExperiences": [
    {
      "company": "Chainopera",
      "position": "AI企业担任战略实习生",
      "period": "2024.01-2024.06",
      "description": "负责自动化agent搭建、行业研究分析和产品分析..."
    },
    {
      "company": "德勤华永会计师事务所",
      "position": "数字化审计实习生",
      "period": "2023.06-2023.09",
      "description": "参与易方达基金数字化年审，利用数字化AI平台进行服从性测试和数据分析"
    }
  ],
  "workExperience": "在Chainopera担任战略实习生，负责自动化agent搭建；在德勤华永会计师事务所担任数字化审计实习生",
  "skills": "Python；JavaScript；React",
  "skillsDetailed": {
    "语言": "中文（母语）、英语（CET-6）",
    "编程技能": "Python、JavaScript、React"
  },
  "introduction": "..."
}`;

    // 调用 DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
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
      const error = await response.json();
      throw new Error(`API 调用失败：${error.error?.message || '未知错误'}`);
    }
    
    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('AI 原始响应:', aiResponse);
    
    // 解析 JSON 响应
    let resumeData;
    try {
      // 尝试提取 JSON（可能包含在代码块中）
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resumeData = JSON.parse(jsonMatch[0]);
      } else {
        resumeData = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error('JSON 解析失败:', parseError);
      throw new Error('AI 响应格式错误，请重试');
    }
    
    // 确保所有字段都存在
    const defaultData = {
      name: '',
      email: '',
      phone: '',
      education: '',
      major: '',
      degree: '',
      graduationDate: '',
      workExperiences: [],
      workExperience: '',
      skills: '',
      skillsDetailed: {},
      introduction: ''
    };
    
    return { ...defaultData, ...resumeData };
    
  } catch (error) {
    console.error('AI 解析失败:', error);
    
    // 如果 API 调用失败，回退到正则表达式解析
    if (error.message.includes('API')) {
      showStatus('⚠️ AI 解析失败，使用备用方案...', 'info', status1);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return parseResumeWithRegex(text);
  }
}

/**
 * 使用正则表达式解析简历（备用方案）
 */
function parseResumeWithRegex(text) {
  const resumeData = {
    name: '',
    email: '',
    phone: '',
    education: '',
    major: '',
    degree: '',
    graduationDate: '',
    workExperiences: [],
    workExperience: '',
    skills: '',
    skillsDetailed: {},
    introduction: ''
  };
  
  console.log('=== 使用正则表达式解析 ===');
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // 提取邮箱
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    resumeData.email = emailMatch[1];
    console.log('✓ 邮箱:', resumeData.email);
  }
  
  // 提取电话
  let phoneMatch = text.match(/(?:^|[^\d])(\+?86[\s\-]?)?1[3-9]\d{9}(?:[^\d]|$)/);
  if (phoneMatch) {
    resumeData.phone = phoneMatch[0].replace(/[^\d+]/g, '');
    console.log('✓ 电话:', resumeData.phone);
  }
  
  // 提取姓名（第一行）
  if (lines.length > 0) {
    const firstLine = lines[0];
    const parts = firstLine.split(/[\s|｜]+/);
    for (const part of parts) {
      const cleaned = part.trim();
      if (cleaned.length >= 2 && cleaned.length <= 15 && 
          !cleaned.includes('@') && 
          !/\d{6,}/.test(cleaned) &&
          !/^(?:电话|手机|邮箱|phone|email)/i.test(cleaned)) {
        resumeData.name = cleaned;
        console.log('✓ 姓名:', resumeData.name);
        break;
      }
    }
  }
  
  // 提取教育背景
  const eduSectionMatch = text.match(/教育背景[\s\S]{0,500}/i);
  let eduText = eduSectionMatch ? eduSectionMatch[0] : text;
  
  const eduLines = eduText.split('\n').filter(line => 
    /(?:大学|学院|University|College)/i.test(line)
  );
  
  if (eduLines.length > 0) {
    const eduLine = eduLines[0];
    
    // 提取学校
    const schoolMatch = eduLine.match(/([^\d\s]{2,10}(?:大学|学院))/);
    if (schoolMatch) {
      resumeData.education = schoolMatch[1];
      console.log('✓ 学校:', resumeData.education);
    }
    
    // 提取专业
    const majorMatch = eduLine.match(/(?:大学|学院)[\s\-—–·]*([^\d\s]{2,15})(?:专业)?[\s\d]/);
    if (majorMatch) {
      let major = majorMatch[1].trim().replace(/专业$/, '').trim();
      if (major.length >= 2 && major.length <= 20) {
        resumeData.major = major;
        console.log('✓ 专业:', resumeData.major);
      }
    }
    
    // 提取毕业时间
    const dateMatch = eduLine.match(/(\d{4})[\.\-\/年]*(\d{1,2})?[\s\-—–]*(\d{4})[\.\-\/年]*(\d{1,2})?/);
    if (dateMatch) {
      resumeData.graduationDate = dateMatch[4] 
        ? `${dateMatch[3]}-${dateMatch[4].padStart(2, '0')}`
        : dateMatch[3];
      console.log('✓ 毕业时间:', resumeData.graduationDate);
    }
  }
  
  // 提取学历
  if (eduText) {
    const degreeMatch = eduText.match(/(博士|硕士|学士|本科|研究生|大专|PhD|Master|Bachelor)/i);
    if (degreeMatch) {
      const degreeMap = {
        '博士': '博士', 'phd': '博士',
        '硕士': '硕士', 'master': '硕士', '研究生': '硕士',
        '学士': '本科', 'bachelor': '本科', '本科': '本科',
        '大专': '大专'
      };
      const degree = degreeMatch[1].toLowerCase();
      resumeData.degree = degreeMap[degree] || degreeMatch[1];
      console.log('✓ 学历:', resumeData.degree);
    }
  }
  
  // 提取技能
  const skillsSectionMatch = text.match(/(?:技能|Skills?)[\s&]*(?:自我评价)?[\s\S]{0,800}/i);
  if (skillsSectionMatch) {
    const skillsText = skillsSectionMatch[0];
    const skillCategories = skillsText.match(/([^\n:：]{2,15})[:：]([^\n]{10,200})/g);
    
    if (skillCategories && skillCategories.length > 0) {
      let allSkills = [];
      skillCategories.forEach(category => {
        const match = category.match(/([^\n:：]{2,15})[:：]([^\n]{10,200})/);
        if (match) {
          const categoryName = match[1].trim();
          const categoryContent = match[2].trim();
          
          if (!/自我评价|自我介绍|个人简介/i.test(categoryName)) {
            resumeData.skillsDetailed[categoryName] = categoryContent;
            allSkills.push(categoryContent);
          }
        }
      });
      resumeData.skills = allSkills.join('；');
    } else {
      const simpleSkills = skillsText.split('\n').slice(1, 4).join(' ');
      resumeData.skills = simpleSkills.trim().substring(0, 300);
    }
  }
  
  // 提取工作经验
  const workSection = text.match(/(?:实习经验|工作经历|工作经验|Experience)[\s\S]{0,500}/i);
  if (workSection) {
    let workText = workSection[0].split(/\n\n/)[0];
    workText = workText.trim().substring(0, 300);
    if (workText.length > 20) {
      resumeData.workExperience = workText;
    }
  }
  
  // 提取自我介绍
  const introMatch = text.match(/(?:自我评价|自我介绍|个人简介)[:：\s]*([^\n]{20,300})/i);
  if (introMatch) {
    resumeData.introduction = introMatch[1].trim();
  }
  
  console.log('=== 正则解析完成 ===');
  return resumeData;
}

/**
 * 提取 PDF 文本
 */
async function extractPDF(file) {
  try {
    if (typeof pdfjsLib === 'undefined') {
      await loadScript('libs/pdf.min.js');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (typeof pdfjsLib !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('libs/pdf.worker.min.js');
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('PDF 解析错误:', error);
    throw new Error('PDF 文件解析失败：' + error.message);
  }
}

/**
 * 提取 DOCX 文本
 */
async function extractDOCX(file) {
  try {
    if (typeof mammoth === 'undefined') {
      throw new Error('Mammoth 库未加载');
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('DOCX 解析错误:', error);
    throw new Error('DOCX 文件解析失败，请尝试将内容复制到 TXT 文件');
  }
}

/**
 * 读取文本文件
 */
function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('文件读取失败'));
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * 动态加载脚本
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(src);
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// 手动填写 - 加载数据
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const result = await chrome.storage.local.get(['resume']);
    const resume = result.resume;
    
    if (resume) {
      document.getElementById('name').value = resume.name || '';
      document.getElementById('email').value = resume.email || '';
      document.getElementById('phone').value = resume.phone || '';
      document.getElementById('education').value = resume.education || '';
      document.getElementById('major').value = resume.major || '';
      document.getElementById('degree').value = resume.degree || '';
      document.getElementById('graduationDate').value = resume.graduationDate || '';
      
      // 处理工作经验：优先使用多段格式，回退到单字段
      let workExpText = '';
      if (resume.workExperiences && resume.workExperiences.length > 0) {
        workExpText = resume.workExperiences.map(exp => {
          let text = '';
          if (exp.company) text += exp.company;
          if (exp.position) text += ` - ${exp.position}`;
          if (exp.period) text += ` (${exp.period})`;
          if (exp.description) text += `\n${exp.description}`;
          return text;
        }).join('\n\n');
      } else {
        workExpText = resume.workExperience || '';
      }
      document.getElementById('workExperience').value = workExpText;
      
      document.getElementById('skills').value = resume.skills || '';
      document.getElementById('introduction').value = resume.introduction || '';
      
      autofillBtn1.disabled = false;
      autofillBtn2.disabled = false;
      
      // 自动显示预览（如果有数据说明已经解析过）
      showPreview(resume);
      showStatus('✅ 简历数据已加载（来自网站解析）', 'success', status1);
    }
  } catch (error) {
    console.error('加载数据失败:', error);
  }
});

// 手动填写 - 保存
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const resumeData = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    education: document.getElementById('education').value.trim(),
    major: document.getElementById('major').value.trim(),
    degree: document.getElementById('degree').value,
    graduationDate: document.getElementById('graduationDate').value.trim(),
    workExperience: document.getElementById('workExperience').value.trim(),
    skills: document.getElementById('skills').value.trim(),
    introduction: document.getElementById('introduction').value.trim()
  };
  
  if (!resumeData.name || !resumeData.email || !resumeData.phone) {
    showStatus('请填写所有必填字段（姓名、邮箱、电话）', 'error', status2);
    return;
  }
  
  try {
    await chrome.storage.local.set({ resume: resumeData });
    showStatus('✅ 简历保存成功！', 'success', status2);
    autofillBtn1.disabled = false;
    autofillBtn2.disabled = false;
  } catch (error) {
    showStatus('❌ 保存失败，请重试', 'error', status2);
  }
});

// 自动填充
[autofillBtn1, autofillBtn2].forEach(btn => {
  btn.addEventListener('click', async () => {
    try {
      const result = await chrome.storage.local.get(['resume']);
      if (!result.resume) {
        const statusDiv = btn === autofillBtn1 ? status1 : status2;
        showStatus('请先保存简历信息', 'error', statusDiv);
        return;
      }
      
      chrome.runtime.sendMessage({ action: 'triggerAutofill' }, (response) => {
        if (response && response.success) {
          const statusDiv = btn === autofillBtn1 ? status1 : status2;
          showStatus('✨ 正在自动填充...', 'success', statusDiv);
          setTimeout(() => window.close(), 1000);
        }
      });
    } catch (error) {
      const statusDiv = btn === autofillBtn1 ? status1 : status2;
      showStatus('❌ 自动填充失败', 'error', statusDiv);
    }
  });
});

function showStatus(message, type, statusDiv) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  setTimeout(() => statusDiv.className = 'status', 3000);
}

/**
 * 显示解析结果预览
 */
function showPreview(resumeData) {
  const fields = [
    { label: '姓名', key: 'name', required: true },
    { label: '邮箱', key: 'email', required: true },
    { label: '电话', key: 'phone', required: true },
    { label: '学校', key: 'education', required: false },
    { label: '专业', key: 'major', required: false },
    { label: '学历', key: 'degree', required: false },
    { label: '毕业时间', key: 'graduationDate', required: false }
  ];
  
  let html = '';
  
  // 显示基本字段
  fields.forEach(field => {
    const value = resumeData[field.key];
    const displayValue = value || '未提取';
    const valueClass = value ? 'preview-value' : 'preview-value empty';
    const requiredMark = field.required ? ' *' : '';
    
    html += `
      <div class="preview-item">
        <div class="preview-label">${field.label}${requiredMark}:</div>
        <div class="${valueClass}">${displayValue}</div>
      </div>
    `;
  });
  
  // 显示工作经验（支持多段）
  if (resumeData.workExperiences && resumeData.workExperiences.length > 0) {
    html += `
      <div class="preview-item">
        <div class="preview-label">工作经验:</div>
        <div class="preview-value"></div>
      </div>
    `;
    resumeData.workExperiences.forEach((exp, index) => {
      html += `
        <div class="preview-item" style="margin-left: 0; margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; display: block;">
          <div style="font-weight: bold; color: #FF69B4; margin-bottom: 8px;">
            ${index + 1}. ${exp.company || '未知公司'}
          </div>
          <div style="font-size: 12px; line-height: 1.6;">
            ${exp.position ? `<div style="margin-bottom: 4px;"><strong>职位：</strong>${exp.position}</div>` : ''}
            ${exp.period ? `<div style="margin-bottom: 4px;"><strong>时间：</strong>${exp.period}</div>` : ''}
            ${exp.description ? `<div style="margin-bottom: 4px;"><strong>描述：</strong>${exp.description}</div>` : ''}
          </div>
        </div>
      `;
    });
  } else if (resumeData.workExperience) {
    // 兼容旧版本单字段
    html += `
      <div class="preview-item">
        <div class="preview-label">工作经验:</div>
        <div class="preview-value">${resumeData.workExperience}</div>
      </div>
    `;
  } else {
    html += `
      <div class="preview-item">
        <div class="preview-label">工作经验:</div>
        <div class="preview-value empty">未提取</div>
      </div>
    `;
  }
  
  // 显示技能
  if (resumeData.skillsDetailed && Object.keys(resumeData.skillsDetailed).length > 0) {
    html += `
      <div class="preview-item">
        <div class="preview-label">技能:</div>
        <div class="preview-value"></div>
      </div>
    `;
    Object.entries(resumeData.skillsDetailed).forEach(([category, content]) => {
      html += `
        <div class="preview-item" style="margin-left: 0; margin-bottom: 10px; padding: 8px; background: #f0f8ff; border-radius: 6px; display: block;">
          <div style="font-weight: bold; color: #2196F3; margin-bottom: 4px;">
            ${category}:
          </div>
          <div style="font-size: 12px; color: #333;">
            ${content}
          </div>
        </div>
      `;
    });
  } else if (resumeData.skills) {
    html += `
      <div class="preview-item">
        <div class="preview-label">技能:</div>
        <div class="preview-value">${resumeData.skills}</div>
      </div>
    `;
  } else {
    html += `
      <div class="preview-item">
        <div class="preview-label">技能:</div>
        <div class="preview-value empty">未提取</div>
      </div>
    `;
  }
  
  // 显示自我介绍
  const intro = resumeData.introduction || '未提取';
  const introClass = resumeData.introduction ? 'preview-value' : 'preview-value empty';
  html += `
    <div class="preview-item">
      <div class="preview-label">自我介绍:</div>
      <div class="${introClass}">${intro}</div>
    </div>
  `;
  
  previewContent.innerHTML = html;
  previewSection.classList.add('active');
}

// 编辑按钮 - 跳转到手动填写页面
editBtn.addEventListener('click', () => {
  document.querySelector('[data-tab="manual"]').click();
});
