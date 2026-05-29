/**
 * Popup Script V4 - 本地库版本
 * 使用本地打包的 pdf.js 和 mammoth.js，支持 PDF/DOCX/TXT
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
    
    if (!text || text.trim().length === 0) {
      throw new Error('文件内容为空或无法提取文本');
    }
    
    // 解析简历
    console.log('开始解析简历...');
    const resumeData = parseResumeText(text);
    console.log('解析结果:', resumeData);
    
    // 检查必填字段，但给出更友好的提示
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
 * 提取 PDF 文本
 */
async function extractPDF(file) {
  try {
    // 动态加载 PDF.js（如果还没加载）
    if (typeof pdfjsLib === 'undefined') {
      await loadScript('libs/pdf.min.js');
      // 等待 pdfjsLib 全局变量可用
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 配置 worker
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

/**
 * 解析简历文本 - 增强版本
 */
function parseResumeText(text) {
  const resumeData = {
    name: '',
    email: '',
    phone: '',
    education: '',
    major: '',
    degree: '',
    graduationDate: '',
    workExperience: '',
    skills: '',
    introduction: ''
  };
  
  console.log('开始智能解析简历...');
  console.log('原始文本长度:', text.length);
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // ========== 1. 提取邮箱（最可靠） ==========
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    resumeData.email = emailMatch[1];
    console.log('✓ 找到邮箱:', resumeData.email);
  }
  
  // ========== 2. 提取电话（增强版） ==========
  // 方法1：中国手机号（1开头11位）
  let phoneMatch = text.match(/(?:^|[^\d])(\+?86[\s\-]?)?1[3-9]\d{9}(?:[^\d]|$)/);
  if (phoneMatch) {
    resumeData.phone = phoneMatch[0].replace(/[^\d+]/g, '');
  }
  
  // 方法2：带标签的电话
  if (!resumeData.phone) {
    phoneMatch = text.match(/(?:电话|手机|phone|mobile|tel|联系方式)[:：\s]*([+\d\s\-()]{10,})/i);
    if (phoneMatch) {
      resumeData.phone = phoneMatch[1].replace(/[\s\-()]/g, '').trim();
    }
  }
  
  if (resumeData.phone) {
    console.log('✓ 找到电话:', resumeData.phone);
  }
  
  // ========== 3. 智能提取姓名（增强版） ==========
  // 方法1：带"姓名"标签
  let nameMatch = text.match(/(?:^|[\n\r])(?:姓名|name)[:：\s]*([^\n\r]{2,10})(?:[\n\r]|$)/i);
  if (nameMatch) {
    resumeData.name = nameMatch[1].trim().split(/[\s|丨｜,，]/)[0];
  }
  
  // 方法2：前5行中找短文本（排除干扰）
  if (!resumeData.name && lines.length > 0) {
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      
      // 跳过包含这些内容的行
      if (line.includes('@') || 
          line.includes('http') || 
          line.includes('www.') ||
          /\d{6,}/.test(line) || // 跳过包含长数字的行
          line.length > 30 || 
          line.length < 2 ||
          /^(?:简历|个人简历|resume|cv|求职|应聘|联系|基本信息|个人信息)$/i.test(line)) {
        continue;
      }
      
      // 中文姓名：2-4个汉字，不包含数字和特殊符号
      const chineseNameMatch = line.match(/^([^\x00-\xff]{2,4})$/);
      if (chineseNameMatch && !/\d/.test(chineseNameMatch[1])) {
        resumeData.name = chineseNameMatch[1];
        break;
      }
      
      // 英文姓名
      const englishNameMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})$/);
      if (englishNameMatch) {
        resumeData.name = englishNameMatch[1];
        break;
      }
    }
  }
  
  // 方法3：从复杂行中提取（第一个非邮箱非电话的短文本）
  if (!resumeData.name && lines.length > 0) {
    const firstLine = lines[0];
    const parts = firstLine.split(/[|丨｜\s]{2,}/);
    for (const part of parts) {
      const cleaned = part.trim();
      if (cleaned.length >= 2 && cleaned.length <= 10 && 
          !cleaned.includes('@') && 
          !/\d{4,}/.test(cleaned) &&
          !/^(?:电话|手机|邮箱|phone|email|tel)/i.test(cleaned)) {
        resumeData.name = cleaned;
        break;
      }
    }
  }
  
  if (resumeData.name) {
    console.log('✓ 找到姓名:', resumeData.name);
  }
  
  // ========== 4. 提取学校（增强版） ==========
  // 查找包含"大学"或"学院"的行，但要排除其他信息
  const educationLines = lines.filter(line => 
    /(?:大学|学院|University|College)/i.test(line) &&
    line.length < 100 // 排除太长的行
  );
  
  if (educationLines.length > 0) {
    // 取第一个匹配的行
    const eduLine = educationLines[0];
    // 提取学校名称（大学/学院前后的文字）
    const schoolMatch = eduLine.match(/([^\s\d]{2,15}(?:大学|学院|University|College)[^\s\d]{0,10})/i);
    if (schoolMatch) {
      let schoolName = schoolMatch[1].trim();
      // 清理前后的标点和空格
      schoolName = schoolName.replace(/^[•\-*\s|丨｜]+/, '').replace(/[•\-*\s|丨｜]+$/, '');
      // 只保留学校名称部分（去掉后面的专业等信息）
      schoolName = schoolName.split(/[,，\s]{2,}/)[0];
      resumeData.education = schoolName;
      console.log('✓ 找到学校:', resumeData.education);
    }
  }
  
  // ========== 5. 提取专业（增强版） ==========
  // 方法1：带"专业"标签
  let majorMatch = text.match(/(?:^|[\n\r])(?:专业|major)[:：\s]*([^\n\r]{2,30})/i);
  if (majorMatch) {
    let major = majorMatch[1].trim();
    // 清理多余信息（只保留专业名称）
    major = major.split(/[,，;；\n\r]/)[0].trim();
    // 排除明显不是专业的内容
    if (!/(?:前\s*\d+%|排名|成绩|绩点|GPA)/i.test(major)) {
      resumeData.major = major;
    }
  }
  
  // 方法2：从教育背景行中提取
  if (!resumeData.major && educationLines.length > 0) {
    const eduLine = educationLines[0];
    // 查找学校名后面的专业名称
    const majorMatch2 = eduLine.match(/(?:大学|学院|University|College)[\s\-·]*([^\d\n\r]{2,20})(?:专业)?/i);
    if (majorMatch2) {
      let major = majorMatch2[1].trim();
      // 清理
      major = major.replace(/^[\s\-·]+/, '').replace(/[\s\-·]+$/, '');
      major = major.split(/[,，;；]/)[0].trim();
      // 排除学历词汇
      if (!/(?:本科|硕士|博士|学士|Bachelor|Master|PhD|毕业)/i.test(major)) {
        resumeData.major = major;
      }
    }
  }
  
  if (resumeData.major) {
    console.log('✓ 找到专业:', resumeData.major);
  }
  
  // ========== 6. 提取学历 ==========
  const degreeMatch = text.match(/(博士|硕士|学士|本科|研究生|大专|PhD|Master|Bachelor|Doctorate)/i);
  if (degreeMatch) {
    const degreeMap = {
      '博士': '博士', 'phd': '博士', 'doctorate': '博士',
      '硕士': '硕士', 'master': '硕士', '研究生': '硕士',
      '学士': '本科', 'bachelor': '本科', '本科': '本科',
      '大专': '大专'
    };
    const degree = degreeMatch[1].toLowerCase();
    resumeData.degree = degreeMap[degree] || degreeMatch[1];
    console.log('✓ 找到学历:', resumeData.degree);
  }
  
  // ========== 7. 提取毕业时间（增强版） ==========
  // 方法1：标准格式 YYYY-MM 或 YYYY.MM
  let gradMatch = text.match(/(?:毕业|graduation)[:：\s]*(\d{4})[\s\-\.年\/]*(\d{1,2})?/i);
  if (gradMatch) {
    resumeData.graduationDate = gradMatch[2] 
      ? `${gradMatch[1]}-${gradMatch[2].padStart(2, '0')}`
      : gradMatch[1];
  }
  
  // 方法2：时间范围（取结束时间）
  if (!resumeData.graduationDate) {
    gradMatch = text.match(/(\d{4})[\s\-\.年\/]*(\d{1,2})?[\s\-]*(?:至|到|~|－|-)\s*(\d{4})[\s\-\.年\/]*(\d{1,2})?/);
    if (gradMatch) {
      // 取结束时间
      resumeData.graduationDate = gradMatch[4] 
        ? `${gradMatch[3]}-${gradMatch[4].padStart(2, '0')}`
        : gradMatch[3];
    }
  }
  
  // 方法3：单独的年份（在教育背景附近）
  if (!resumeData.graduationDate && educationLines.length > 0) {
    const eduLine = educationLines[0];
    const yearMatch = eduLine.match(/20\d{2}/);
    if (yearMatch) {
      resumeData.graduationDate = yearMatch[0];
    }
  }
  
  if (resumeData.graduationDate) {
    console.log('✓ 找到毕业时间:', resumeData.graduationDate);
  }
  
  // ========== 8. 提取工作经验 ==========
  const workSection = text.match(/(?:工作经历|工作经验|实习经历|Work\s+Experience|Experience)[:：\s]*([\s\S]{0,500})/i);
  if (workSection) {
    let workText = workSection[1].split(/(?:\n\n|\r\n\r\n)/)[0];
    workText = workText.trim().substring(0, 200);
    if (workText.length > 10) {
      resumeData.workExperience = workText;
      console.log('✓ 找到工作经验');
    }
  }
  
  // ========== 9. 提取技能 ==========
  const skillsSection = text.match(/(?:技能|专业技能|熟练编程技能|Skills?)[:：\s]*([^\n]{10,})/i);
  if (skillsSection) {
    resumeData.skills = skillsSection[1].trim();
    console.log('✓ 找到技能:', resumeData.skills.substring(0, 50) + '...');
  }
  
  // ========== 10. 提取自我介绍 ==========
  const summarySection = text.match(/(?:自我介绍|个人简介|自我评价|Summary|Objective|About)[:：\s]*([\s\S]{0,300})/i);
  if (summarySection) {
    let summaryText = summarySection[1].split(/(?:\n\n|\r\n\r\n)/)[0];
    summaryText = summaryText.trim().substring(0, 200);
    if (summaryText.length > 10) {
      resumeData.introduction = summaryText;
      console.log('✓ 找到自我介绍');
    }
  }
  
  console.log('解析完成，结果:', resumeData);
  return resumeData;
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
      document.getElementById('workExperience').value = resume.workExperience || '';
      document.getElementById('skills').value = resume.skills || '';
      document.getElementById('introduction').value = resume.introduction || '';
      
      autofillBtn1.disabled = false;
      autofillBtn2.disabled = false;
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
    { label: '毕业时间', key: 'graduationDate', required: false },
    { label: '工作经验', key: 'workExperience', required: false },
    { label: '技能', key: 'skills', required: false },
    { label: '自我介绍', key: 'introduction', required: false }
  ];
  
  let html = '';
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
  
  previewContent.innerHTML = html;
  previewSection.classList.add('active');
}

// 编辑按钮 - 跳转到手动填写页面
editBtn.addEventListener('click', () => {
  document.querySelector('[data-tab="manual"]').click();
});
