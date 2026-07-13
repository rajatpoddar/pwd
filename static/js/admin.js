/**
 * admin.js — Admin panel (user list + PIN reset + delete)
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
        container.innerHTML = '<div class="empty-state">Access denied.</div>';
        return;
      }
      renderUsers(data.users);
    } catch (e) {
      container.innerHTML = '<div class="empty-state">Load nahi hua!</div>';
    }
  }

  function renderUsers(users) {
    const container = document.getElementById('admin-users-list');
    if (!users || users.length === 0) {
      container.innerHTML = '<div class="empty-state">Koi user nahi mila.</div>';
      return;
    }

    const currentId = APP.getCurrentUserId();

    let html = `<div class="admin-users-grid">
      <div class="admin-users-header">
        <span>Naam / Block</span>
        <span>Contact</span>
        <span>Role</span>
        <span>Actions</span>
      </div>`;

    users.forEach(u => {
      const isSelf  = u.id === currentId;
      const isAdmin = u.role === 'admin';
      html += `
      <div class="admin-user-row ${isSelf ? 'self-row' : ''}">
        <div class="user-name-block">
          <strong>${escHtml(u.name)}</strong>
          <span class="user-sub">${escHtml(u.block || '—')}</span>
          ${isSelf ? '<span class="self-tag">You</span>' : ''}
        </div>
        <div class="user-contact">
          <span>${escHtml(u.email)}</span>
          <span class="user-sub">${escHtml(u.mobile)}</span>
        </div>
        <div>
          <span class="role-chip ${isAdmin ? 'role-admin' : 'role-user'}">
            ${isAdmin ? '👑 Admin' : '👤 User'}
          </span>
        </div>
        <div class="admin-user-actions">
          ${!isSelf ? `
            <button class="btn btn-ghost btn-sm" onclick="ADMIN.promptResetPin('${escAttr(u.id)}', '${escAttr(u.name)}')">
              🔑 Reset PIN
            </button>
            <button class="btn btn-danger btn-sm" onclick="ADMIN.confirmDelete('${escAttr(u.id)}', '${escAttr(u.name)}')">
              🗑 Delete
            </button>
          ` : '<span class="text-muted">—</span>'}
        </div>
      </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  function promptResetPin(userId, userName) {
    const newPin = prompt(`${userName} ka naya PIN set karein (4 digit):\n(Default: 1234)`, '1234');
    if (newPin === null) return; // cancelled
    if (!/^\d{4}$/.test(newPin)) {
      showToast('PIN sirf 4 digit ka hona chahiye!', 'red'); return;
    }
    doResetPin(userId, userName, newPin);
  }

  async function doResetPin(userId, userName, newPin) {
    try {
      const res  = await fetch('/api/admin/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, new_pin: newPin })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.msg || `${userName} ka PIN reset ho gaya!`);
      } else {
        showToast(data.msg || 'Reset nahi hua!', 'red');
      }
    } catch (e) {
      showToast('Server error!', 'red');
    }
  }

  async function confirmDelete(userId, userName) {
    if (!confirm(`Kya aap "${userName}" ka account permanently delete karna chahte hain?\n\nIs user ka saara data bhi delete ho jayega. Ye action undo nahi ho sakta!`)) return;
    try {
      const res  = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.msg || 'User delete ho gaya!');
        await loadUsers(); // refresh list
      } else {
        showToast(data.msg || 'Delete nahi hua!', 'red');
      }
    } catch (e) {
      showToast('Server error!', 'red');
    }
  }

  function init() {
    document.getElementById('admin-badge').addEventListener('click', open);
  }

  return { init, open, promptResetPin, confirmDelete };
})();
