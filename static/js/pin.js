/**
 * pin.js — PIN screen logic (multi-user)
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
    document.getElementById('pin-error').textContent = msg;
  }

  function clearError() {
    document.getElementById('pin-error').textContent = '';
  }

  function reset() {
    buffer = '';
    updateDots();
    clearError();
  }

  async function verify() {
    const pin = buffer;
    buffer = '';
    updateDots();
    try {
      const res = await fetch('/api/auth/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        clearError();
        await APP.showApp(data);
      } else {
        setError(data.msg || 'Wrong PIN! Please try again.');
        const screen = document.getElementById('pin-screen-inner');
        screen.classList.remove('shake');
        void screen.offsetWidth;
        screen.classList.add('shake');
        setTimeout(() => screen.classList.remove('shake'), 650);
      }
    } catch (e) {
      setError('Could not connect to server!');
    }
  }

  function key(k) {
    if (k === 'clear') { buffer = ''; }
    else if (k === 'back') { buffer = buffer.slice(0, -1); }
    else if (buffer.length < 4) { buffer += k; }
    updateDots();
    if (buffer.length === 4) setTimeout(verify, 150);
  }

  function init() {
    document.querySelectorAll('.key').forEach(btn => {
      btn.addEventListener('click', () => key(btn.dataset.key));
    });

    document.addEventListener('keydown', e => {
      if (document.getElementById('screen-pin').style.display === 'none') return;
      if (e.target.tagName === 'INPUT') return;
      if (e.key >= '0' && e.key <= '9') key(e.key);
      else if (e.key === 'Backspace') key('back');
      else if (e.key === 'Escape' || e.key === 'Delete') key('clear');
    });
  }

  return { init, reset };
})();
