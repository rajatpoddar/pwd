/**
 * categories.js — Category CRUD & Tab rendering
 */

const CATEGORIES = (() => {
  let editingMode = false;

  // ── Tabs ─────────────────────────────────────────────────────────────────
  function renderTabs() {
    const data = APP.getData();
    const bar  = document.getElementById('tabs-bar');
    bar.querySelectorAll('.tab').forEach(t => t.remove());
    const addBtn = document.getElementById('add-category-btn');

    data.categories.forEach(cat => {
      const t = document.createElement('button');
      t.className = 'tab' + (cat.id === APP.currentCategory ? ' active' : '');
      t.textContent = cat.name;
      t.addEventListener('click', () => {
        APP.currentCategory = cat.id;
        renderTabs();
        ENTRIES.renderTable();
      });
      bar.insertBefore(t, addBtn);
    });
  }

  // ── Open Add ──────────────────────────────────────────────────────────────
  function openAdd() {
    editingMode = false;
    document.getElementById('cat-modal-title').textContent = 'Naya Category Banayein';
    document.getElementById('cat-name-input').value = '';
    document.getElementById('col-fields').innerHTML = '';
    addColField('P.Code');
    addColField('Name');
    addColField('Username');
    addColField('Password');
    document.getElementById('btn-save-category').textContent = 'Category Banayein';
    MODAL.open('cat-modal');
  }

  // ── Open Edit ─────────────────────────────────────────────────────────────
  function openEdit() {
    const cat = APP.getData().categories.find(c => c.id === APP.currentCategory);
    if (!cat) return;
    editingMode = true;
    document.getElementById('cat-modal-title').textContent = 'Category Edit Karein';
    document.getElementById('cat-name-input').value = cat.name;
    document.getElementById('col-fields').innerHTML = '';
    cat.columns.forEach(col => addColField(col));
    document.getElementById('btn-save-category').textContent = 'Update Category';
    MODAL.open('cat-modal');
  }

  // ── Add column field ───────────────────────────────────────────────────────
  function addColField(value = '') {
    const container = document.getElementById('col-fields');
    const row = document.createElement('div');
    row.className = 'col-row';
    row.innerHTML = `<input type="text" placeholder="Column naam" value="${escHtml(value)}">
      <button type="button">✕</button>`;
    row.querySelector('button').addEventListener('click', () => row.remove());
    container.appendChild(row);
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function save() {
    const name = document.getElementById('cat-name-input').value.trim();
    if (!name) { showToast('Category naam zaruri hai!', 'red'); return; }

    const cols = Array.from(
      document.querySelectorAll('#col-fields .col-row input')
    ).map(i => i.value.trim()).filter(Boolean);

    if (cols.length === 0) {
      showToast('Kam se kam ek column hona chahiye!', 'red'); return;
    }

    const data = APP.getData();

    if (editingMode) {
      const cat = data.categories.find(c => c.id === APP.currentCategory);
      cat.name    = name;
      cat.columns = cols;
      cat.entries = cat.entries.map(e => cols.map((_, i) => e[i] || ''));
    } else {
      const id = 'cat_' + Date.now();
      data.categories.push({ id, name, columns: cols, entries: [] });
      APP.currentCategory = id;
    }

    await APP.persistData(data);
    MODAL.close('cat-modal');
    renderTabs();
    ENTRIES.renderTable();
    showToast(editingMode ? 'Category update ho gayi!' : 'Naya category ban gaya!');
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function remove() {
    const data = APP.getData();
    if (data.categories.length <= 1) {
      showToast('Kam se kam ek category rakhna zaruri hai!', 'red'); return;
    }
    const cat = data.categories.find(c => c.id === APP.currentCategory);
    if (!confirm(`"${cat.name}" category aur uski saari entries delete ho jaengi. Confirm?`)) return;

    data.categories = data.categories.filter(c => c.id !== APP.currentCategory);
    APP.currentCategory = data.categories[0].id;
    await APP.persistData(data);
    renderTabs();
    ENTRIES.renderTable();
    showToast('Category delete ho gayi!');
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    document.getElementById('add-category-btn').addEventListener('click', openAdd);
    document.getElementById('btn-edit-cat').addEventListener('click', openEdit);
    document.getElementById('btn-del-cat').addEventListener('click', remove);
    document.getElementById('add-col-btn').addEventListener('click', () => addColField());
    document.getElementById('btn-save-category').addEventListener('click', save);
  }

  return { init, renderTabs };
})();
