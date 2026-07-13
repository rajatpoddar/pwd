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
  t.className = '';
  if (type === 'red')    t.classList.add('show','toast-error');
  else if (type === 'orange') t.classList.add('show','toast-info');
  else                   t.classList.add('show','toast-success');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Theme color switcher ──────────────────────────────────────────────────────
function setThemeColor(color) {
  const meta = document.getElementById('meta-theme-color');
  if (meta) meta.setAttribute('content', color);
}

// ── Custom Confirm Dialog (replaces browser confirm()) ────────────────────────
function showConfirm(opts) {
  // opts: { icon, title, msg, okLabel, okClass, onOk }
  const overlay = document.getElementById('confirm-dialog');
  document.getElementById('confirm-icon').textContent  = opts.icon  || '⚠️';
  document.getElementById('confirm-title').textContent = opts.title || 'Confirm karein';
  document.getElementById('confirm-msg').textContent   = opts.msg   || 'Kya aap sure hain?';
  const okBtn = document.getElementById('confirm-ok-btn');
  okBtn.textContent = opts.okLabel || 'Confirm';
  okBtn.className = 'btn ' + (opts.okClass || 'btn-danger');
  overlay.classList.add('open');
  const closeConfirm = () => overlay.classList.remove('open');
  document.getElementById('confirm-cancel-btn').onclick = closeConfirm;
  okBtn.onclick = () => { closeConfirm(); if (opts.onOk) opts.onOk(); };
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
  let _lockTimeout = 15;
  let _lockTimer   = null;
  let _lastActivity = Date.now();

  // ── Show App (called after PIN verified) ────────────────────────────────────
  async function showApp(userData) {
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

    const appEl = document.getElementById('app');
    appEl.style.display = 'block';
    appEl.classList.add('visible');
    setThemeColor('#ffffff'); // light theme when app is open

    // Show admin badge only for admin
    const adminBadge = document.getElementById('admin-badge');
    adminBadge.style.display = _userRole === 'admin' ? 'inline-flex' : 'none';

    // Show desktop sidebar on wide screens
    const sidebar = document.getElementById('desktop-sidebar');
    sidebar.style.display = window.innerWidth >= 769 ? 'flex' : 'none';

    await loadData();
    const data = getData();
    if (data.categories && data.categories.length > 0) {
      currentCategory = data.categories[0].id;
    }
    CATEGORIES.renderTabs();
    ENTRIES.renderTable();
    startAutoLock(_lockTimeout);
  }

  let currentCategory = null;

  async function loadData() {
    try {
      const res = await fetch('/api/data');
      if (res.status === 401 || res.status === 403) {
        AUTH.doLogout(); return;
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
    try { await fetch('/api/auth/lock', { method: 'POST' }); } catch (_) {}
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
    // Lock buttons
    document.getElementById('btn-lock').addEventListener('click', lock);

    // Logout from profile
    const logoutBtn = document.getElementById('btn-logout-profile');
    if (logoutBtn) logoutBtn.addEventListener('click', () => AUTH.doLogout());

    // Bottom nav + desktop sidebar clicks
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nav = btn.dataset.nav;
        if (nav === 'export') { EXPORT.toExcel(); return; }
        if (nav === 'profile') {
          // Mark sidebar active
          document.querySelectorAll('.desktop-sidebar-item').forEach(b => b.classList.remove('active'));
          const sideProfile = document.querySelector('.desktop-sidebar-item[data-nav="profile"]');
          if (sideProfile) sideProfile.classList.add('active');
          PROFILE.open();
          return;
        }
        // passwords tab — close profile page if open, restore view
        if (typeof PROFILE !== 'undefined') PROFILE.close();
        document.querySelectorAll('[data-nav]').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.nav-item[data-nav]').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.desktop-sidebar-item[data-nav]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // FAB button (mobile quick-add)
    const fab = document.getElementById('fab-add-entry');
    if (fab) fab.addEventListener('click', () => ENTRIES.openAdd());

    // Export nav button
    const navExport = document.getElementById('nav-export-btn');
    if (navExport) navExport.addEventListener('click', () => EXPORT.toExcel());

    // Sidebar export
    const sideExport = document.getElementById('sidebar-export');
    if (sideExport) sideExport.addEventListener('click', () => EXPORT.toExcel());

    // Admin badge
    document.getElementById('admin-badge').addEventListener('click', () => ADMIN.open());

    // Activity tracking
    ['click', 'keydown', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, () => {
        if (_lockTimer) resetActivityTimer();
      }, { passive: true });
    });

    window.addEventListener('beforeunload', () => {
      navigator.sendBeacon('/api/auth/lock');
    });

    // Resize: show/hide desktop sidebar
    window.addEventListener('resize', () => {
      const sidebar = document.getElementById('desktop-sidebar');
      if (sidebar && document.getElementById('app').style.display !== 'none') {
        sidebar.style.display = window.innerWidth >= 769 ? 'flex' : 'none';
      }
    });

    // Init all sub-modules
    AUTH.init();
    PIN.init();
    PROFILE.init();
    CATEGORIES.init();
    ENTRIES.init();
    EXPORT.init();
    if (typeof ADMIN !== 'undefined') ADMIN.init();

    // Search input (live filter)
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => ENTRIES.renderTable(searchInput.value));
    }

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
