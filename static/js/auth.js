/**
 * auth.js — Login & Registration screens
 */

const AUTH = (() => {

  // ── Screen switchers ────────────────────────────────────────────────────────
  function showLogin() {
    document.getElementById('screen-login').style.display    = 'flex';
    document.getElementById('screen-register').style.display = 'none';
    document.getElementById('screen-pin').style.display      = 'none';
    document.getElementById('app').style.display             = 'none';
    document.getElementById('login-error').textContent = '';
    document.getElementById('login-identifier').value  = '';
  }

  function showRegister() {
    document.getElementById('screen-login').style.display    = 'none';
    document.getElementById('screen-register').style.display = 'flex';
    document.getElementById('screen-pin').style.display      = 'none';
    document.getElementById('app').style.display             = 'none';
    document.getElementById('reg-error').textContent = '';
  }

  function showPinScreen(name) {
    document.getElementById('screen-login').style.display    = 'none';
    document.getElementById('screen-register').style.display = 'none';
    document.getElementById('screen-pin').style.display      = 'flex';
    document.getElementById('app').style.display             = 'none';
    document.getElementById('pin-welcome-name').textContent  = `Namaste, ${name}! 👋`;
    // reset pin buffer
    PIN.reset();
  }

  // ── Login ────────────────────────────────────────────────────────────────────
  async function doLogin() {
    const identifier = document.getElementById('login-identifier').value.trim();
    const errEl      = document.getElementById('login-error');
    errEl.textContent = '';

    if (!identifier) {
      errEl.textContent = 'Email ya mobile number dalein!';
      return;
    }

    const btn = document.getElementById('btn-login');
    btn.disabled = true; btn.textContent = 'Checking...';

    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });
      const data = await res.json();
      if (data.ok) {
        showPinScreen(data.name);
      } else {
        errEl.textContent = data.msg || 'Login nahi hua!';
      }
    } catch (e) {
      errEl.textContent = 'Server se connect nahi ho paya!';
    } finally {
      btn.disabled = false; btn.textContent = 'Aage Badhein →';
    }
  }

  // ── Register ─────────────────────────────────────────────────────────────────
  async function doRegister() {
    const name    = document.getElementById('reg-name').value.trim();
    const block   = document.getElementById('reg-block').value.trim();
    const email   = document.getElementById('reg-email').value.trim();
    const mobile  = document.getElementById('reg-mobile').value.trim();
    const pin     = document.getElementById('reg-pin').value.trim();
    const pinConf = document.getElementById('reg-pin-confirm').value.trim();
    const errEl   = document.getElementById('reg-error');
    errEl.textContent = '';

    if (!name || !block || !email || !mobile || !pin || !pinConf) {
      errEl.textContent = 'Saare fields zaruri hain!'; return;
    }
    if (pin !== pinConf) {
      errEl.textContent = 'Dono PIN match nahi karte!'; return;
    }
    if (!/^\d{4}$/.test(pin)) {
      errEl.textContent = 'PIN sirf 4 digit ka hona chahiye!'; return;
    }
    if (!/^\d{10}$/.test(mobile)) {
      errEl.textContent = 'Mobile number 10 digit ka hona chahiye!'; return;
    }

    const btn = document.getElementById('btn-register');
    btn.disabled = true; btn.textContent = 'Registering...';

    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, block, email, mobile, pin })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.msg || 'Registration ho gayi!', 'green');
        setTimeout(showLogin, 800);
      } else {
        errEl.textContent = data.msg || 'Registration nahi hui!';
      }
    } catch (e) {
      errEl.textContent = 'Server error!';
    } finally {
      btn.disabled = false; btn.textContent = 'Register Karein';
    }
  }

  // ── Logout ───────────────────────────────────────────────────────────────────
  async function doLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    APP.clearAutoLock();
    showLogin();
  }

  // ── Check existing session on page load ──────────────────────────────────────
  async function checkSession() {
    try {
      const res  = await fetch('/api/auth/status');
      const data = await res.json();
      if (data.logged_in && data.pin_verified) {
        // Already fully authenticated — go straight to app
        await APP.showApp(data);
      } else if (data.logged_in && !data.pin_verified) {
        // Session exists but PIN not yet verified
        showPinScreen(data.name);
      } else {
        showLogin();
      }
    } catch (e) {
      showLogin();
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    document.getElementById('btn-goto-register').addEventListener('click', showRegister);
    document.getElementById('btn-goto-login').addEventListener('click', showLogin);
    document.getElementById('btn-login').addEventListener('click', doLogin);
    document.getElementById('btn-register').addEventListener('click', doRegister);
    document.getElementById('btn-pin-logout').addEventListener('click', doLogout);

    // Enter key on login
    document.getElementById('login-identifier').addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });
    // Enter key on register fields
    ['reg-name','reg-block','reg-email','reg-mobile','reg-pin','reg-pin-confirm'].forEach(id => {
      document.getElementById(id).addEventListener('keydown', e => {
        if (e.key === 'Enter') doRegister();
      });
    });
  }

  return { init, showLogin, showRegister, showPinScreen, doLogout, checkSession };
})();
