/**
 * entries.js — Single entry CRUD + Bulk entry
 * Renders entries as cards with per-field copy buttons
 */

const ENTRIES = (() => {
  let editingIndex     = null;
  let activeModalCatId = null;
  let bulkColumns      = [];
  let bulkCatId        = null;

  // ── Copy icon SVG ─────────────────────────────────────────────────────────
  const COPY_ICON = `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const CHECK_ICON = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 20 4 14"/></svg>`;

  // ── Render compact grid table ─────────────────────────────────────────────
  function renderTable(searchQuery = '') {
    const data = APP.getData();
    const cat  = data.categories.find(c => c.id === APP.currentCategory);
    document.getElementById('current-cat-title').textContent = cat ? cat.name : '';

    // Preserve search box value when re-rendering without an explicit query
    const searchInput = document.getElementById('search-input');
    if (searchQuery === '' && searchInput && document.activeElement !== searchInput) {
      searchQuery = searchInput.value || '';
    }

    const area  = document.getElementById('table-area');
    const query = searchQuery.trim().toLowerCase();

    if (!cat || cat.entries.length === 0) {
      document.getElementById('entry-count').textContent = '0';
      area.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔑</div>
          <div class="empty-state-title">Koi entry nahi hai</div>
          <p>"+ Entry" button se pehli entry add karein.</p>
        </div>`;
      return;
    }

    // Filter
    const filtered = query
      ? cat.entries.filter(row => row.some(cell => cell.toLowerCase().includes(query)))
      : cat.entries;

    document.getElementById('entry-count').textContent = String(filtered.length);

    if (filtered.length === 0) {
      area.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-title">Koi result nahi mila</div>
          <p>"${escHtml(query)}" se koi match nahi hua.</p>
        </div>`;
      return;
    }

    // ── Build table ──────────────────────────────────────────────────────────

    // Header
    let html = `<div class="entries-table-wrap"><div class="entries-table-scroll"><table class="entries-table"><thead><tr>`;
    html += `<th class="col-sno">#</th>`;
    cat.columns.forEach(col => { html += `<th>${escHtml(col)}</th>`; });
    html += `<th class="col-actions">Actions</th></tr></thead><tbody>`;

    // Rows
    filtered.forEach((row, visIdx) => {
      const origIdx = cat.entries.indexOf(row);
      html += `<tr>`;
      html += `<td class="col-sno">${visIdx + 1}</td>`;
      cat.columns.forEach((col, j) => {
        const val    = row[j] || '';
        const isPass = isPasswordCol(col);
        html += `<td>
          <div class="cell-wrap${isPass ? ' cell-pass' : ''}" data-copy="${escAttr(val)}" title="Tap karke copy karein">
            <span class="cell-val${isPass ? ' pass-val' : ''}">${escHtml(val)}</span>
          </div>
        </td>`;
      });
      html += `<td class="col-actions">
        <button class="row-action-btn" data-edit="${origIdx}" title="Edit">✏️</button>
        <button class="row-action-btn del" data-del="${origIdx}" title="Delete">🗑</button>
      </td>`;
      html += `</tr>`;
    });

    html += `</tbody></table></div></div>`;
    area.innerHTML = html;

    // ── Event listeners ──────────────────────────────────────────────────────

    // Tap cell to copy
    area.querySelectorAll('.cell-wrap[data-copy]').forEach(wrap => {
      wrap.addEventListener('click', e => {
        e.stopPropagation();
        copyToClipboard(wrap.dataset.copy, wrap);
      });
    });

    area.querySelectorAll('[data-edit]').forEach(btn =>
      btn.addEventListener('click', () => openEdit(Number(btn.dataset.edit)))
    );
    area.querySelectorAll('[data-del]').forEach(btn =>
      btn.addEventListener('click', () => remove(Number(btn.dataset.del)))
    );
  }

  // ── Copy to clipboard with visual feedback ────────────────────────────────
  function copyToClipboard(text, el) {
    // navigator.clipboard only works on HTTPS/localhost
    // Use execCommand fallback for HTTP (e.g. local network access)
    const doSuccess = () => {
      if (el) {
        el.classList.add('cell-copied');
        clearTimeout(el._tid);
        el._tid = setTimeout(() => el.classList.remove('cell-copied'), 900);
      }
      const banner = document.getElementById('copy-banner');
      const bannerVal = document.getElementById('copy-banner-value');
      if (banner && bannerVal) {
        bannerVal.textContent = text;
        banner.style.display = 'block';
        clearTimeout(banner._tid);
        // No auto-hide — stays until next copy
      }
      showToast('✓ Copied!');
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(doSuccess).catch(() => _fallbackCopy(text, doSuccess));
    } else {
      _fallbackCopy(text, doSuccess);
    }
  }

  function _fallbackCopy(text, onSuccess) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      // For iOS
      ta.setSelectionRange(0, 99999);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) onSuccess();
      else showToast('Copy nahi ho paya!', 'red');
    } catch (e) {
      showToast('Copy nahi ho paya!', 'red');
    }
  }

  // ── Open Add ──────────────────────────────────────────────────────────────
  function openAdd() {
    editingIndex = null;
    const cat = APP.getData().categories.find(c => c.id === APP.currentCategory);
    if (!cat) { showToast('Pehle ek category banayein!', 'red'); return; }
    activeModalCatId = cat.id;
    document.getElementById('entry-modal-title').textContent = 'Entry Add — ' + cat.name;
    buildFormFields(cat.columns);
    MODAL.open('entry-modal');
  }

  // ── Open Edit ─────────────────────────────────────────────────────────────
  function openEdit(idx) {
    editingIndex = idx;
    const cat = APP.getData().categories.find(c => c.id === APP.currentCategory);
    activeModalCatId = cat.id;
    document.getElementById('entry-modal-title').textContent = 'Entry Edit — ' + cat.name;
    buildFormFields(cat.columns, cat.entries[idx]);
    MODAL.open('entry-modal');
  }

  function buildFormFields(columns, values = []) {
    const container = document.getElementById('entry-form-fields');
    container.innerHTML = '';
    columns.forEach((col, i) => {
      const isPass = isPasswordCol(col);
      const div = document.createElement('div');
      div.className = 'form-group';
      div.innerHTML = `<label>${escHtml(col)}</label>
        <input type="text" id="ef_${i}"
               value="${escAttr(values[i] || '')}"
               placeholder="${escAttr(col)}"
               ${isPass ? 'style="font-family:Consolas,monospace;letter-spacing:.06em"' : ''}>`;
      container.appendChild(div);
    });
    const first = container.querySelector('input');
    if (first) setTimeout(() => first.focus(), 120);
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
    showToast(editingIndex === null ? '✓ Entry add ho gayi!' : '✓ Entry update ho gayi!');
  }

  // ── Delete Entry ──────────────────────────────────────────────────────────
  function remove(idx) {
    const data = APP.getData();
    const cat  = data.categories.find(c => c.id === APP.currentCategory);
    const label = cat.entries[idx][0] || 'entry';
    showConfirm({
      icon: '🗑️',
      title: 'Entry Delete Karein?',
      msg: `"${label}" ko permanently delete karna chahte hain? Ye action undo nahi hoga.`,
      okLabel: 'Delete',
      okClass: 'btn-danger',
      onOk: async () => {
        cat.entries.splice(idx, 1);
        await APP.persistData(data);
        renderTable();
        showToast('Entry delete ho gayi!');
      }
    });
  }

  // ── Bulk Add ──────────────────────────────────────────────────────────────
  function openBulkAdd() {
    const cat = APP.getData().categories.find(c => c.id === APP.currentCategory);
    if (!cat) { showToast('Pehle ek category banayein!', 'red'); return; }
    bulkCatId   = cat.id;
    bulkColumns = cat.columns;
    document.getElementById('bulk-modal-title').textContent = 'Bulk Entry — ' + cat.name;

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
        return `<td><input class="bulk-input" type="text" placeholder="${escAttr(col)}" data-col="${j}"
          style="${isPass ? 'font-family:Consolas,monospace' : ''}"></td>`;
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
    document.getElementById('bulk-count-info').textContent = `${count} row${count !== 1 ? 's' : ''}`;
  }

  async function saveBulkEntries() {
    const rows = document.querySelectorAll('#bulk-tbody tr');
    const newEntries = [];
    let skipped = 0;
    rows.forEach(tr => {
      const vals = Array.from(tr.querySelectorAll('.bulk-input')).map(inp => inp.value.trim());
      if (vals.every(v => v === '')) { skipped++; return; }
      newEntries.push(vals);
    });
    if (newEntries.length === 0) { showToast('Koi entry nahi bhari!', 'red'); return; }

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
      ? `✓ ${newEntries.length} entries save hui! (${skipped} empty rows skip ki)`
      : `✓ ${newEntries.length} entries save ho gayi!`;
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

    // Entry modal: Enter key saves
    document.getElementById('entry-modal').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && e.target.tagName === 'INPUT') saveEntry();
    });

    // Bulk: Tab on last cell adds row
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

  return { init, renderTable, openAdd };
})();
