/**
 * Popup Script V2
 * 集成 PDF/DOCX 解析功能
 */

// 等待库加载完成
let librariesLoaded = false;

// 检查库是否加载
function checkLibraries() {
  const pdfLoaded = typeof pdfjsLib !== 'undefined';
  const mammothLoaded = typeof mammoth !== 'undefined';
  
  console.log('PDF.js loaded:', pdfLoaded);
  console.log('Mammoth.js loaded:', mammothLoaded);
  
  if (pdfLoaded) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';
    console.log('PDF.js worker configured');
  }
  
  librariesLoaded = pdfLoaded && mammothLoaded;
  return librariesLoaded;
}

// 页面加载后检查库
window.addEventListener('load', () => {
  setTimeout(() => {
    const loaded = checkLibraries();
    console.log('Libraries loaded:', loaded);
    if (!loaded) {
      console.error('Failed to load parsing libraries. Please check your internet connection.');
    }
  }, 1000);
});

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
let parsedResumeData = null;

// 标签页切换
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    
    // 更新标签页状态
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // 显示对应内容
    if (tabName === 'upload') {
      uploadTab.classList.add('active');
      manualTab.classList.remove('active');
    } else {
      uploadTab.classList.remove('active');
      manualTab.classList.add('active');
    }
  });
});

// 文件上传区域点击
uploadSection.addEventListener('click', () => {
  fileInput.click();
});

// 文件选择
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleFileSelect(file);
  }
});

// 拖拽上传
uploadSection.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadSection.classList.add('dragging');
});

uploadSection.addEventListener('dragleave', () => {
  uploadSection.classList.remove('dragging');
});

uploadSection.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadSection.classList.remove('dragging');
  
  const file = e.dataTransfer.files[0];
  if (file) {
    handleFileSelect(file);
  }
});

/**
 * 处理文件选择
 */
function handleFileSelect(file) {
  // 验证文件类型
  const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const validExtensions = ['.pdf', '.docx'];
  
  const isValidType = validTypes.includes(file.type) || 
                      validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  
  if (!isValidType) {
    showStatus('请上传 PDF 或 DOCX 格式的文件', 'error', status1);
    return;
  }
  
  selectedFile = file;
  
  // 显示文件信息
  fileName.textContent = file.name;
  fileSize.textContent = `文件大小: ${(file.size / 1024).toFixed(2)} KB`;
  fileInfo.classList.add('active');
  
  // 启用解析按钮
  parseBtn.disabled = false;
  
  showStatus('文件已选择，点击"解析简历"开始解析', 'info', status1);
}

/**
 * 解析简历按钮点击
 */
parseBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    showStatus('请先选择文件', 'error', status1);
    return;
  }
  
  // 检查库是否加载
  if (!checkLibraries()) {
    showStatus('❌ 解析库未加载，请检查网络连接后刷新页面', 'error', status1);
    console.error('Libraries not loaded. PDF.js:', typeof pdfjsLib !== 'undefined', 'Mammoth:', typeof mammoth !== 'undefined');
    return;
  }
  
  // 显示加载状态
  loading.classList.add('active');
  parseBtn.disabled = true;
  status1.className = 'status';
  
  console.log('开始解析文件:', selectedFile.name, '大小:', selectedFile.size, '类型:', selectedFile.type);
  
  try {
    // 提取文本
    let extractedText = '';
    
    if (selectedFile.name.toLowerCase().endsWith('.pdf')) {
      console.log('开始提取 PDF 文本...');
      extractedText = await extractPDFText(selectedFile);
      console.log('PDF 文本提取完成，长度:', extractedText.length);
    } else if (selectedFile.name.toLowerCase().endsWith('.docx')) {
      console.log('开始提取 DOCX 文本...');
      extractedText = await extractDOCXText(selectedFile);
      console.log('DOCX 文本提取完成，长度:', extractedText.length);
    }
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('无法从文件中提取文本内容');
    }
    
    console.log('提取的文本（前500字符）:', extractedText.substring(0, 500));
    
    // 解析简历
    console.log('开始解析简历数据...');
    const resumeData = parseResumeText(extractedText);
    
    console.log('解析的简历数据:', resumeData);
    
    // 验证必填字段
    if (!resumeData.name || !resumeData.email || !resumeData.phone) {
      console.warn('缺少必填字段:', {
        name: resumeData.name,
        email: resumeData.email,
        phone: resumeData.phone
      });
      throw new Error('简历中缺少必填信息（姓名、邮箱、电话）。请切换到"手动填写"标签页补充信息。');
    }
    
    // 保存解析结果
    parsedResumeData = resumeData;
    
    // 保存到 storage
    await chrome.storage.local.set({ resume: resumeData });
    console.log('简历数据已保存到 storage');
    
    // 隐藏加载状态
    loading.classList.remove('active');
    
    // 显示成功消息
    showStatus(`✅ 解析成功！已提取：${resumeData.name}`, 'success', status1);
    
    // 启用自动填充按钮
    autofillBtn1.disabled = false;
    autofillBtn2.disabled = false;
    
  } catch (error) {
    console.error('解析失败，详细错误:', error);
    console.error('错误堆栈:', error.stack);
    loading.classList.remove('active');
    parseBtn.disabled = false;
    showStatus(`❌ 解析失败: ${error.message}`, 'error', status1);
  }
});

/**
 * 提取 PDF 文本
 */
async function extractPDFText(file) {
  console.log('extractPDFText 开始');
  
  // 检查 pdf.js 是否加载
  if (typeof pdfjsLib === 'undefined') {
    throw new Error('PDF.js 库未加载，请检查网络连接');
  }
  
  try {
    console.log('读取文件为 ArrayBuffer...');
    const arrayBuffer = await file.arrayBuffer();
    console.log('ArrayBuffer 大小:', arrayBuffer.byteLength);
    
    console.log('加载 PDF 文档...');
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;
    console.log('PDF 文档加载成功，页数:', pdfDocument.numPages);
    
    const numPages = pdfDocument.numPages;
    const textParts = [];
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      console.log(`处理第 ${pageNum}/${numPages} 页...`);
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      console.log(`第 ${pageNum} 页文本项数量:`, textContent.items.length);
      
      // 构建文本
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      
      console.log(`第 ${pageNum} 页文本长度:`, pageText.length);
      
      if (pageText.trim().length > 0) {
        textParts.push(pageText);
      }
      
      page.cleanup();
    }
    
    await pdfDocument.destroy();
    
    const fullText = textParts.join('\n\n');
    console.log('PDF 提取完成，总文本长度:', fullText.length);
    
    return fullText;
  } catch (error) {
    console.error('PDF 提取详细错误:', error);
    console.error('错误类型:', error.name);
    console.error('错误消息:', error.message);
    throw new Error(`PDF 文件解析失败: ${error.message}`);
  }
}

/**
 * 提取 DOCX 文本
 */
async function extractDOCXText(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (!result.value || result.value.trim().length === 0) {
      throw new Error('DOCX 文件中没有可提取的文本');
    }
    
    return result.value;
  } catch (error) {
    console.error('DOCX 提取失败:', error);
    throw new Error('DOCX 文件解析失败，请确保文件未损坏');
  }
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
  
  // 提取姓名（通常在第一行）
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0) {
    // 跳过包含邮箱、电话、网址的行
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
    // 尝试匹配独立的电话号码
    const phoneMatch2 = text.match(/(\+?\d{1,3}[\s\-]?\d{3,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4})/);
    if (phoneMatch2) {
      resumeData.phone = phoneMatch2[1].replace(/[\s\-()]/g, '');
    }
  }
  
  // 提取学校
  const educationMatch = text.match(/(?:大学|学院|university|college|institute)([^\n]{0,30})/i);
  if (educationMatch) {
    const schoolLine = educationMatch[0];
    resumeData.education = schoolLine.replace(/^[•\-*]\s*/, '').trim();
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
      '学士': '本科',
      'bachelor': '本科',
      '硕士': '硕士',
      'master': '硕士',
      '博士': '博士',
      'phd': '博士',
      '本科': '本科',
      '研究生': '硕士'
    };
    const degree = degreeMatch[1].toLowerCase();
    resumeData.degree = degreeMap[degree] || degreeMatch[1];
  }
  
  // 提取毕业时间
  const graduationMatch = text.match(/(\d{4}[-./年]\d{1,2})/);
  if (graduationMatch) {
    resumeData.graduationDate = graduationMatch[1].replace(/[./年]/g, '-').replace('月', '');
  }
  
  // 提取工作经验（查找工作经历部分）
  const workSection = text.match(/(?:工作经历|工作经验|work\s+experience)([\s\S]{0,500})/i);
  if (workSection) {
    const workText = workSection[1].split(/\n\n/)[0]; // 取第一段
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
    const summaryText = summarySection[1].split(/\n\n/)[0]; // 取第一段
    resumeData.introduction = summaryText.trim().substring(0, 200);
  }
  
  return resumeData;
}

/**
 * 手动填写表单 - 加载已保存的数据
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const result = await chrome.storage.local.get(['resume']);
    const resume = result.resume;
    
    if (resume) {
      // 填充表单
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
      
      // 启用自动填充按钮
      autofillBtn1.disabled = false;
      autofillBtn2.disabled = false;
      
      console.log('已加载简历数据');
    }
  } catch (error) {
    console.error('加载简历数据失败:', error);
  }
});

/**
 * 手动填写表单 - 保存
 */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // 收集表单数据
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
  
  // 验证必填字段
  if (!resumeData.name || !resumeData.email || !resumeData.phone) {
    showStatus('请填写所有必填字段（姓名、邮箱、电话）', 'error', status2);
    return;
  }
  
  try {
    // 保存到 chrome.storage
    await chrome.storage.local.set({ resume: resumeData });
    
    console.log('简历已保存:', resumeData);
    showStatus('✅ 简历保存成功！', 'success', status2);
    
    // 启用自动填充按钮
    autofillBtn1.disabled = false;
    autofillBtn2.disabled = false;
    
  } catch (error) {
    console.error('保存失败:', error);
    showStatus('❌ 保存失败，请重试', 'error', status2);
  }
});

/**
 * 自动填充按钮点击
 */
[autofillBtn1, autofillBtn2].forEach(btn => {
  btn.addEventListener('click', async () => {
    try {
      // 检查是否有保存的简历
      const result = await chrome.storage.local.get(['resume']);
      if (!result.resume) {
        const statusDiv = btn === autofillBtn1 ? status1 : status2;
        showStatus('请先保存简历信息', 'error', statusDiv);
        return;
      }
      
      // 发送消息到 background script
      chrome.runtime.sendMessage({ action: 'triggerAutofill' }, (response) => {
        if (response && response.success) {
          const statusDiv = btn === autofillBtn1 ? status1 : status2;
          showStatus('✨ 正在自动填充...', 'success', statusDiv);
          
          // 1秒后关闭弹窗
          setTimeout(() => {
            window.close();
          }, 1000);
        }
      });
      
    } catch (error) {
      console.error('自动填充失败:', error);
      const statusDiv = btn === autofillBtn1 ? status1 : status2;
      showStatus('❌ 自动填充失败', 'error', statusDiv);
    }
  });
});

/**
 * 显示状态消息
 */
function showStatus(message, type, statusDiv) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  
  // 3秒后自动隐藏
  setTimeout(() => {
    statusDiv.className = 'status';
  }, 3000);
}
