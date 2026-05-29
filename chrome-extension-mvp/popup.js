/**
 * Popup Script
 * 处理弹窗中的用户交互
 */

// DOM 元素
const form = document.getElementById('resumeForm');
const autofillBtn = document.getElementById('autofillBtn');
const statusDiv = document.getElementById('status');

// 页面加载时，从 storage 加载已保存的简历数据
document.addEventListener('DOMContentLoaded', loadResumeData);

/**
 * 加载已保存的简历数据
 */
async function loadResumeData() {
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
      
      console.log('已加载简历数据');
    }
  } catch (error) {
    console.error('加载简历数据失败:', error);
  }
}

/**
 * 保存简历数据
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
    showStatus('请填写所有必填字段（姓名、邮箱、电话）', 'error');
    return;
  }
  
  try {
    // 保存到 chrome.storage
    await chrome.storage.local.set({ resume: resumeData });
    
    console.log('简历已保存:', resumeData);
    showStatus('✅ 简历保存成功！', 'success');
    
    // 启用自动填充按钮
    autofillBtn.disabled = false;
    
  } catch (error) {
    console.error('保存失败:', error);
    showStatus('❌ 保存失败，请重试', 'error');
  }
});

/**
 * 触发自动填充
 */
autofillBtn.addEventListener('click', async () => {
  try {
    // 检查是否有保存的简历
    const result = await chrome.storage.local.get(['resume']);
    if (!result.resume) {
      showStatus('请先保存简历信息', 'error');
      return;
    }
    
    // 发送消息到 background script
    chrome.runtime.sendMessage({ action: 'triggerAutofill' }, (response) => {
      if (response && response.success) {
        showStatus('✨ 正在自动填充...', 'success');
        
        // 1秒后关闭弹窗
        setTimeout(() => {
          window.close();
        }, 1000);
      }
    });
    
  } catch (error) {
    console.error('自动填充失败:', error);
    showStatus('❌ 自动填充失败', 'error');
  }
});

/**
 * 显示状态消息
 */
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  
  // 3秒后自动隐藏
  setTimeout(() => {
    statusDiv.className = 'status';
  }, 3000);
}

/**
 * 检查是否有保存的简历，决定是否启用自动填充按钮
 */
chrome.storage.local.get(['resume'], (result) => {
  if (result.resume) {
    autofillBtn.disabled = false;
  } else {
    autofillBtn.disabled = true;
  }
});
