/**
 * Popup Script V3 - 完全离线版本
 * 不依赖任何外部库，直接解析 TXT 文本
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
    console.log('开始读取文件:', selectedFile.name);
    
    // 读取文本文件
    const text = await readTextFile(selectedFile);
    console.log('文件读取成功，长度:', text.length);
    
    if (!text || text.trim().length === 0) {
      throw new Error('文件内容为空');
    }
    
    // 解析简历
    console.log('开始解析简历...');
    const resumeData = parseResumeText(text);
    console.log('解析结果:', resumeData);
    
    // 验证必填字段
    if (!resumeData.name || !resumeData.email || !resumeData.phone) {
      throw new Error('简历中缺少必填信息（姓名、邮箱、电话）。请切换到"手动填写"标签页补充。');
    }
    
    // 保存到 storage
    await chrome.storage.local.set({ resume: resumeData });
    console.log('简历已保存');
    
    loading.classList.remove('active');
    showStatus(`✅ 解析成功！已提取：${resumeData.name}`, 'success', status1);
    
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
 * 解析简历文本
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
  
  // 提取姓名（第一行非空行）
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0) {
    for (const line of lines) {
      if (line.length < 50 && 
          !line.includes('@') && 
          !line.includes('http') &&
          !/^(?:电话|手机|phone|mobile|tel|email|邮箱)[:：\s]/i.test(line)) {
        resumeData.name = line;
        break;
      }
    }
  }
  
  // 提取邮箱
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    resumeData.email = emailMatch[1];
  }
  
  // 提取电话
  const phoneMatch = text.match(/(?:电话|手机|phone|mobile|tel)[:：\s]*([+\d\s\-()]+)/i);
  if (phoneMatch) {
    resumeData.phone = phoneMatch[1].replace(/[\s\-()]/g, '');
  } else {
    const phoneMatch2 = text.match(/(\+?\d{1,3}[\s\-]?\d{3,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4})/);
    if (phoneMatch2) {
      resumeData.phone = phoneMatch2[1].replace(/[\s\-()]/g, '');
    }
  }
  
  // 提取学校
  const educationMatch = text.match(/(?:大学|学院|university|college|institute)([^\n]{0,30})/i);
  if (educationMatch) {
    resumeData.education = educationMatch[0].replace(/^[•\-*]\s*/, '').trim();
  }
  
  // 提取专业
  const majorMatch = text.match(/(?:专业|major)[:：\s]*([^\n,]+)/i);
  if (majorMatch) {
    resumeData.major = majorMatch[1].trim();
  }
  
  // 提取学历
  const degreeMatch = text.match(/(学士|硕士|博士|Bachelor|Master|PhD|本科|研究生)/i);
  if (degreeMatch) {
    const degreeMap = {
      '学士': '本科', 'bachelor': '本科',
      '硕士': '硕士', 'master': '硕士',
      '博士': '博士', 'phd': '博士',
      '本科': '本科', '研究生': '硕士'
    };
    const degree = degreeMatch[1].toLowerCase();
    resumeData.degree = degreeMap[degree] || degreeMatch[1];
  }
  
  // 提取毕业时间
  const graduationMatch = text.match(/(\d{4}[-./年]\d{1,2})/);
  if (graduationMatch) {
    resumeData.graduationDate = graduationMatch[1].replace(/[./年]/g, '-').replace('月', '');
  }
  
  // 提取工作经验
  const workSection = text.match(/(?:工作经历|工作经验|work\s+experience)([\s\S]{0,500})/i);
  if (workSection) {
    const workText = workSection[1].split(/\n\n/)[0];
    resumeData.workExperience = workText.trim().substring(0, 200);
  }
  
  // 提取技能
  const skillsSection = text.match(/(?:技能|专业技能|skills?)[:：\s]*([^\n]+)/i);
  if (skillsSection) {
    resumeData.skills = skillsSection[1].trim();
  }
  
  // 提取自我介绍
  const summarySection = text.match(/(?:个人简介|自我评价|summary|objective)[:：\s]*([\s\S]{0,300})/i);
  if (summarySection) {
    const summaryText = summarySection[1].split(/\n\n/)[0];
    resumeData.introduction = summaryText.trim().substring(0, 200);
  }
  
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
