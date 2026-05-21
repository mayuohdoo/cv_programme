/**
 * InfoExtractor - 从页面中提取公司名称和职位名称
 */
var InfoExtractor = (function() {
  'use strict';

  /**
   * 从 URL 中提取域名作为公司名 fallback
   */
  function getDomain() {
    try {
      var hostname = window.location.hostname;
      // 去掉 www. 前缀和常见后缀
      hostname = hostname.replace(/^www\./, '');
      var parts = hostname.split('.');
      if (parts.length >= 2) return parts[0];
      return hostname;
    } catch (e) {
      return '未知网站';
    }
  }

  /**
   * 从页面标题中提取公司名
   * 常见格式："职位名称 - 公司名称" 或 "公司名称 - 招聘"
   */
  function extractFromTitle(title) {
    if (!title) return { company: '', position: '' };
    var result = { company: '', position: '' };

    // 尝试分隔符拆分
    var separators = [' - ', ' | ', ' – ', ' — ', '_', ' · '];
    for (var i = 0; i < separators.length; i++) {
      var parts = title.split(separators[i]);
      if (parts.length >= 2) {
        // 通常格式：职位 - 公司 或 公司 - 职位
        var part0 = parts[0].trim();
        var part1 = parts[1].trim();

        // 如果包含"招聘"/"校招"等关键词，那一段可能是公司
        if (/招聘|校招|官网|careers|jobs/i.test(part1)) {
          result.position = part0;
          result.company = part1.replace(/[招聘校招官网\-\s]/g, '').trim();
        } else if (/招聘|校招|官网|careers|jobs/i.test(part0)) {
          result.company = part0.replace(/[招聘校招官网\-\s]/g, '').trim();
          result.position = part1;
        } else {
          // 默认：第一段是职位，第二段是公司
          result.position = part0;
          result.company = part1;
        }
        break;
      }
    }
    return result;
  }

  /**
   * 从页面 heading 元素中提取信息
   */
  function extractFromHeadings() {
    var result = { company: '', position: '' };
    var headings = document.querySelectorAll('h1, h2, h3');

    for (var i = 0; i < headings.length; i++) {
      var text = headings[i].textContent.trim();
      if (text.length > 50 || text.length < 2) continue;

      // 包含公司相关关键词
      if (/公司|集团|有限|科技|网络|信息|技术|金融|银行|证券/i.test(text) && !result.company) {
        result.company = text.substring(0, 30);
      }
      // 包含职位相关关键词
      if (/工程师|经理|专员|实习|助理|设计|运营|分析|开发|产品|市场|销售|顾问/i.test(text) && !result.position) {
        result.position = text.substring(0, 30);
      }
    }
    return result;
  }

  /**
   * 提取公司名称
   * @returns {string} 始终返回非空字符串
   */
  function extractCompany() {
    // 1. 从标题提取
    var fromTitle = extractFromTitle(document.title);
    if (fromTitle.company) return fromTitle.company;

    // 2. 从 heading 提取
    var fromHeadings = extractFromHeadings();
    if (fromHeadings.company) return fromHeadings.company;

    // 3. Fallback: 使用域名
    return getDomain();
  }

  /**
   * 提取职位名称
   * @returns {string} 始终返回非空字符串
   */
  function extractPosition() {
    // 1. 从标题提取
    var fromTitle = extractFromTitle(document.title);
    if (fromTitle.position) return fromTitle.position;

    // 2. 从 heading 提取
    var fromHeadings = extractFromHeadings();
    if (fromHeadings.position) return fromHeadings.position;

    // 3. Fallback: 使用页面标题
    return document.title.substring(0, 30) || '未知职位';
  }

  return {
    extractCompany: extractCompany,
    extractPosition: extractPosition
  };
})();
