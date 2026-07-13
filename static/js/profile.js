/**
 * profile.js — Profile as inline page (no popup modal)
 */

const PROFILE = (() => {
  let currentTimeout = 15;

  // Elements to hide when profile is open
  const HIDE_IDS = ['tabs-bar', 'table-area', 'copy-banner'];
  const HIDE_CLASSES = ['.section-header', '.search-bar', '.category-bar'];

  function _showPage(show) {
    // Show/hide profile page
    const page = document.getElementById('profile-page');
    if (page) page.style.display = show ? 'block' : 'none';

    // Hide/show surrounding UI elements
    HIDE_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = show ? 'none' : '';
    });
    HIDE_CLASSES.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.style.display = show ? 'none' : '';
    });
  }

  // ── Open inline profile page ──────────────────────────────────────────────
  async function open() {
    // Show page first with placeholder data so it's not blank
    _showPage(true);

    try {
      const res  = await fetch('/api/profile');
      const data = await res.json();
      if (!data.ok) { showToast('Profile load nahi hua!', 'red'); return; }

      document.getElementById('pp-name').textContent   = data.name   || '—';
      document.getElementById('pp-email').textContent  = data.email  || '—';
      document.getElementById('pp-mobile').textContent = data.mobile || '—';
      document.getElementById('pp-block').textContent  = data.block  || '—';

      // Avatar initials
      const initials = (data.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      document.getElementById('pp-avatar').textContent = initials;

      // Role badge
      const roleBadge = document.getElementById('pp-role-badge');
      roleBadge.textContent = data.role === 'admin' ? '👑 Admin' : '👤 User';
      roleBadge.className   = 'profile-role-badge ' + (data.role === 'admin' ? 'role-admin' : 'role-user');

      // Timeout
      currentTimeout = data.lock_timeout || 15;
      _updateTimeoutUI(currentTimeout);

      // Clear PIN fields
      document.getElementById('pp-old-pin').value     = '';
      document.getElementById('pp-new-pin').value     = '';
      document.getElementById('pp-confirm-pin').value = '';

    } catch (e) {
      showToast('Server error: Profile load nahi hua!', 'red');
    }
  }

  function close() {
    _showPage(false);
    // Restore active nav
    document.querySelectorAll('.desktop-sidebar-item').forEach(b => {
      b.classList.toggle('active', b.dataset.nav === 'passwords');
    });
  }

  function _updateTimeoutUI(timeout) {
    document.querySelectorAll('#pp-timeout-options .timeout-btn').forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.timeout) === timeout);
    });
  }

  async function _setLockTimeout(timeout) {
    try {
      const res  = await fetch('/api/profile/lock-timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeout })
      });
      const data = await res.json();
      if (data.ok) {
        currentTimeout = timeout;
        _updateTimeoutUI(timeout);
        APP.setAutoLockTimeout(timeout);
        const labels = { 15: '15 Minutes', 60: '1 Hour', 1440: '24 Hours' };
        showToast(`✓ Auto-lock: ${labels[timeout] || timeout + ' min'} set ho gaya!`);
      } else {
        showToast(data.msg || 'Update nahi hua!', 'red');
      }
    } catch (e) {
      showToast('Server error!', 'red');
    }
  }

  async function _savePin() {
    const old_pin     = document.getElementById('pp-old-pin').value.trim();
    const new_pin     = document.getElementById('pp-new-pin').value.trim();
    const confirm_pin = document.getElementById('pp-confirm-pin').value.trim();

    if (!old_pin || !new_pin || !confirm_pin) {
      showToast('Saare PIN fields bharein!', 'red'); return;
    }
    try {
      const res  = await fetch('/api/profile/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_pin, new_pin, confirm_pin })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.msg || '✓ PIN change ho gaya!');
        document.getElementById('pp-old-pin').value     = '';
        document.getElementById('pp-new-pin').value     = '';
        document.getElementById('pp-confirm-pin').value = '';
      } else {
        showToast(data.msg || 'PIN change nahi hua!', 'red');
      }
    } catch (e) {
      showToast('Server error!', 'red');
    }
  }

  function init() {
    // Profile open — topbar icon
    document.getElementById('btn-open-profile').addEventListener('click', open);

    // Back button
    document.getElementById('profile-page-back').addEventListener('click', close);

    // Timeout buttons
    document.getElementById('pp-timeout-options').addEventListener('click', e => {
      const btn = e.target.closest('.timeout-btn');
      if (btn) _setLockTimeout(Number(btn.dataset.timeout));
    });

    // Save PIN
    document.getElementById('pp-save-pin').addEventListener('click', _savePin);

    // Logout
    const logoutBtn = document.getElementById('pp-logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => AUTH.doLogout());

    // Legacy: keep old modal IDs working if present (no-op)
    const legacyLogout = document.getElementById('btn-logout-profile');
    if (legacyLogout) legacyLogout.addEventListener('click', () => AUTH.doLogout());
  }

  return { init, open, close };
})();
