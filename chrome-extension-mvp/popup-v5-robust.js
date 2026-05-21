/**
 * Popup Script V5 - 超鲁棒版本
 * 支持各种简历格式，智能技能拆分
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
    console.log('前200字符:', text.substring(0, 200));
    
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
 * 解析简历文本 - 超鲁棒版本
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
    skillsDetailed: {}, // 新增：详细技能分类
    introduction: ''
  };
  
  console.log('=== 开始超鲁棒解析 ===');
  console.log('原始文本长度:', text.length);
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  console.log('总行数:', lines.length);
  
  // ========== 1. 提取邮箱 ==========
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    resumeData.email = emailMatch[1];
    console.log('✓ 邮箱:', resumeData.email);
  }
  
  // ========== 2. 提取电话 ==========
  let phoneMatch = text.match(/(?:^|[^\d])(\+?86[\s\-]?)?1[3-9]\d{9}(?:[^\d]|$)/);
  if (phoneMatch) {
    resumeData.phone = phoneMatch[0].replace(/[^\d+]/g, '');
    console.log('✓ 电话:', resumeData.phone);
  }
  
  // ========== 3. 提取姓名 ==========
  // 方法1：第一行（排除包含@和长数字的）
  if (lines.length > 0) {
    const firstLine = lines[0];
    // 提取第一个看起来像名字的部分
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
  
  // ========== 4. 提取学校和专业（鲁棒版） ==========
  console.log('--- 开始提取教育背景 ---');
  
  // 查找"教育背景"部分
  const eduSectionMatch = text.match(/教育背景[\s\S]{0,500}/i);
  let eduText = eduSectionMatch ? eduSectionMatch[0] : text;
  
  // 查找包含"大学"的行
  const eduLines = eduText.split('\n').filter(line => 
    /(?:大学|学院|University|College)/i.test(line)
  );
  
  if (eduLines.length > 0) {
    const eduLine = eduLines[0];
    console.log('教育背景行:', eduLine);
    
    // 提取学校名（支持各种分隔符：- — · 空格等）
    const schoolMatch = eduLine.match(/([^\d\s]{2,10}(?:大学|学院))/);
    if (schoolMatch) {
      resumeData.education = schoolMatch[1];
      console.log('✓ 学校:', resumeData.education);
    }
    
    // 提取专业（在学校名之后，用各种分隔符）
    const majorMatch = eduLine.match(/(?:大学|学院)[\s\-—–·]*([^\d\s]{2,15})(?:专业)?[\s\d]/);
    if (majorMatch) {
      let major = majorMatch[1].trim();
      // 清理可能的后缀
      major = major.replace(/专业$/, '').trim();
      if (major.length >= 2 && major.length <= 20) {
        resumeData.major = major;
        console.log('✓ 专业:', resumeData.major);
      }
    }
    
    // 提取毕业时间（时间范围的结束时间）
    const dateMatch = eduLine.match(/(\d{4})[\.\-\/年]*(\d{1,2})?[\s\-—–]*(\d{4})[\.\-\/年]*(\d{1,2})?/);
    if (dateMatch) {
      // 取结束时间
      resumeData.graduationDate = dateMatch[4] 
        ? `${dateMatch[3]}-${dateMatch[4].padStart(2, '0')}`
        : dateMatch[3];
      console.log('✓ 毕业时间:', resumeData.graduationDate);
    }
  }
  
  // ========== 5. 提取学历 ==========
  // 从教育背景部分查找
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
  
  // ========== 6. 智能提取技能（支持用户自定义分类） ==========
  console.log('--- 开始智能提取技能 ---');
  
  // 查找"技能"部分
  const skillsSectionMatch = text.match(/(?:技能|Skills?)[\s&]*(?:自我评价)?[\s\S]{0,800}/i);
  if (skillsSectionMatch) {
    const skillsText = skillsSectionMatch[0];
    console.log('技能部分文本:', skillsText.substring(0, 200));
    
    // 识别用户自定义的技能分类（如"语言："、"编程技能："等）
    const skillCategories = skillsText.match(/([^\n:：]{2,15})[:：]([^\n]{10,200})/g);
    
    if (skillCategories && skillCategories.length > 0) {
      console.log('找到技能分类:', skillCategories.length, '个');
      
      let allSkills = [];
      skillCategories.forEach(category => {
        const match = category.match(/([^\n:：]{2,15})[:：]([^\n]{10,200})/);
        if (match) {
          const categoryName = match[1].trim();
          const categoryContent = match[2].trim();
          
          // 排除"自我评价"
          if (!/自我评价|自我介绍|个人简介/i.test(categoryName)) {
            resumeData.skillsDetailed[categoryName] = categoryContent;
            allSkills.push(categoryContent);
            console.log(`  ✓ ${categoryName}:`, categoryContent.substring(0, 50) + '...');
          }
        }
      });
      
      // 合并所有技能作为总技能
      resumeData.skills = allSkills.join('；');
    } else {
      // 如果没有找到分类，就提取整段
      const simpleSkills = skillsText.split('\n').slice(1, 4).join(' ');
      resumeData.skills = simpleSkills.trim().substring(0, 300);
      console.log('  使用简单提取:', resumeData.skills.substring(0, 50) + '...');
    }
  }
  
  // ========== 7. 提取工作经验 ==========
  const workSection = text.match(/(?:实习经验|工作经历|工作经验|Experience)[\s\S]{0,500}/i);
  if (workSection) {
    let workText = workSection[0].split(/\n\n/)[0];
    workText = workText.trim().substring(0, 300);
    if (workText.length > 20) {
      resumeData.workExperience = workText;
      console.log('✓ 工作经验');
    }
  }
  
  // ========== 8. 提取自我介绍 ==========
  const introMatch = text.match(/(?:自我评价|自我介绍|个人简介)[:：\s]*([^\n]{20,300})/i);
  if (introMatch) {
    resumeData.introduction = introMatch[1].trim();
    console.log('✓ 自我介绍');
  }
  
  console.log('=== 解析完成 ===');
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
 * 显示解析结果预览（增强版 - 支持技能分类）
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
    { label: '工作经验', key: 'workExperience', required: false }
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
  
  // 显示技能（如果有详细分类，则分类显示）
  if (resumeData.skillsDetailed && Object.keys(resumeData.skillsDetailed).length > 0) {
    html += `<div class="preview-item"><div class="preview-label">技能:</div><div class="preview-value"></div></div>`;
    Object.entries(resumeData.skillsDetailed).forEach(([category, content]) => {
      html += `
        <div class="preview-item" style="margin-left: 20px;">
          <div class="preview-label">${category}:</div>
          <div class="preview-value">${content}</div>
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
