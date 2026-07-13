/**
 * profile.js — Profile panel & settings
 */

const PROFILE = (() => {
  let currentTimeout = 15;

  async function open() {
    try {
      const res  = await fetch('/api/profile');
      const data = await res.json();
      if (!data.ok) { showToast('Profile load nahi hua!', 'red'); return; }

      document.getElementById('profile-name-display').textContent  = data.name;
      document.getElementById('profile-email-display').textContent = data.email;
      document.getElementById('profile-mobile-display').textContent= data.mobile;
      document.getElementById('profile-block-display').textContent = data.block || '—';

      // Avatar initials
      const initials = data.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
      document.getElementById('profile-avatar-initials').textContent = initials;

      // Role badge
      const roleBadge = document.getElementById('profile-role-badge');
      roleBadge.textContent = data.role === 'admin' ? '👑 Admin' : '👤 User';
      roleBadge.className   = 'profile-role-badge ' + (data.role === 'admin' ? 'role-admin' : 'role-user');

      // Timeout buttons
      currentTimeout = data.lock_timeout || 15;
      updateTimeoutUI(currentTimeout);

      // Clear PIN fields
      document.getElementById('old-pin-input').value     = '';
      document.getElementById('new-pin-input').value     = '';
      document.getElementById('confirm-pin-input').value = '';

      MODAL.open('profile-modal');
    } catch (e) {
      showToast('Server error!', 'red');
    }
  }

  function updateTimeoutUI(timeout) {
    document.querySelectorAll('.timeout-btn').forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.timeout) === timeout);
    });
  }

  async function setLockTimeout(timeout) {
    try {
      const res  = await fetch('/api/profile/lock-timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeout })
      });
      const data = await res.json();
      if (data.ok) {
        currentTimeout = timeout;
        updateTimeoutUI(timeout);
        APP.setAutoLockTimeout(timeout);
        const labels = { 15: '15 Minutes', 60: '1 Hour', 1440: '24 Hours' };
        showToast(`Auto-lock: ${labels[timeout] || timeout + ' min'} set ho gaya!`);
      } else {
        showToast(data.msg || 'Update nahi hua!', 'red');
      }
    } catch (e) {
      showToast('Server error!', 'red');
    }
  }

  async function savePin() {
    const old_pin     = document.getElementById('old-pin-input').value.trim();
    const new_pin     = document.getElementById('new-pin-input').value.trim();
    const confirm_pin = document.getElementById('confirm-pin-input').value.trim();

    try {
      const res  = await fetch('/api/profile/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_pin, new_pin, confirm_pin })
      });
      const data = await res.json();
      if (data.ok) {
        MODAL.close('profile-modal');
        showToast(data.msg || 'PIN change ho gaya!');
      } else {
        showToast(data.msg || 'PIN change nahi hua!', 'red');
      }
    } catch (e) {
      showToast('Server error!', 'red');
    }
  }

  function init() {
    document.getElementById('btn-open-profile').addEventListener('click', open);
    document.getElementById('btn-save-pin').addEventListener('click', savePin);

    document.getElementById('timeout-options').addEventListener('click', e => {
      const btn = e.target.closest('.timeout-btn');
      if (btn) setLockTimeout(Number(btn.dataset.timeout));
    });
  }

  return { init };
})();
