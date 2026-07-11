/**
 * pin.js — PIN screen logic
 * Communicates with /api/pin/verify and /api/pin/change
 */

const PIN = (() => {
  let buffer = '';

  function updateDots() {
    for (let i = 0; i < 4; i++) {
      document.getElementById('d' + i)
        .classList.toggle('filled', i < buffer.length);
    }
  }

  function setError(msg) {
    const el = document.getElementById('pin-error');
    el.textContent = msg;
  }

  function clearError() {
    document.getElementById('pin-error').textContent = '';
  }

  async function verify() {
    const pin = buffer;
    buffer = '';
    updateDots();
    try {
      const res = await fetch('/api/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      if (res.ok) {
        clearError();
        APP.showApp();
      } else {
        setError('Galat PIN! Dobara try karein.');
        // shake
        const screen = document.getElementById('pin-screen');
        screen.classList.remove('shake');
        void screen.offsetWidth; // reflow
        screen.classList.add('shake');
        setTimeout(() => screen.classList.remove('shake'), 500);
      }
    } catch (e) {
      setError('Server se connect nahi ho paya!');
    }
  }

  function key(k) {
    if (k === 'clear') { buffer = ''; }
    else if (k === 'back') { buffer = buffer.slice(0, -1); }
    else if (buffer.length < 4) { buffer += k; }
    updateDots();
    if (buffer.length === 4) setTimeout(verify, 150);
  }

  // ── Change PIN ──────────────────────────────────────────────────────────
  async function saveNewPin() {
    const old_pin     = document.getElementById('old-pin-input').value.trim();
    const new_pin     = document.getElementById('new-pin-input').value.trim();
    const confirm_pin = document.getElementById('confirm-pin-input').value.trim();

    try {
      const res = await fetch('/api/pin/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_pin, new_pin, confirm_pin })
      });
      const data = await res.json();
      if (data.ok) {
        MODAL.close('pin-change-modal');
        showToast(data.msg || 'PIN change ho gaya!');
      } else {
        showToast(data.msg || 'PIN change nahi hua!', 'red');
      }
    } catch (e) {
      showToast('Server error!', 'red');
    }
  }

  function openChangePinModal() {
    document.getElementById('old-pin-input').value     = '';
    document.getElementById('new-pin-input').value     = '';
    document.getElementById('confirm-pin-input').value = '';
    MODAL.open('pin-change-modal');
  }

  // ── Init ────────────────────────────────────────────────────────────────
  function init() {
    // Keypad click
    document.querySelectorAll('.key').forEach(btn => {
      btn.addEventListener('click', () => key(btn.dataset.key));
    });

    // Physical keyboard (only on pin screen)
    document.addEventListener('keydown', e => {
      if (document.getElementById('pin-screen').style.display === 'none') return;
      if (e.target.tagName === 'INPUT') return;
      if (e.key >= '0' && e.key <= '9') key(e.key);
      else if (e.key === 'Backspace') key('back');
      else if (e.key === 'Escape' || e.key === 'Delete') key('clear');
    });

    // Change PIN buttons
    document.getElementById('change-pin-btn')
      .addEventListener('click', openChangePinModal);
    document.getElementById('btn-change-pin-app')
      .addEventListener('click', openChangePinModal);

    document.getElementById('btn-save-pin')
      .addEventListener('click', saveNewPin);
  }

  return { init };
})();
