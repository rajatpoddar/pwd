/**
 * app.js — Core bootstrap, global helpers, data layer, auto-lock
 * Load LAST (after all other JS files)
 */

// ── Global helpers ────────────────────────────────────────────────────────────
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
  t.style.background = type === 'red' ? '#ef4444'
                      : type === 'orange' ? '#f97316'
                      : '#22c55e';
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Modal helper ──────────────────────────────────────────────────────────────
const MODAL = {
  open(id)  { document.getElementById(id).classList.add('open'); },
  close(id) { document.getElementById(id).classList.remove('open'); }
};

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
  if (e.target.dataset.close) {
    MODAL.close(e.target.dataset.close);
  }
});

// ── Central App ───────────────────────────────────────────────────────────────
const APP = (() => {
  let _data        = null;
  let _userId      = null;
  let _userRole    = null;
  let _lockTimeout = 15; // minutes
  let _lockTimer   = null;
  let _lastActivity = Date.now();

  // ── Show App (called after PIN verified) ────────────────────────────────────
  async function showApp(userData) {
    // If user_id not present (e.g. from checkSession path), fetch status
    if (!userData.user_id) {
      const status = await fetch('/api/auth/status').then(r => r.json());
      userData = { ...userData, ...status };
    }
    _userId      = userData.user_id;
    _userRole    = userData.role         || 'user';
    _lockTimeout = userData.lock_timeout || 15;

    document.getElementById('screen-login').style.display    = 'none';
    document.getElementById('screen-register').style.display = 'none';
    document.getElementById('screen-pin').style.display      = 'none';
    document.getElementById('app').style.display             = 'block';

    // Show admin badge only for admin
    const adminBadge = document.getElementById('admin-badge');
    adminBadge.style.display = _userRole === 'admin' ? 'inline-flex' : 'none';

    await loadData();
    const data = getData();
    if (data.categories && data.categories.length > 0) {
      currentCategory = data.categories[0].id;
    }
    CATEGORIES.renderTabs();
    ENTRIES.renderTable();

    // Start auto-lock timer
    startAutoLock(_lockTimeout);
  }

  // ── Data ────────────────────────────────────────────────────────────────────
  let currentCategory = null;

  async function loadData() {
    try {
      const res = await fetch('/api/data');
      if (res.status === 401 || res.status === 403) {
        // Session expired
        AUTH.doLogout();
        return;
      }
      _data = await res.json();
      if (!_data.categories) _data = { categories: [] };
    } catch (e) {
      showToast('Data load nahi ho paya!', 'red');
      _data = { categories: [] };
    }
  }

  function getData() { return _data; }

  async function persistData(data) {
    _data = data;
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.status === 401 || res.status === 403) {
        showToast('Session expire ho gaya! Dobara login karein.', 'red');
        AUTH.doLogout();
      }
    } catch (e) {
      showToast('Data save nahi ho paya!', 'red');
    }
  }

  function getCurrentUserId() { return _userId; }

  // ── Lock ────────────────────────────────────────────────────────────────────
  async function lock() {
    clearAutoLock();
    try {
      await fetch('/api/auth/lock', { method: 'POST' });
    } catch (_) {}
    // Show PIN screen again
    const status = await fetch('/api/auth/status').then(r => r.json()).catch(() => null);
    if (status && status.logged_in) {
      AUTH.showPinScreen(status.name);
    } else {
      AUTH.showLogin();
    }
  }

  // ── Auto-lock timer ─────────────────────────────────────────────────────────
  function startAutoLock(minutes) {
    clearAutoLock();
    if (!minutes) return;
    const ms = minutes * 60 * 1000;
    _lockTimer = setTimeout(() => {
      showToast('⏱ Auto-lock ho gaya!', 'orange');
      setTimeout(lock, 1000);
    }, ms);

    // Reset timer on user activity
    _lastActivity = Date.now();
  }

  function resetActivityTimer() {
    if (!_lockTimer) return;
    clearAutoLock();
    startAutoLock(_lockTimeout);
  }

  function clearAutoLock() {
    if (_lockTimer) { clearTimeout(_lockTimer); _lockTimer = null; }
  }

  function setAutoLockTimeout(minutes) {
    _lockTimeout = minutes;
    startAutoLock(minutes);
  }

  // ── Init ────────────────────────────────────────────────────────────────────
  function init() {
    // Lock button
    document.getElementById('btn-lock').addEventListener('click', lock);

    // Activity tracking (reset timer on any interaction)
    ['click', 'keydown', 'mousemove', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, () => {
        if (_lockTimer) resetActivityTimer();
      }, { passive: true });
    });

    // Lock when browser/tab is closed (beforeunload = tab/window close)
    window.addEventListener('beforeunload', () => {
      navigator.sendBeacon('/api/auth/lock');
    });

    // Init all sub-modules
    AUTH.init();
    PIN.init();
    PROFILE.init();
    ADMIN.init();
    CATEGORIES.init();
    ENTRIES.init();
    EXPORT.init();

    // Check existing session
    AUTH.checkSession();
  }

  return {
    get currentCategory()  { return currentCategory; },
    set currentCategory(v) { currentCategory = v; },
    getData,
    persistData,
    showApp,
    clearAutoLock,
    setAutoLockTimeout,
    getCurrentUserId,
    init
  };
})();

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => APP.init());
