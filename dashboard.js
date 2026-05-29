/**
 * 仪表盘 - 3D 旋转木马轮播
 * 当前卡片居中最大，两侧卡片旋转后退
 * 支持：点击切换 / 滑动 / 键盘
 */
(function() {
  'use strict';

  var currentIndex = 0;
  var cards = [];
  var isAnimating = false;
  var backBtn = null;
  var mainArea, dashDiv, layout, leftCol, resultPanel, agentSection;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
  } else {
    initDashboard();
  }

  function initDashboard() {
    mainArea = document.querySelector('.main-area');
    if (!mainArea) return;

    layout = mainArea.querySelector('.layout');
    leftCol = mainArea.querySelector('.left-col');
    resultPanel = mainArea.querySelector('.result-panel');
    agentSection = mainArea.querySelector('.agent-section');

    if (layout) layout.style.display = 'none';

    dashDiv = document.createElement('div');
    dashDiv.id = 'dashboardView';
    dashDiv.className = 'dashboard-view';
    dashDiv.innerHTML = buildHTML();
    mainArea.insertBefore(dashDiv, mainArea.firstChild);

    backBtn = document.createElement('button');
    backBtn.className = 'detail-back-btn';
    backBtn.innerHTML = '\u2190 \u8FD4\u56DE\u6982\u89C8';
    backBtn.style.display = 'none';
    backBtn.addEventListener('click', goBack);
    mainArea.insertBefore(backBtn, layout);

    mainArea.setAttribute('data-view', 'dashboard');

    cards = Array.from(dashDiv.querySelectorAll('.dash-card'));
    updateCarousel();
    bindEvents();
    bindPluginModal();
  }

  function buildHTML() {
    var mbti = localStorage.getItem('personalityMBTI') || '\u2014';
    var mbtiName = (window.MBTI_NAMES && window.MBTI_NAMES[mbti]) || '\u672A\u6D4B\u8BD5';

    return '<div class="dash-header-intro">' +
      '<h2 class="dash-intro-title">Hi\uFF0C\u6B22\u8FCE\u56DE\u6765 \u{1F44B}</h2>' +
      '<p class="dash-intro-desc">\u9009\u62E9\u4E00\u4E2A\u529F\u80FD\u5F00\u59CB\u4F60\u7684\u6C42\u804C\u4E4B\u65C5\uFF1A\u7B80\u5386\u8BCA\u65AD\u3001\u5C97\u4F4D\u63A8\u8350\u3001\u6A21\u62DF\u9762\u8BD5\u3001\u6295\u9012\u8FFD\u8E2A</p>' +
    '</div>' +
    '<div class="dash-carousel-wrap">' +
      '<button class="dash-arrow dash-arrow-left" id="dashArrowLeft">\u2039</button>' +
      '<div class="dash-carousel">' +
      '<div class="dash-card dash-card-1" data-panel="diagnosis" data-index="0">' +
        '<div class="dash-card-icon">\uD83D\uDCCB</div>' +
        '<div class="dash-card-content">' +
          '<h3 class="dash-card-title">\u7B80\u5386\u8BCA\u65AD</h3>' +
          '<p class="dash-card-desc">\u4E0A\u4F20\u7B80\u5386\uFF0CAI \u5E2E\u4F60\u627E\u51FA\u9519\u522B\u5B57\u3001\u8BED\u6CD5\u95EE\u9898\uFF0C\u7ED9\u51FA\u4F18\u5316\u5EFA\u8BAE</u5EFA\u8BAE</p>' +
          '<div class="dash-card-preview"><span class="dash-tag">\u9519\u522B\u5B57\u68C0\u6D4B</span><span class="dash-tag">\u8BED\u6CD5\u4F18\u5316</span><span class="dash-tag">\u7EFC\u5408\u8BC4\u5206</span></div>' +
        '</div>' +
        '<div class="dash-card-arrow">\u67E5\u770B\u8BE6\u60C5 \u2192</div>' +
      '</div>' +
      '<div class="dash-card dash-card-2" data-panel="mbti" data-index="1">' +
        '<div class="dash-card-icon">\uD83E\uDDE0</div>' +
        '<div class="dash-card-content">' +
          '<h3 class="dash-card-title">\u5C97\u4F4D\u63A8\u8350</h3>' +
          '<p class="dash-card-desc">\u57FA\u4E8E MBTI \u6027\u683C\u7C7B\u578B\uFF0C\u667A\u80FD\u63A8\u8350\u6700\u9002\u5408\u7684\u804C\u4E1A\u65B9\u5411</p>' +
          '<div class="dash-card-preview"><span class="dash-badge">' + mbti + ' ' + mbtiName + '</span></div>' +
        '</div>' +
        '<div class="dash-card-arrow">\u67E5\u770B\u8BE6\u60C5 \u2192</div>' +
      '</div>' +
      '<div class="dash-card dash-card-3" data-panel="chat" data-index="2">' +
        '<div class="dash-card-icon">\uD83D\uDCAC</div>' +
        '<div class="dash-card-content">' +
          '<h3 class="dash-card-title">\u9762\u8BD5\u8F85\u5BFC</h3>' +
          '<p class="dash-card-desc">AI \u6A21\u62DF\u9762\u8BD5\u5B98\u548C\u4F60\u5BF9\u8BDD\uFF0C\u5E2E\u4F60\u7EC3\u4E60\u56DE\u7B54\u6280\u5DE7</p>' +
          '<div class="dash-card-preview"><span class="dash-tag">\u6A21\u62DF\u9762\u8BD5</span><span class="dash-tag">\u7B80\u5386\u751F\u6210</span><span class="dash-tag">\u8BDD\u672F\u7EC3\u4E60</span></div>' +
        '</div>' +
        '<div class="dash-card-arrow">\u5F00\u59CB\u7EC3\u4E60 \u2192</div>' +
      '</div>' +
      '<div class="dash-card dash-card-4" data-panel="tracking" data-index="3">' +
        '<div class="dash-card-icon">\uD83D\uDCCA</div>' +
        '<div class="dash-card-content">' +
          '<h3 class="dash-card-title">\u6295\u9012\u8FFD\u8E2A</h3>' +
          '<p class="dash-card-desc">\u8BB0\u5F55\u6BCF\u6B21\u6295\u9012\uFF0C\u53EF\u89C6\u5316\u8FFD\u8E2A\u8FDB\u5EA6\uFF0C\u667A\u80FD\u63D0\u9192</p>' +
          '<div class="dash-card-preview"><span class="dash-tag">\u6295\u9012\u8BB0\u5F55</span><span class="dash-tag">\u8FDB\u5EA6\u8FFD\u8E2A</span><span class="dash-tag">\u667A\u80FD\u63D0\u9192</span></div>' +
        '</div>' +
        '<div class="dash-card-arrow">\u67E5\u770B\u6295\u9012 \u2192</div>' +
      '</div>' +
    '</div>' +
      '<button class="dash-arrow dash-arrow-right" id="dashArrowRight">\u203A</button>' +
    '</div>' +
    '<div class="dash-dots">' +
      '<span class="dash-dot" data-i="0"></span>' +
      '<span class="dash-dot" data-i="1"></span>' +
      '<span class="dash-dot" data-i="2"></span>' +
      '<span class="dash-dot" data-i="3"></span>' +
    '</div>';
  }

  function updateCarousel() {
    var total = cards.length;
    cards.forEach(function(card, i) {
      var offset = (i - currentIndex + total) % total;
      card.className = card.className.replace(/ dash-pos-\w+/g, '');
      if (offset === 0) card.classList.add('dash-pos-center');
      else if (offset === 1) card.classList.add('dash-pos-right');
      else if (offset === total - 1) card.classList.add('dash-pos-left');
      else card.classList.add('dash-pos-back');
    });
    var dots = dashDiv.querySelectorAll('.dash-dot');
    dots.forEach(function(d, i) { d.classList.toggle('active', i === currentIndex); });
  }

  function goTo(index) {
    if (isAnimating) return;
    var total = cards.length;
    index = ((index % total) + total) % total;
    if (index === currentIndex) return;
    isAnimating = true;
    currentIndex = index;
    updateCarousel();
    setTimeout(function() { isAnimating = false; }, 500);
  }

  function bindEvents() {
    cards.forEach(function(card) {
      card.addEventListener('click', function() {
        var idx = parseInt(card.getAttribute('data-index'));
        if (idx === currentIndex) {
          openDetail(card.getAttribute('data-panel'));
        } else {
          goTo(idx);
        }
      });
    });

    var dots = dashDiv.querySelectorAll('.dash-dot');
    dots.forEach(function(d) {
      d.addEventListener('click', function() { goTo(parseInt(d.getAttribute('data-i'))); });
    });

    var arrowLeft = document.getElementById('dashArrowLeft');
    var arrowRight = document.getElementById('dashArrowRight');
    if (arrowLeft) arrowLeft.addEventListener('click', function() { goTo(currentIndex - 1); });
    if (arrowRight) arrowRight.addEventListener('click', function() { goTo(currentIndex + 1); });

    document.addEventListener('keydown', function(e) {
      if (mainArea.getAttribute('data-view') !== 'dashboard') return;
      if (e.key === 'ArrowLeft') goTo(currentIndex - 1);
      if (e.key === 'ArrowRight') goTo(currentIndex + 1);
    });

    var startX = 0;
    var carousel = dashDiv.querySelector('.dash-carousel');
    carousel.addEventListener('touchstart', function(e) { startX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend', function(e) {
      var diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 50) { diff > 0 ? goTo(currentIndex - 1) : goTo(currentIndex + 1); }
    }, { passive: true });

    var mouseDown = false, mouseX = 0;
    carousel.addEventListener('mousedown', function(e) { mouseDown = true; mouseX = e.clientX; });
    document.addEventListener('mouseup', function(e) {
      if (!mouseDown) return; mouseDown = false;
      var diff = e.clientX - mouseX;
      if (Math.abs(diff) > 60) { diff > 0 ? goTo(currentIndex - 1) : goTo(currentIndex + 1); }
    });
  }

  function openDetail(panel) {
    dashDiv.style.display = 'none';
    backBtn.style.display = '';
    mainArea.setAttribute('data-view', 'detail');
    if (layout) { layout.style.display = 'grid'; layout.style.gridTemplateColumns = '1fr'; }
    if (leftCol) leftCol.style.display = 'none';
    if (resultPanel) resultPanel.style.display = 'none';
    if (agentSection) agentSection.style.display = 'none';
    var trackingSec = mainArea.querySelector('.tracking-section');
    if (trackingSec) trackingSec.style.display = 'none';
    if (panel === 'diagnosis' && leftCol) leftCol.style.display = '';
    else if (panel === 'mbti' && resultPanel) resultPanel.style.display = '';
    else if (panel === 'chat' && agentSection) agentSection.style.display = '';
    else if (panel === 'tracking' && trackingSec) trackingSec.style.display = '';
    window.scrollTo(0, 0);
  }

  function goBack() {
    if (layout) layout.style.display = 'none';
    dashDiv.style.display = '';
    backBtn.style.display = 'none';
    mainArea.setAttribute('data-view', 'dashboard');
    if (leftCol) leftCol.style.display = '';
    if (resultPanel) resultPanel.style.display = '';
    if (agentSection) agentSection.style.display = '';
    var trackingSec = mainArea.querySelector('.tracking-section');
    if (trackingSec) trackingSec.style.display = '';
    window.scrollTo(0, 0);
  }

  function bindPluginModal() {
    var btn = document.getElementById('btnInstallPlugin');
    var modal = document.getElementById('pluginModalOverlay');
    var close = document.getElementById('pluginModalClose');
    if (btn && modal) btn.addEventListener('click', function() { modal.classList.add('active'); document.body.style.overflow = 'hidden'; });
    if (close && modal) close.addEventListener('click', function() { modal.classList.remove('active'); document.body.style.overflow = ''; });
    if (modal) modal.addEventListener('click', function(e) { if (e.target === modal) { modal.classList.remove('active'); document.body.style.overflow = ''; } });
  }
})();
