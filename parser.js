/**
 * 智能简历解析 - 插件介绍弹窗
 * 点击按钮打开介绍弹窗，引导用户安装 Chrome 扩展
 */
(function() {
  'use strict';

  var parserModalOverlay = document.getElementById('parserModalOverlay');
  var btnSmartParser = document.getElementById('btnSmartParser');
  var parserCloseBtn = document.getElementById('parserCloseBtn');

  if (!parserModalOverlay || !btnSmartParser || !parserCloseBtn) return;

  function openModal() {
    parserModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    parserModalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  btnSmartParser.addEventListener('click', openModal);
  parserCloseBtn.addEventListener('click', closeModal);
  parserModalOverlay.addEventListener('click', function(e) {
    if (e.target === parserModalOverlay) closeModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && parserModalOverlay.classList.contains('active')) closeModal();
  });
})();
