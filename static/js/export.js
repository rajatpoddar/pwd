/**
 * export.js — Excel export trigger
 */

const EXPORT = (() => {
  function toExcel() {
    showToast('Excel export ho raha hai...', 'green');
    const a = document.createElement('a');
    a.href = '/api/export/excel';
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function init() {
    document.getElementById('btn-export').addEventListener('click', toExcel);
  }

  return { init, toExcel };
})();
