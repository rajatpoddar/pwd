/**
 * auth.js — Login & Registration screens
 */

const AUTH = (() => {

  // ── Screen switchers ────────────────────────────────────────────────────────
  function _hideApp() {
    const appEl = document.getElementById('app');
    appEl.style.display = 'none';
    appEl.classList.remove('visible');
    // Dark theme for auth/pin screens
    if (typeof setThemeColor === 'function') setThemeColor('#0f172a');
  }

  function showLogin() {
    document.getElementById('screen-login').style.display    = 'flex';
    document.getElementById('screen-register').style.display = 'none';
    document.getElementById('screen-pin').style.display      = 'none';
    _hideApp();
    document.getElementById('login-error').textContent = '';
    document.getElementById('login-identifier').value  = '';
  }

  function showRegister() {
    document.getElementById('screen-login').style.display    = 'none';
    document.getElementById('screen-register').style.display = 'flex';
    document.getElementById('screen-pin').style.display      = 'none';
    _hideApp();
    document.getElementById('reg-error').textContent = '';
  }

  function showPinScreen(name) {
    document.getElementById('screen-login').style.display    = 'none';
    document.getElementById('screen-register').style.display = 'none';
    document.getElementById('screen-pin').style.display      = 'flex';
    _hideApp();
    document.getElementById('pin-welcome-name').textContent  = `Welcome, ${name}!`;
    // reset pin buffer
    PIN.reset();
  }

  // ── Login ────────────────────────────────────────────────────────────────────
  async function doLogin() {
    const identifier = document.getElementById('login-identifier').value.trim();
    const errEl      = document.getElementById('login-error');
    errEl.textContent = '';

    if (!identifier) {
      errEl.textContent = 'Please enter your email or mobile number!';
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
        errEl.textContent = data.msg || 'Login failed!';
      }
    } catch (e) {
      errEl.textContent = 'Could not connect to server!';
    } finally {
      btn.disabled = false; btn.textContent = 'Login →';
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
      errEl.textContent = 'All fields are required!'; return;
    }
    if (pin !== pinConf) {
      errEl.textContent = 'PINs do not match!'; return;
    }
    if (!/^\d{4}$/.test(pin)) {
      errEl.textContent = 'PIN must be exactly 4 digits!'; return;
    }
    if (!/^\d{10}$/.test(mobile)) {
      errEl.textContent = 'Mobile number must be 10 digits!'; return;
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
        showToast(data.msg || 'Registration successful!', 'green');
        setTimeout(showLogin, 800);
      } else {
        errEl.textContent = data.msg || 'Registration failed!';
      }
    } catch (e) {
      errEl.textContent = 'Server error!';
    } finally {
      btn.disabled = false; btn.textContent = 'Register';
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
