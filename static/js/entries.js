/**
 * entries.js — Single entry CRUD + Bulk entry
 */

const ENTRIES = (() => {
  let editingIndex     = null;
  let activeModalCatId = null;
  let bulkColumns      = [];
  let bulkCatId        = null;

  // ── Render Table ──────────────────────────────────────────────────────────
  function renderTable() {
    const data = APP.getData();
    const cat  = data.categories.find(c => c.id === APP.currentCategory);
    document.getElementById('current-cat-title').textContent = cat ? cat.name : '';
    const area = document.getElementById('table-area');

    if (!cat || cat.entries.length === 0) {
      area.innerHTML =
        '<div class="empty-state">Koi entry nahi hai. "Entry Add Karein" button se add karein.</div>';
      return;
    }

    let html = '<div class="table-scroll"><table><thead><tr>';
    cat.columns.forEach(col => { html += `<th>${escHtml(col)}</th>`; });
    html += '<th>Actions</th></tr></thead><tbody>';

    cat.entries.forEach((row, i) => {
      html += '<tr>';
      row.forEach((cell, j) => {
        const isPass = isPasswordCol(cat.columns[j]);
        const cls    = 'clickable-cell' + (isPass ? ' pass-cell' : '');
        html += `<td class="${cls}" data-copy="${escAttr(cell)}">${escHtml(cell)}</td>`;
      });
      html += `<td><div class="action-btns">
        <button class="btn btn-ghost btn-sm" data-edit="${i}">✏️</button>
        <button class="btn btn-danger btn-sm" data-del="${i}">🗑</button>
      </div></td></tr>`;
    });
    html += '</tbody></table></div>';
    area.innerHTML = html;

    // copy on cell click
    area.querySelectorAll('[data-copy]').forEach(td => {
      td.addEventListener('click', () => {
        navigator.clipboard.writeText(td.dataset.copy)
          .then(() => showToast('✓ Copied!'));
      });
    });
    // edit / delete buttons
    area.querySelectorAll('[data-edit]').forEach(btn =>
      btn.addEventListener('click', () => openEdit(Number(btn.dataset.edit)))
    );
    area.querySelectorAll('[data-del]').forEach(btn =>
      btn.addEventListener('click', () => remove(Number(btn.dataset.del)))
    );
  }

  // ── Open Add ──────────────────────────────────────────────────────────────
  function openAdd() {
    editingIndex = null;
    const cat = APP.getData().categories.find(c => c.id === APP.currentCategory);
    if (!cat) { showToast('Pehle ek category banayein!', 'red'); return; }
    activeModalCatId = cat.id;
    document.getElementById('entry-modal-title').textContent =
      'Entry Add Karein — ' + cat.name;
    buildFormFields(cat.columns);
    MODAL.open('entry-modal');
  }

  // ── Open Edit ─────────────────────────────────────────────────────────────
  function openEdit(idx) {
    editingIndex = idx;
    const cat = APP.getData().categories.find(c => c.id === APP.currentCategory);
    activeModalCatId = cat.id;
    document.getElementById('entry-modal-title').textContent =
      'Entry Edit Karein — ' + cat.name;
    buildFormFields(cat.columns, cat.entries[idx]);
    MODAL.open('entry-modal');
  }

  function buildFormFields(columns, values = []) {
    const container = document.getElementById('entry-form-fields');
    container.innerHTML = '';
    columns.forEach((col, i) => {
      const div = document.createElement('div');
      div.className = 'form-group';
      const isPass = isPasswordCol(col);
      div.innerHTML = `<label>${escHtml(col)}</label>
        <input type="${isPass ? 'text' : 'text'}" id="ef_${i}"
               value="${escAttr(values[i] || '')}"
               placeholder="${escAttr(col)}"
               ${isPass ? 'style="font-family:Courier New,monospace;letter-spacing:.08em"' : ''}>`;
      container.appendChild(div);
    });
    // focus first
    const first = container.querySelector('input');
    if (first) setTimeout(() => first.focus(), 100);
  }

  // ── Save Entry ────────────────────────────────────────────────────────────
  async function saveEntry() {
    const data = APP.getData();
    const cat  = data.categories.find(c => c.id === activeModalCatId);
    if (!cat) { showToast('Category nahi mili!', 'red'); return; }

    const row = cat.columns.map((_, i) => {
      const el = document.getElementById('ef_' + i);
      return el ? el.value.trim() : '';
    });

    if (editingIndex === null) {
      cat.entries.push(row);
    } else {
      cat.entries[editingIndex] = row;
    }

    await APP.persistData(data);
    MODAL.close('entry-modal');
    APP.currentCategory = activeModalCatId;
    CATEGORIES.renderTabs();
    renderTable();
    showToast(editingIndex === null ? 'Entry add ho gayi!' : 'Entry update ho gayi!');
  }

  // ── Delete Entry ──────────────────────────────────────────────────────────
  async function remove(idx) {
    if (!confirm('Kya aap is entry ko delete karna chahte hain?')) return;
    const data = APP.getData();
    const cat  = data.categories.find(c => c.id === APP.currentCategory);
    cat.entries.splice(idx, 1);
    await APP.persistData(data);
    renderTable();
    showToast('Entry delete ho gayi!');
  }

  // ── Bulk Add ──────────────────────────────────────────────────────────────
  function openBulkAdd() {
    const cat = APP.getData().categories.find(c => c.id === APP.currentCategory);
    if (!cat) { showToast('Pehle ek category banayein!', 'red'); return; }
    bulkCatId  = cat.id;
    bulkColumns = cat.columns;
    document.getElementById('bulk-modal-title').textContent =
      '📋 Bulk Entry Add — ' + cat.name;

    // Header
    const thead = document.getElementById('bulk-thead');
    thead.innerHTML = '<tr><th class="row-num-col">#</th>' +
      bulkColumns.map(c => `<th>${escHtml(c)}</th>`).join('') +
      '<th class="del-col"></th></tr>';

    const tbody = document.getElementById('bulk-tbody');
    tbody.innerHTML = '';
    for (let i = 0; i < 5; i++) addBulkRow();
    updateBulkCount();
    MODAL.open('bulk-entry-modal');
  }

  function addBulkRow() {
    const tbody  = document.getElementById('bulk-tbody');
    const rowNum = tbody.querySelectorAll('tr').length + 1;
    const tr     = document.createElement('tr');
    tr.innerHTML = `<td class="row-num">${rowNum}</td>` +
      bulkColumns.map((col, j) => {
        const isPass = isPasswordCol(col);
        return `<td><input class="bulk-input"
          type="text" placeholder="${escAttr(col)}" data-col="${j}"
          style="${isPass ? 'font-family:Courier New,monospace;color:#a78bfa' : ''}"></td>`;
      }).join('') +
      `<td><button class="bulk-del-btn" title="Row hatao">✕</button></td>`;
    tbody.appendChild(tr);

    tr.querySelector('.bulk-del-btn').addEventListener('click', () => {
      if (tbody.querySelectorAll('tr').length <= 1) {
        showToast('Kam se kam ek row honi chahiye!', 'red'); return;
      }
      tr.remove();
      renumberBulkRows();
      updateBulkCount();
    });

    updateBulkCount();
    tr.querySelector('.bulk-input').focus();
    return tr;
  }

  function renumberBulkRows() {
    document.querySelectorAll('#bulk-tbody tr').forEach((tr, i) => {
      tr.querySelector('.row-num').textContent = i + 1;
    });
  }

  function updateBulkCount() {
    const count = document.getElementById('bulk-tbody').querySelectorAll('tr').length;
    document.getElementById('bulk-count-info').textContent =
      `${count} row${count !== 1 ? 's' : ''}`;
  }

  async function saveBulkEntries() {
    const rows    = document.querySelectorAll('#bulk-tbody tr');
    const newEntries = [];
    let skipped = 0;

    rows.forEach(tr => {
      const vals = Array.from(tr.querySelectorAll('.bulk-input'))
        .map(inp => inp.value.trim());
      if (vals.every(v => v === '')) { skipped++; return; }
      newEntries.push(vals);
    });

    if (newEntries.length === 0) {
      showToast('Koi entry nahi bhari!', 'red'); return;
    }

    const data = APP.getData();
    const cat  = data.categories.find(c => c.id === bulkCatId);
    if (!cat) { showToast('Category nahi mili!', 'red'); return; }

    cat.entries.push(...newEntries);
    await APP.persistData(data);
    MODAL.close('bulk-entry-modal');
    APP.currentCategory = bulkCatId;
    CATEGORIES.renderTabs();
    renderTable();
    const msg = skipped > 0
      ? `${newEntries.length} entries save hui! (${skipped} empty rows skip ki)`
      : `${newEntries.length} entries save ho gayi!`;
    showToast(msg);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function isPasswordCol(colName) {
    const l = (colName || '').toLowerCase();
    return l.includes('pass') || l.includes('pwd') || l.includes('secret');
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    document.getElementById('btn-single-add').addEventListener('click', openAdd);
    document.getElementById('btn-bulk-add').addEventListener('click', openBulkAdd);
    document.getElementById('btn-save-entry').addEventListener('click', saveEntry);
    document.getElementById('btn-save-bulk').addEventListener('click', saveBulkEntries);
    document.getElementById('add-bulk-row-btn').addEventListener('click', addBulkRow);

    // Tab → next cell, Enter on last → new row
    document.getElementById('bulk-entry-modal').addEventListener('keydown', e => {
      if (!e.target.classList.contains('bulk-input')) return;
      const all = Array.from(document.querySelectorAll('#bulk-tbody .bulk-input'));
      const idx = all.indexOf(e.target);
      if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey && idx === all.length - 1)) {
        e.preventDefault();
        const newRow = addBulkRow();
        newRow.querySelector('.bulk-input').focus();
      }
    });
  }

  return { init, renderTable };
})();
