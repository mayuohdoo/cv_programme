/**
 * ApplicationStorage - 投递记录存储层
 * 使用 chrome.storage.local 存储投递记录
 */
var ApplicationStorage = (function() {
  'use strict';

  var STORAGE_KEY = 'applicationRecords';

  /**
   * 生成 UUID
   */
  function generateId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  /**
   * 获取所有记录（按日期降序）
   */
  function getRecords() {
    return new Promise(function(resolve) {
      chrome.storage.local.get(STORAGE_KEY, function(result) {
        var records = result[STORAGE_KEY] || [];
        records.sort(function(a, b) {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        resolve(records);
      });
    });
  }

  /**
   * 添加新记录
   * @param {{ url, pageTitle, company, position }} data
   */
  function addRecord(data) {
    return new Promise(function(resolve, reject) {
      var record = {
        id: generateId(),
        date: new Date().toISOString(),
        url: data.url || window.location.href,
        pageTitle: data.pageTitle || document.title,
        company: data.company || '',
        position: data.position || '',
        status: '已投递'
      };

      chrome.storage.local.get(STORAGE_KEY, function(result) {
        var records = result[STORAGE_KEY] || [];
        records.push(record);
        var obj = {};
        obj[STORAGE_KEY] = records;
        chrome.storage.local.set(obj, function() {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(record);
          }
        });
      });
    });
  }

  /**
   * 更新记录（仅修改指定字段，date 和 url 不可修改）
   * @param {string} id
   * @param {Object} updates
   */
  function updateRecord(id, updates) {
    return new Promise(function(resolve, reject) {
      // 禁止修改 date 和 url
      delete updates.date;
      delete updates.url;
      delete updates.id;

      chrome.storage.local.get(STORAGE_KEY, function(result) {
        var records = result[STORAGE_KEY] || [];
        var index = -1;
        for (var i = 0; i < records.length; i++) {
          if (records[i].id === id) { index = i; break; }
        }
        if (index === -1) { reject(new Error('记录不存在')); return; }

        Object.keys(updates).forEach(function(key) {
          records[index][key] = updates[key];
        });

        var obj = {};
        obj[STORAGE_KEY] = records;
        chrome.storage.local.set(obj, function() {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(records[index]);
        });
      });
    });
  }

  /**
   * 删除记录
   * @param {string} id
   */
  function deleteRecord(id) {
    return new Promise(function(resolve, reject) {
      chrome.storage.local.get(STORAGE_KEY, function(result) {
        var records = result[STORAGE_KEY] || [];
        var filtered = records.filter(function(r) { return r.id !== id; });
        var obj = {};
        obj[STORAGE_KEY] = filtered;
        chrome.storage.local.set(obj, function() {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve({ success: true });
        });
      });
    });
  }

  return {
    getRecords: getRecords,
    addRecord: addRecord,
    updateRecord: updateRecord,
    deleteRecord: deleteRecord
  };
})();
