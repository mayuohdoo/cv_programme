/**
 * 冷启动引导 - SVG+CSS 产品预览欢迎页
 */
(function() {
  'use strict';
  var STORAGE_KEY = 'userProfile';
  var profile = localStorage.getItem(STORAGE_KEY);
  if (profile) { try { updateSidebar(JSON.parse(profile)); } catch(e) {} return; }

  showWelcomePage();

  function showWelcomePage() {
    var overlay = document.createElement('div');
    overlay.id = 'onboardingOverlay';
    overlay.className = 'ob-overlay ob-visible';
    overlay.innerHTML = '<iframe src="./landing.html?v=7" class="ob-iframe"></iframe>';
    document.body.appendChild(overlay);
    var mainArea = document.querySelector('.main-area');
    var sidebar = document.querySelector('.profile-sidebar');
    if (mainArea) mainArea.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';

    // Listen for start button click from iframe
    window.addEventListener('message', function handler(e) {
      if (e.data === 'ob-start') {
        window.removeEventListener('message', handler);
        showProfileSetup(overlay);
      }
    });
  }

  function buildWelcomeHTML() {
    return '' +
    '<div class="ob-landing">' +
      // Header
      '<div class="ob-landing-header">' +
        '<h1 class="ob-landing-title">\u5C0F\u5C0F\u6C42\u804C<span class="ob-accent">\u62FF\u4E0B</span>\uFF01</h1>' +
        '<p class="ob-landing-sub">AI \u5E2E\u4F60\u4F18\u5316\u7B80\u5386\u3001\u5339\u914D\u5C97\u4F4D\u3001\u6A21\u62DF\u9762\u8BD5\u3001\u8FFD\u8E2A\u6295\u9012\u8FDB\u5EA6<br>\u8BA9\u6C42\u804C\u66F4\u9AD8\u6548\uFF0C\u66F4\u6709\u65B9\u5411</p>' +
        '<button class="ob-landing-btn" id="obStartBtn">\uD83D\uDE80 \u5F00\u542F\u9AD8\u6548\u6C42\u804C\u4E4B\u65C5 \u2192</button>' +
      '</div>' +
      // Preview cards
      '<div class="ob-preview-grid">' +
        // Card 1: 简历诊断
        '<div class="ob-pcard">' +
          '<div class="ob-pcard-header"><span class="ob-pcard-icon">\uD83D\uDCCB</span> \u7B80\u5386\u8BCA\u65AD\u62A5\u544A</div>' +
          '<div class="ob-pcard-body">' +
            '<svg class="ob-ring" viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="none" stroke="#eee" stroke-width="6"/><circle cx="40" cy="40" r="34" fill="none" stroke="url(#grad1)" stroke-width="6" stroke-dasharray="184" stroke-dashoffset="26" stroke-linecap="round" transform="rotate(-90 40 40)"/><defs><linearGradient id="grad1"><stop offset="0%" stop-color="#6C63FF"/><stop offset="100%" stop-color="#FFB7C5"/></linearGradient></defs><text x="40" y="44" text-anchor="middle" font-size="18" font-weight="900" fill="#333">86</text><text x="40" y="56" text-anchor="middle" font-size="7" fill="#999">\u7EFC\u5408\u8BC4\u5206</text></svg>' +
            '<div class="ob-bars">' +
              '<div class="ob-bar-row"><span>\u5185\u5BB9\u5B8C\u6574\u6027</span><div class="ob-bar-track"><div class="ob-bar-fill" style="width:90%"></div></div><span>90</span></div>' +
              '<div class="ob-bar-row"><span>\u5173\u952E\u8BCD\u5339\u914D</span><div class="ob-bar-track"><div class="ob-bar-fill" style="width:82%"></div></div><span>82</span></div>' +
              '<div class="ob-bar-row"><span>\u8868\u8FBE\u6D41\u7545\u5EA6</span><div class="ob-bar-track"><div class="ob-bar-fill" style="width:65%"></div></div><span>65</span></div>' +
              '<div class="ob-bar-row"><span>\u7ED3\u6784\u89C4\u8303\u6027</span><div class="ob-bar-track"><div class="ob-bar-fill" style="width:88%"></div></div><span>88</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        // Card 2: 岗位推荐
        '<div class="ob-pcard">' +
          '<div class="ob-pcard-header"><span class="ob-pcard-icon">\uD83E\uDDE0</span> \u5C97\u4F4D\u63A8\u8350</div>' +
          '<div class="ob-pcard-body">' +
            '<svg class="ob-ring" viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="none" stroke="#eee" stroke-width="6"/><circle cx="40" cy="40" r="34" fill="none" stroke="url(#grad2)" stroke-width="6" stroke-dasharray="184" stroke-dashoffset="15" stroke-linecap="round" transform="rotate(-90 40 40)"/><defs><linearGradient id="grad2"><stop offset="0%" stop-color="#6C63FF"/><stop offset="100%" stop-color="#9C27B0"/></linearGradient></defs><text x="40" y="44" text-anchor="middle" font-size="16" font-weight="900" fill="#333">92%</text><text x="40" y="56" text-anchor="middle" font-size="7" fill="#999">\u5339\u914D\u5EA6</text></svg>' +
            '<div class="ob-job-list">' +
              '<div class="ob-job-item"><span class="ob-job-dot" style="background:#6C63FF"></span><span>\u4EA7\u54C1\u7ECF\u7406</span><span class="ob-job-meta">20-35K</span></div>' +
              '<div class="ob-job-item"><span class="ob-job-dot" style="background:#9C27B0"></span><span>\u7528\u6237\u7814\u7A76\u5458</span><span class="ob-job-meta">18-28K</span></div>' +
              '<div class="ob-job-item"><span class="ob-job-dot" style="background:#FFB7C5"></span><span>\u6570\u636E\u5206\u6790\u5E08</span><span class="ob-job-meta">15-25K</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        // Card 3: 面试辅导
        '<div class="ob-pcard">' +
          '<div class="ob-pcard-header"><span class="ob-pcard-icon">\uD83D\uDCAC</span> \u9762\u8BD5\u8F85\u5BFC</div>' +
          '<div class="ob-pcard-body ob-pcard-interview">' +
            '<div class="ob-mic-icon">\uD83C\uDFA4</div>' +
            '<div class="ob-interview-stats">' +
              '<div class="ob-istat"><span class="ob-istat-num">8</span><span>\u6A21\u62DF\u9762\u8BD5</span></div>' +
              '<div class="ob-istat"><span class="ob-istat-num">92%</span><span>\u8868\u8FBE\u6D41\u7545\u5EA6</span></div>' +
              '<div class="ob-istat"><span class="ob-istat-num">24</span><span>\u5DF2\u5B8C\u6210(h)</span></div>' +
            '</div>' +
            '<div class="ob-radar-placeholder">\u80FD\u529B\u96F7\u8FBE\u56FE</div>' +
          '</div>' +
        '</div>' +
        // Card 4: 投递追踪
        '<div class="ob-pcard">' +
          '<div class="ob-pcard-header"><span class="ob-pcard-icon">\uD83D\uDCCA</span> \u6295\u9012\u8FFD\u8E2A</div>' +
          '<div class="ob-pcard-body">' +
            '<svg class="ob-ring" viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="none" stroke="#eee" stroke-width="6"/><circle cx="40" cy="40" r="34" fill="none" stroke="#6C63FF" stroke-width="6" stroke-dasharray="70 214" stroke-linecap="round" transform="rotate(-90 40 40)"/><circle cx="40" cy="40" r="34" fill="none" stroke="#FFB7C5" stroke-width="6" stroke-dasharray="40 214" stroke-linecap="round" transform="rotate(40 40 40)"/><circle cx="40" cy="40" r="34" fill="none" stroke="#9C27B0" stroke-width="6" stroke-dasharray="30 214" stroke-linecap="round" transform="rotate(110 40 40)"/><text x="40" y="44" text-anchor="middle" font-size="18" font-weight="900" fill="#333">32</text><text x="40" y="56" text-anchor="middle" font-size="7" fill="#999">\u603B\u6295\u9012</text></svg>' +
            '<div class="ob-track-legend">' +
              '<div><span class="ob-legend-dot" style="background:#6C63FF"></span>\u9762\u8BD5\u4E2D 12</div>' +
              '<div><span class="ob-legend-dot" style="background:#9C27B0"></span>Offer 2</div>' +
              '<div><span class="ob-legend-dot" style="background:#FFB7C5"></span>\u5DF2\u62D2\u7EDD 10</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      // Bottom - removed duplicate button
    '</div>';
  }

  function showProfileSetup(overlay) {
    overlay.innerHTML = '' +
      '<div class="ob-profile">' +
        '<div class="ob-avatar-preview" id="obAvatarPreview"><img src="assets/avatars/avatar-01.png" alt="默认头像" class="ob-avatar-img" onerror="this.style.display=\'none\'"></div>' +
        '<h2 class="ob-profile-title">\u8BBE\u7F6E\u4F60\u7684\u4E2A\u4EBA\u4FE1\u606F</h2>' +
        '<p class="ob-profile-subtitle">\u9009\u62E9\u5934\u50CF\u3001\u6635\u79F0\u548C\u8EAB\u4EFD\uFF0C\u5F00\u59CB\u4F60\u7684\u6C42\u804C\u4E4B\u65C5</p>' +
        '<div class="ob-section-label">\u6027\u522B</div>' +
        '<div class="ob-gender-row" id="obGenderRow">' +
          '<div class="ob-gender-option" data-gender="male"><span>\uD83D\uDC66</span>\u7537\u751F</div>' +
          '<div class="ob-gender-option" data-gender="female"><span>\uD83D\uDC67</span>\u5973\u751F</div>' +
        '</div>' +
        '<div class="ob-section-label">\u5934\u50CF</div>' +
        '<div class="ob-avatar-grid" id="obAvatarGrid">' +
          '<div class="ob-avatar-option" data-avatar="assets/avatars/avatar-01.png"><img src="assets/avatars/avatar-01.png" alt="Avatar 1" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>' +
          '<div class="ob-avatar-option" data-avatar="assets/avatars/avatar-02.png"><img src="assets/avatars/avatar-02.png" alt="Avatar 2" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>' +
          '<div class="ob-avatar-option" data-avatar="assets/avatars/avatar-03.png"><img src="assets/avatars/avatar-03.png" alt="Avatar 3" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>' +
          '<div class="ob-avatar-option" data-avatar="assets/avatars/avatar-04.png"><img src="assets/avatars/avatar-04.png" alt="Avatar 4" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>' +
          '<div class="ob-avatar-option" data-avatar="assets/avatars/avatar-05.png"><img src="assets/avatars/avatar-05.png" alt="Avatar 5" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>' +
          '<div class="ob-avatar-option" data-avatar="assets/avatars/avatar-06.png"><img src="assets/avatars/avatar-06.png" alt="Avatar 6" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>' +
          '<div class="ob-avatar-option" data-avatar="assets/avatars/avatar-07.png"><img src="assets/avatars/avatar-07.png" alt="Avatar 7" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>' +
          '<div class="ob-avatar-option" data-avatar="assets/avatars/avatar-08.png"><img src="assets/avatars/avatar-08.png" alt="Avatar 8" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>' +
          '<div class="ob-avatar-option" data-avatar="assets/avatars/avatar-09.png"><img src="assets/avatars/avatar-09.png" alt="Avatar 9" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>' +
          '<div class="ob-avatar-option" data-avatar="assets/avatars/avatar-10.png"><img src="assets/avatars/avatar-10.png" alt="Avatar 10" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>' +
          '<div class="ob-avatar-option" data-avatar="assets/avatars/avatar-11.png"><img src="assets/avatars/avatar-11.png" alt="Avatar 11" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>' +
          '<div class="ob-avatar-option" data-avatar="assets/avatars/avatar-12.png"><img src="assets/avatars/avatar-12.png" alt="Avatar 12" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>' +
        '</div>' +
        '<div class="ob-section-label">\u6635\u79F0</div>' +
        '<input type="text" id="obNicknameInput" class="ob-nickname-input" placeholder="\u8F93\u5165\u4F60\u7684\u6635\u79F0..." maxlength="12" />' +
        '<div class="ob-section-label">\u5F53\u524D\u8EAB\u4EFD</div>' +
        '<div class="ob-identity-grid" id="obIdentityGrid">' +
          '<div class="ob-identity-option" data-identity="intern">\uD83C\uDF31 \u627E\u5B9E\u4E60</div>' +
          '<div class="ob-identity-option" data-identity="fresh">\uD83C\uDF93 \u5E94\u5C4A\u751F\u79CB\u62DB/\u6625\u62DB</div>' +
          '<div class="ob-identity-option" data-identity="experienced">\uD83D\uDCBC \u6709\u5DE5\u4F5C\u7ECF\u9A8C</div>' +
        '</div>' +
        '<div class="ob-section-label">MBTI\uFF08\u9009\u586B\uFF0C\u8F85\u52A9\u5C97\u4F4D\u63A8\u8350\uFF09</div>' +
        '<input type="text" id="obMbtiInput" class="ob-nickname-input" placeholder="\u5982 INFP\u3001ENTJ...\u6CA1\u6709\u53EF\u4EE5\u8DF3\u8FC7" maxlength="4" style="text-transform:uppercase" />' +
        '<button class="ob-finish-btn ob-btn-disabled" id="obFinishBtn">\u5B8C\u6210\u8BBE\u7F6E \u2728</button>' +
      '</div>';

    var selectedAvatar = null, selectedGender = null, selectedIdentity = null;
    var nicknameInput = document.getElementById('obNicknameInput');

    overlay.querySelectorAll('.ob-gender-option').forEach(function(opt) {
      opt.addEventListener('click', function() {
        overlay.querySelectorAll('.ob-gender-option').forEach(function(o) { o.classList.remove('ob-gender-active'); });
        opt.classList.add('ob-gender-active');
        selectedGender = opt.getAttribute('data-gender');
        check();
      });
    });
    overlay.querySelectorAll('.ob-avatar-option').forEach(function(opt) {
      opt.addEventListener('click', function() {
        overlay.querySelectorAll('.ob-avatar-option').forEach(function(o) { o.classList.remove('ob-avatar-active'); });
        opt.classList.add('ob-avatar-active');
        selectedAvatar = opt.getAttribute('data-avatar');
        var previewEl = document.getElementById('obAvatarPreview');
        if (previewEl) {
          var imgEl = previewEl.querySelector('.ob-avatar-img');
          if (imgEl && /\.(png|jpg|jpeg|gif|webp|svg)/i.test(selectedAvatar)) {
            imgEl.src = selectedAvatar; imgEl.style.display = '';
          } else if (imgEl) {
            imgEl.style.display = 'none'; previewEl.textContent = selectedAvatar;
          } else {
            previewEl.textContent = selectedAvatar;
          }
        }
        check();
      });
    });
    overlay.querySelectorAll('.ob-identity-option').forEach(function(opt) {
      opt.addEventListener('click', function() {
        overlay.querySelectorAll('.ob-identity-option').forEach(function(o) { o.classList.remove('ob-identity-active'); });
        opt.classList.add('ob-identity-active');
        selectedIdentity = opt.getAttribute('data-identity');
        check();
      });
    });
    nicknameInput.addEventListener('input', check);
    document.getElementById('obFinishBtn').addEventListener('click', function() {
      var nickname = nicknameInput.value.trim();
      if (!nickname || !selectedAvatar || !selectedGender || !selectedIdentity) return;
      var data = { nickname: nickname, avatar: selectedAvatar, gender: selectedGender, identity: selectedIdentity, createdAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      overlay.classList.add('ob-hiding');
      setTimeout(function() {
        overlay.remove();
        var m = document.querySelector('.main-area'), s = document.querySelector('.profile-sidebar');
        if (m) m.style.display = ''; if (s) s.style.display = '';
        updateSidebar(data);
      }, 500);
    });
    function check() {
      var btn = document.getElementById('obFinishBtn');
      if (nicknameInput.value.trim() && selectedAvatar && selectedGender && selectedIdentity) btn.classList.remove('ob-btn-disabled');
      else btn.classList.add('ob-btn-disabled');
    }
  }

  function updateSidebar(data) {
    var a = document.querySelector('.user-avatar-placeholder'), n = document.querySelector('.user-name');
    if (a && data.avatar) {
      if (/\.(png|jpg|jpeg|gif|webp|svg)/i.test(data.avatar)) {
        a.innerHTML = '<img src="' + data.avatar + '" alt="头像" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
      } else {
        a.textContent = data.avatar;
      }
    }
    if (n && data.nickname) n.textContent = data.nickname;
  }
})();
