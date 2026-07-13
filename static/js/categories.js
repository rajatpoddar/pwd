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

  // ── Add column field ──────────────────────────────────────────────────────
  function addColField(value = '') {
    const container = document.getElementById('col-fields');
    const row = document.createElement('div');
    row.className = 'col-row';
    row.draggable = true;
    row.innerHTML = `<span class="col-drag-handle" title="Drag karke reorder karein">⠿</span>
      <input type="text" placeholder="Column naam" value="${escHtml(value)}">
      <button type="button" class="col-del-btn" aria-label="Remove column">✕</button>`;
    row.querySelector('.col-del-btn').addEventListener('click', () => row.remove());
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
    if (!name) { showToast('Category naam zaruri hai!', 'red'); return; }
    const cols = Array.from(
      document.querySelectorAll('#col-fields .col-row input')
    ).map(i => i.value.trim()).filter(Boolean);
    if (cols.length === 0) { showToast('Kam se kam ek column hona chahiye!', 'red'); return; }

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
    showToast(editingMode ? '✓ Category update ho gayi!' : '✓ Naya category ban gaya!');
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  function remove() {
    const data = APP.getData();
    if (data.categories.length <= 1) {
      showToast('Kam se kam ek category rakhna zaruri hai!', 'red'); return;
    }
    const cat = data.categories.find(c => c.id === APP.currentCategory);
    showConfirm({
      icon: '🗂️',
      title: 'Category Delete Karein?',
      msg: `"${cat.name}" category aur uski saari ${cat.entries.length} entries permanently delete ho jaengi.`,
      okLabel: 'Delete',
      okClass: 'btn-danger',
      onOk: async () => {
        data.categories = data.categories.filter(c => c.id !== APP.currentCategory);
        APP.currentCategory = data.categories[0].id;
        await APP.persistData(data);
        renderTabs();
        ENTRIES.renderTable();
        showToast('Category delete ho gayi!');
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
