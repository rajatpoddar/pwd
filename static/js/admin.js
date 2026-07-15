/**
 * admin.js — Admin panel (user list + PIN reset + delete)
 * Uses custom confirm dialog instead of browser prompt/confirm
 */

const ADMIN = (() => {

  async function open() {
    MODAL.open('admin-modal');
    await loadUsers();
  }

  async function loadUsers() {
    const container = document.getElementById('admin-users-list');
    container.innerHTML = '<div class="loading-state">Loading...</div>';
    try {
      const res  = await fetch('/api/admin/users');
      const data = await res.json();
      if (!data.ok) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-title">Access Denied</div></div>';
        return;
      }
      renderUsers(data.users);
    } catch (e) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📡</div><div class="empty-state-title">Could not load!</div></div>';
    }
  }

  function renderUsers(users) {
    const container = document.getElementById('admin-users-list');
    if (!users || users.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-title">No users found.</div></div>';
      return;
    }

    const currentId = APP.getCurrentUserId();
    let html = '';

    users.forEach(u => {
      const isSelf  = u.id === currentId;
      const isAdmin = u.role === 'admin';
      const initials = u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

      html += `
      <div class="admin-user-card ${isSelf ? 'self-row' : ''}">
        <div class="admin-user-avatar">${escHtml(initials)}</div>
        <div class="admin-user-info">
          <div class="admin-user-name">
            ${escHtml(u.name)}
            <span class="role-chip ${isAdmin ? 'role-admin' : 'role-user'}">${isAdmin ? 'Admin' : 'User'}</span>
            ${isSelf ? '<span class="self-tag">You</span>' : ''}
          </div>
          <div class="admin-user-sub">${escHtml(u.email)} · ${escHtml(u.mobile)} · ${escHtml(u.block || '—')}</div>
          <div id="reset-pin-area-${escAttr(u.id)}" style="display:none" class="reset-pin-row">
            <input type="number" id="reset-pin-input-${escAttr(u.id)}" placeholder="New 4-digit PIN"
                   maxlength="4" inputmode="numeric" min="1000" max="9999">
            <button class="btn btn-primary btn-sm"
                    onclick="ADMIN.doResetPin('${escAttr(u.id)}','${escAttr(u.name)}')">Set PIN</button>
            <button class="btn btn-ghost btn-sm"
                    onclick="document.getElementById('reset-pin-area-${escAttr(u.id)}').style.display='none'">Cancel</button>
          </div>
        </div>
        <div class="admin-user-actions">
          ${!isSelf ? `
            <button class="btn btn-ghost btn-sm" onclick="ADMIN.showResetPin('${escAttr(u.id)}')">🔑 Reset</button>
            <button class="btn btn-danger btn-sm" onclick="ADMIN.confirmDelete('${escAttr(u.id)}','${escAttr(u.name)}')">🗑</button>
          ` : '<span class="text-muted" style="font-size:.78rem">Current User</span>'}
        </div>
      </div>`;
    });

    container.innerHTML = html;
  }

  function showResetPin(userId) {
    const area = document.getElementById('reset-pin-area-' + userId);
    if (area) {
      area.style.display = area.style.display === 'none' ? 'flex' : 'none';
      const input = document.getElementById('reset-pin-input-' + userId);
      if (input) { input.value = '1234'; input.focus(); input.select(); }
    }
  }

  async function doResetPin(userId, userName) {
    const input = document.getElementById('reset-pin-input-' + userId);
    const newPin = input ? String(input.value).trim() : '';
    if (!/^\d{4}$/.test(newPin)) {
      showToast('PIN must be exactly 4 digits!', 'red'); return;
    }
    try {
      const res  = await fetch('/api/admin/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, new_pin: newPin })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.msg || `${userName}'s PIN has been reset!`);
        const area = document.getElementById('reset-pin-area-' + userId);
        if (area) area.style.display = 'none';
      } else {
        showToast(data.msg || 'Reset failed!', 'red');
      }
    } catch (e) {
      showToast('Server error!', 'red');
    }
  }

  function confirmDelete(userId, userName) {
    showConfirm({
      icon: '🗑️',
      title: 'Delete User?',
      msg: `"${userName}" will be permanently deleted along with all their data. This action cannot be undone!`,
      okLabel: 'Delete',
      okClass: 'btn-danger',
      onOk: async () => {
        try {
          const res  = await fetch('/api/admin/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
          });
          const data = await res.json();
          if (data.ok) {
            showToast(data.msg || 'User deleted!');
            await loadUsers();
          } else {
            showToast(data.msg || 'Delete failed!', 'red');
          }
        } catch (e) {
          showToast('Server error!', 'red');
        }
      }
    });
  }

  function init() {
    document.getElementById('admin-badge').addEventListener('click', open);
  }

  return { init, open, showResetPin, doResetPin, confirmDelete };
})();
