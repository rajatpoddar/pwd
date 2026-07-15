/**
 * categories.js — Category CRUD & chip tab rendering
 */

const CATEGORIES = (() => {
  let editingMode = false;

  // ── Render Chips ──────────────────────────────────────────────────────────
  function renderTabs() {
    const data = APP.getData();
    const bar  = document.getElementById('tabs-bar');
    // Remove existing chips (keep the add button)
    bar.querySelectorAll('.cat-chip').forEach(t => t.remove());
    const addBtn = document.getElementById('add-category-btn');

    data.categories.forEach(cat => {
      const count = cat.entries ? cat.entries.length : 0;
      const t = document.createElement('button');
      t.className = 'cat-chip' + (cat.id === APP.currentCategory ? ' active' : '');
      t.innerHTML = `${escHtml(cat.name)}<span class="cat-chip-count">${count}</span>`;
      t.addEventListener('click', () => {
        APP.currentCategory = cat.id;
        // Clear search on category switch
        const si = document.getElementById('search-input');
        if (si) si.value = '';
        renderTabs();
        ENTRIES.renderTable();
      });
      bar.insertBefore(t, addBtn);
    });
  }

  // ── Open Add ──────────────────────────────────────────────────────────────
  function openAdd() {
    editingMode = false;
    document.getElementById('cat-modal-title').textContent = 'Create New Category';
    document.getElementById('cat-name-input').value = '';
    document.getElementById('col-fields').innerHTML = '';
    addColField('P.Code');
    addColField('Name');
    addColField('Username');
    addColField('Password', true);
    document.getElementById('btn-save-category').textContent = 'Create Category';
    MODAL.open('cat-modal');
  }

  // ── Open Edit ─────────────────────────────────────────────────────────────
  function openEdit() {
    const cat = APP.getData().categories.find(c => c.id === APP.currentCategory);
    if (!cat) return;
    editingMode = true;
    document.getElementById('cat-modal-title').textContent = 'Edit Category';
    document.getElementById('cat-name-input').value = cat.name;
    document.getElementById('col-fields').innerHTML = '';
    cat.columns.forEach((col, i) => {
      const isPass = cat.passwordCols ? cat.passwordCols[i] : false;
      addColField(col, isPass);
    });
    document.getElementById('btn-save-category').textContent = 'Update Category';
    MODAL.open('cat-modal');
  }

  // ── Add column field ──────────────────────────────────────────────────────
  function addColField(value = '', isPass = false) {
    const container = document.getElementById('col-fields');
    const row = document.createElement('div');
    row.className = 'col-row';
    row.draggable = true;
    const lockIcon = isPass
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    row.innerHTML = `<span class="col-drag-handle" title="Drag to reorder">⠿</span>
      <input type="text" placeholder="Column naam" value="${escHtml(value)}">
      <button type="button" class="col-pass-toggle" title="Toggle password column">${lockIcon}</button>
      <button type="button" class="col-del-btn" aria-label="Remove column">✕</button>`;
    row.querySelector('.col-del-btn').addEventListener('click', () => row.remove());
    row.querySelector('.col-pass-toggle').addEventListener('click', function() {
      const newIsPass = !this.classList.contains('active');
      this.classList.toggle('active', newIsPass);
      this.innerHTML = newIsPass
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    });
    if (isPass) row.querySelector('.col-pass-toggle').classList.add('active');
    _attachDragEvents(row);
    container.appendChild(row);
    row.querySelector('input').focus();
  }

  // ── Drag-to-reorder helpers ───────────────────────────────────────────────
  let _dragSrc = null;

  function _attachDragEvents(row) {
    row.addEventListener('dragstart', e => {
      _dragSrc = row;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      document.querySelectorAll('#col-fields .col-row').forEach(r => r.classList.remove('drag-over'));
      _dragSrc = null;
    });
    row.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (_dragSrc && _dragSrc !== row) {
        document.querySelectorAll('#col-fields .col-row').forEach(r => r.classList.remove('drag-over'));
        row.classList.add('drag-over');
      }
    });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', e => {
      e.preventDefault();
      if (_dragSrc && _dragSrc !== row) {
        const container = document.getElementById('col-fields');
        const rows = Array.from(container.querySelectorAll('.col-row'));
        const srcIdx = rows.indexOf(_dragSrc);
        const tgtIdx = rows.indexOf(row);
        if (srcIdx < tgtIdx) {
          container.insertBefore(_dragSrc, row.nextSibling);
        } else {
          container.insertBefore(_dragSrc, row);
        }
      }
      row.classList.remove('drag-over');
    });
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function save() {
    const name = document.getElementById('cat-name-input').value.trim();
    if (!name) { showToast('Category name is required!', 'red'); return; }
    const rows = document.querySelectorAll('#col-fields .col-row');
    const cols = [];
    const passwordCols = [];
    rows.forEach(row => {
      const input  = row.querySelector('input[type="text"]');
      const toggle = row.querySelector('.col-pass-toggle');
      const val    = input.value.trim();
      if (val) {
        cols.push(val);
        passwordCols.push(toggle ? toggle.classList.contains('active') : false);
      }
    });
    if (cols.length === 0) { showToast('At least one column is required!', 'red'); return; }

    const data = APP.getData();
    if (editingMode) {
      const cat = data.categories.find(c => c.id === APP.currentCategory);
      cat.name    = name;
      cat.columns = cols;
      cat.passwordCols = passwordCols;
      cat.entries = cat.entries.map(e => cols.map((_, i) => e[i] || ''));
    } else {
      const id = 'cat_' + Date.now();
      data.categories.push({ id, name, columns: cols, passwordCols, entries: [] });
      APP.currentCategory = id;
    }
    await APP.persistData(data);
    MODAL.close('cat-modal');
    renderTabs();
    ENTRIES.renderTable();
    showToast(editingMode ? '✓ Category updated!' : '✓ New category created!');
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  function remove() {
    const data = APP.getData();
    if (data.categories.length <= 1) {
      showToast('At least one category must remain!', 'red'); return;
    }
    const cat = data.categories.find(c => c.id === APP.currentCategory);
    showConfirm({
      icon: '🗂️',
      title: 'Delete Category?',
      msg: `"${cat.name}" and all its ${cat.entries.length} entries will be permanently deleted.`,
      okLabel: 'Delete',
      okClass: 'btn-danger',
      onOk: async () => {
        data.categories = data.categories.filter(c => c.id !== APP.currentCategory);
        APP.currentCategory = data.categories[0].id;
        await APP.persistData(data);
        renderTabs();
        ENTRIES.renderTable();
        showToast('Category deleted!');
      }
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    document.getElementById('add-category-btn').addEventListener('click', openAdd);
    document.getElementById('btn-edit-cat').addEventListener('click', openEdit);
    document.getElementById('btn-del-cat').addEventListener('click', remove);
    document.getElementById('add-col-btn').addEventListener('click', () => addColField());
    document.getElementById('btn-save-category').addEventListener('click', save);
    // Enter key in cat name saves
    document.getElementById('cat-name-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') save();
    });
  }

  return { init, renderTabs };
})();
