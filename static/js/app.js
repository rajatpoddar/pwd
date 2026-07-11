/**
 * app.js — Core app bootstrap, global helpers, data layer
 * Must be loaded LAST (after pin.js, categories.js, entries.js, export.js)
 */

// ── Global helpers ──────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escAttr(s) {
  return String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function showToast(msg, type = 'green') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = type === 'red' ? '#ef4444' : '#22c55e';
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Modal helper ─────────────────────────────────────────────────────────────
const MODAL = {
  open(id)  { document.getElementById(id).classList.add('open'); },
  close(id) { document.getElementById(id).classList.remove('open'); }
};

// Close on overlay click or [data-close] buttons
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
  if (e.target.dataset.close) {
    MODAL.close(e.target.dataset.close);
  }
});

// ── Central App state & data layer ───────────────────────────────────────────
const APP = (() => {
  let _data = null;
  let currentCategory = null;

  // Fetch data from server
  async function loadData() {
    try {
      const res = await fetch('/api/data');
      _data = await res.json();
      if (!_data.categories || _data.categories.length === 0) {
        // server will return defaults; but just in case:
        _data = { categories: [] };
      }
      return _data;
    } catch (e) {
      showToast('Data load nahi ho paya!', 'red');
      _data = { categories: [] };
      return _data;
    }
  }

  function getData() { return _data; }

  async function persistData(data) {
    _data = data;
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      showToast('Data save nahi ho paya!', 'red');
    }
  }

  async function showApp() {
    document.getElementById('pin-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    await loadData();
    const data = getData();
    if (data.categories.length > 0) {
      currentCategory = data.categories[0].id;
    }
    CATEGORIES.renderTabs();
    ENTRIES.renderTable();
  }

  function lock() {
    location.reload();
  }

  function init() {
    document.getElementById('btn-lock').addEventListener('click', lock);

    // Init sub-modules
    PIN.init();
    CATEGORIES.init();
    ENTRIES.init();
    EXPORT.init();
  }

  // Expose
  return {
    get currentCategory() { return currentCategory; },
    set currentCategory(v) { currentCategory = v; },
    getData,
    persistData,
    showApp,
    init
  };
})();

// ── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => APP.init());
