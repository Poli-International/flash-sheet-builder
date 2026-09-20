/**
 * Poli International - Tattoo Flash Sheet Builder V2
 * Pure client-side application. No remote servers or tracking.
 */
'use strict';

(function() {
  const STORAGE_KEY = 'poli_flash_sheets_v2';
  const LEGACY_STORAGE_KEY = 'poli-flash-builder';

  // State
  let state = {
    activeSheetId: '',
    sheets: []
  };

  let editingDesignId = null;
  let currentUploadedImageData = null;
  let currentView = 'table'; // 'table' | 'arrange'
  let currentTableSort = 'manual'; // 'manual' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc'
  let printMode = 'sheet'; // 'sheet' | 'priceList'
  let draggedCardId = null;

  // Helpers
  function uid() {
    return 'sheet_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function todayLocal() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getActiveSheet() {
    return state.sheets.find(s => s.id === state.activeSheetId) || state.sheets[0];
  }

  function fmtPrice(val, curr) {
    if (val === null || val === undefined || val === '') return window.i18n.t('print.poa');
    const num = Number(val);
    if (isNaN(num)) return esc(val);
    return `${curr || '£'}${num % 1 === 0 ? num.toFixed(0) : num.toFixed(2)}`;
  }

  // --- Storage & Budget ---
  function calculateStorageUsage() {
    let totalBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        const v = localStorage.getItem(k);
        totalBytes += (k.length + (v ? v.length : 0)) * 2;
      }
    } catch (e) {
      // quota or security error
    }
    return totalBytes;
  }

  function updateStorageMeter() {
    const bytes = calculateStorageUsage();
    const kb = Math.round(bytes / 1024);
    const maxKb = 5000;
    const pct = Math.min(100, Math.round((kb / maxKb) * 100));

    const fillEl = document.getElementById('storageBarFill');
    const textEl = document.getElementById('storageBarText');
    const alertEl = document.getElementById('storageAlert');

    if (fillEl) {
      fillEl.style.width = pct + '%';
      fillEl.className = 'storage-bar-fill' + (pct > 90 ? ' danger' : pct > 75 ? ' warn' : '');
    }

    if (textEl) {
      textEl.textContent = window.i18n.t('storage.used', { used: kb, pct });
    }

    if (alertEl) {
      if (pct > 75) {
        alertEl.classList.add('visible');
        alertEl.textContent = window.i18n.t('storage.warning');
      } else {
        alertEl.classList.remove('visible');
      }
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      updateStorageMeter();
    } catch (e) {
      alert(window.i18n.t('storage.quotaExceeded'));
    }
  }

  function loadState() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {}

    if (raw) {
      try {
        state = JSON.parse(raw);
      } catch (e) {
        state = null;
      }
    }

    // Migrate from legacy V1 if needed
    if (!state || !state.sheets || !state.sheets.length) {
      let legacyData = null;
      try {
        const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyRaw) legacyData = JSON.parse(legacyRaw);
      } catch (e) {}

      const defaultSheetId = uid();
      const initialSheet = {
        id: defaultSheetId,
        name: window.i18n.t('sheet.defaultName'),
        artist: legacyData && legacyData.artist ? legacyData.artist : '',
        contact: legacyData && legacyData.contact ? legacyData.contact : '',
        date: legacyData && legacyData.date ? legacyData.date : todayLocal(),
        currency: '£',
        paperSize: 'a4',
        gridCols: 3,
        designs: []
      };

      if (legacyData && Array.isArray(legacyData.pieces)) {
        initialSheet.designs = legacyData.pieces.map((p, idx) => ({
          id: 'p_' + idx + '_' + Date.now().toString(36),
          name: p.name || '',
          style: p.style || '',
          size: p.size || '',
          price: p.price || '',
          deposit: '',
          sittingTime: '',
          status: p.sold ? 'claimed' : 'available',
          span: 1,
          notes: p.notes || '',
          image: null
        }));
      }

      state = {
        activeSheetId: defaultSheetId,
        sheets: [initialSheet]
      };
      saveState();
    }

    if (!state.activeSheetId && state.sheets.length) {
      state.activeSheetId = state.sheets[0].id;
    }
  }

  // --- Image Handling (Auto-orient, EXIF-strip, Downscale) ---
  function processUploadedImage(file, callback) {
    if (!file || !file.type.startsWith('image/')) {
      alert(window.i18n.t('val.imageReadError'));
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const MAX_EDGE = 700;
        let w = img.width;
        let h = img.height;

        if (w > MAX_EDGE || h > MAX_EDGE) {
          if (w > h) {
            h = Math.round((h * MAX_EDGE) / w);
            w = MAX_EDGE;
          } else {
            w = Math.round((w * MAX_EDGE) / h);
            h = MAX_EDGE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        // White background for transparent PNG scans
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        // Strips EXIF/GPS and compresses safely
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        callback(dataUrl);
      };

      img.onerror = function() {
        alert(window.i18n.t('val.imageReadError'));
      };

      img.src = e.target.result;
    };

    reader.onerror = function() {
      alert(window.i18n.t('val.imageReadError'));
    };

    reader.readAsDataURL(file);
  }

  // --- UI Renderers ---
  function renderSheetSelector() {
    const select = document.getElementById('sheetSelect');
    if (!select) return;
    select.innerHTML = '';

    state.sheets.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.designs.length})`;
      if (s.id === state.activeSheetId) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function renderSheetSettings() {
    const sheet = getActiveSheet();
    if (!sheet) return;

    document.getElementById('sheetTitle').value = sheet.name || '';
    document.getElementById('artistName').value = sheet.artist || '';
    document.getElementById('artistContact').value = sheet.contact || '';
    document.getElementById('sheetDate').value = sheet.date || todayLocal();
    document.getElementById('currencySelect').value = sheet.currency || '£';
    document.getElementById('paperSizeSelect').value = sheet.paperSize || 'a4';
    document.getElementById('gridColumnsSelect').value = String(sheet.gridCols || 3);

    // Update currency badges in form labels
    const curr = sheet.currency || '£';
    const priceLabel = document.getElementById('priceLabel');
    if (priceLabel) priceLabel.textContent = window.i18n.t('form.priceLabel', { curr });
    const depositLabel = document.getElementById('depositLabel');
    if (depositLabel) depositLabel.textContent = window.i18n.t('form.depositLabel', { curr });
  }

  function renderSummary() {
    const sheet = getActiveSheet();
    if (!sheet) return;

    const total = sheet.designs.length;
    let availableCount = 0;
    let claimedCount = 0;
    let repeatableCount = 0;
    let totalVal = 0;

    sheet.designs.forEach(d => {
      if (d.status === 'claimed') {
        claimedCount++;
      } else if (d.status === 'repeatable') {
        repeatableCount++;
        const p = parseFloat(d.price);
        if (!isNaN(p) && p > 0) totalVal += p;
      } else {
        availableCount++;
        const p = parseFloat(d.price);
        if (!isNaN(p) && p > 0) totalVal += p;
      }
    });

    const curr = sheet.currency || '£';
    const summaryStrip = document.getElementById('summaryStrip');
    if (summaryStrip) {
      summaryStrip.innerHTML = `
        <span>${window.i18n.t('summary.total', { count: `<strong>${total}</strong>` })}</span>
        <span>${window.i18n.t('summary.available', { count: `<strong>${availableCount}</strong>` })}</span>
        <span>${window.i18n.t('summary.claimed', { count: `<strong>${claimedCount}</strong>` })}</span>
        <span>${window.i18n.t('summary.repeatable', { count: `<strong>${repeatableCount}</strong>` })}</span>
        <span>${window.i18n.t('summary.availableValue', { val: `<strong>${fmtPrice(totalVal, curr)}</strong>` })}</span>
      `;
    }

    const countBadge = document.getElementById('listCountBadge');
    if (countBadge) {
      countBadge.textContent = window.i18n.t('list.countBadge', { count: total });
    }
  }

  function renderTableView() {
    const sheet = getActiveSheet();
    const tbody = document.getElementById('designsTableBody');
    const tableWrap = document.getElementById('tableWrap');
    const tableHeaderBar = document.getElementById('tableHeaderBar');
    const emptyState = document.getElementById('emptyState');
    if (!tbody || !sheet) return;

    if (sheet.designs.length === 0) {
      tableWrap.hidden = true;
      if (tableHeaderBar) tableHeaderBar.hidden = true;
      emptyState.hidden = false;
      tbody.innerHTML = '';
      return;
    }

    tableWrap.hidden = false;
    if (tableHeaderBar) tableHeaderBar.hidden = false;
    emptyState.hidden = true;
    tbody.innerHTML = '';

    const sortSelect = document.getElementById('tableSortSelect');
    if (sortSelect && sortSelect.value !== currentTableSort) {
      sortSelect.value = currentTableSort;
    }

    const curr = sheet.currency || '£';

    let displayDesigns = sheet.designs.map((d, index) => ({ d, originalIndex: index }));

    if (currentTableSort === 'price-asc') {
      displayDesigns.sort((a, b) => {
        const hasPriceA = a.d.price !== undefined && a.d.price !== null && String(a.d.price).trim() !== '' && !isNaN(Number(a.d.price));
        const hasPriceB = b.d.price !== undefined && b.d.price !== null && String(b.d.price).trim() !== '' && !isNaN(Number(b.d.price));
        if (hasPriceA && hasPriceB) {
          const diff = Number(a.d.price) - Number(b.d.price);
          if (diff !== 0) return diff;
        } else if (hasPriceA && !hasPriceB) {
          return -1;
        } else if (!hasPriceA && hasPriceB) {
          return 1;
        }
        return a.originalIndex - b.originalIndex;
      });
    } else if (currentTableSort === 'price-desc') {
      displayDesigns.sort((a, b) => {
        const hasPriceA = a.d.price !== undefined && a.d.price !== null && String(a.d.price).trim() !== '' && !isNaN(Number(a.d.price));
        const hasPriceB = b.d.price !== undefined && b.d.price !== null && String(b.d.price).trim() !== '' && !isNaN(Number(b.d.price));
        if (hasPriceA && hasPriceB) {
          const diff = Number(b.d.price) - Number(a.d.price);
          if (diff !== 0) return diff;
        } else if (hasPriceA && !hasPriceB) {
          return -1;
        } else if (!hasPriceA && hasPriceB) {
          return 1;
        }
        return a.originalIndex - b.originalIndex;
      });
    } else if (currentTableSort === 'name-asc') {
      displayDesigns.sort((a, b) => {
        const nameA = a.d.name || '';
        const nameB = b.d.name || '';
        const comp = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
        if (comp !== 0) return comp;
        return a.originalIndex - b.originalIndex;
      });
    } else if (currentTableSort === 'name-desc') {
      displayDesigns.sort((a, b) => {
        const nameA = a.d.name || '';
        const nameB = b.d.name || '';
        const comp = nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
        if (comp !== 0) return comp;
        return a.originalIndex - b.originalIndex;
      });
    }

    displayDesigns.forEach((item, i) => {
      const d = item.d;
      const tr = document.createElement('tr');
      if (d.status === 'claimed') tr.className = 'claimed-row';

      const thumbHtml = d.image
        ? `<img src="${d.image}" class="table-thumb" alt="${esc(d.name)}">`
        : `<div class="no-thumb-cell">${window.i18n.t('table.noImage')}</div>`;

      let statusBadge = '';
      if (d.status === 'claimed') {
        statusBadge = `<span class="badge badge-claimed">${window.i18n.t('print.statusClaimedBadge')}</span>`;
      } else if (d.status === 'repeatable') {
        statusBadge = `<span class="badge badge-repeatable">${window.i18n.t('print.statusRepeatableBadge')}</span>`;
      } else {
        statusBadge = `<span class="badge badge-available">${window.i18n.t('status.available')}</span>`;
      }

      tr.innerHTML = `
        <td data-label="#">${i + 1}</td>
        <td data-label="${window.i18n.t('table.colArtwork')}">${thumbHtml}</td>
        <td data-label="${window.i18n.t('table.colName')}" class="design-title-cell"><strong>${esc(d.name)}</strong></td>
        <td data-label="${window.i18n.t('table.colStyle')}">${esc(d.style ? window.i18n.t('style.' + d.style) : '—')}</td>
        <td data-label="${window.i18n.t('table.colSize')}">${esc(d.size ? window.i18n.t('size.' + d.size) : '—')}</td>
        <td data-label="${window.i18n.t('table.colPrice')}"><strong>${d.price ? fmtPrice(d.price, curr) : '—'}</strong></td>
        <td data-label="${window.i18n.t('table.colDeposit')}">${d.deposit ? fmtPrice(d.deposit, curr) : '—'}</td>
        <td data-label="${window.i18n.t('table.colTime')}">${esc(d.sittingTime || '—')}</td>
        <td data-label="${window.i18n.t('table.colStatus')}">${statusBadge}</td>
        <td data-label="${window.i18n.t('table.colSpan')}">${d.span === 2 ? window.i18n.t('table.span2') : window.i18n.t('table.span1')}</td>
        <td data-label="${window.i18n.t('table.colNotes')}">${esc(d.notes || '—')}</td>
        <td data-label="${window.i18n.t('table.colActions')}" class="action-cell">
          <button class="small-btn edit-btn" data-id="${d.id}">${window.i18n.t('actions.edit')}</button>
          <button class="small-btn status-btn" data-id="${d.id}">${
            d.status === 'claimed'
              ? window.i18n.t('actions.markAvailable')
              : window.i18n.t('actions.markClaimed')
          }</button>
          <button class="small-btn del del-btn" data-id="${d.id}" title="${window.i18n.t('actions.delete')}" aria-label="${window.i18n.t('actions.delete')}">×</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderArrangeView() {
    const sheet = getActiveSheet();
    const container = document.getElementById('arrangeGrid');
    const arrangeHint = document.getElementById('arrangeHint');
    const emptyState = document.getElementById('emptyState');
    if (!container || !sheet) return;

    if (sheet.designs.length === 0) {
      container.hidden = true;
      arrangeHint.hidden = true;
      emptyState.hidden = false;
      container.innerHTML = '';
      return;
    }

    container.hidden = false;
    arrangeHint.hidden = false;
    emptyState.hidden = true;
    container.innerHTML = '';

    const curr = sheet.currency || '£';

    sheet.designs.forEach((d, i) => {
      const card = document.createElement('div');
      card.className = 'arrange-card' +
        (d.span === 2 ? ' span-2' : '') +
        (d.status === 'claimed' ? ' claimed' : '');
      card.draggable = true;
      card.dataset.id = d.id;
      card.dataset.index = String(i);

      const imgHtml = d.image
        ? `<img src="${d.image}" class="arrange-img" alt="${esc(d.name)}">`
        : `<div class="arrange-no-img">${window.i18n.t('table.noImage')}</div>`;

      let badgeHtml = '';
      if (d.status === 'claimed') {
        badgeHtml = `<span class="badge badge-claimed">${window.i18n.t('print.statusClaimedBadge')}</span>`;
      } else if (d.status === 'repeatable') {
        badgeHtml = `<span class="badge badge-repeatable">${window.i18n.t('print.statusRepeatableBadge')}</span>`;
      } else {
        badgeHtml = `<span class="badge badge-available">${window.i18n.t('status.available')}</span>`;
      }

      card.innerHTML = `
        <div class="arrange-img-wrap">
          ${imgHtml}
        </div>
        <div class="arrange-card-header">
          <div>
            <div class="arrange-card-title">#${i + 1} ${esc(d.name)}</div>
            <div class="arrange-card-meta">${esc(d.size ? window.i18n.t('size.' + d.size) : '')} · ${esc(d.style ? window.i18n.t('style.' + d.style) : '')}</div>
          </div>
          <div>${badgeHtml}</div>
        </div>
        <div class="arrange-card-price">${d.price ? fmtPrice(d.price, curr) : window.i18n.t('print.poa')}</div>
        <div class="arrange-card-actions">
          <div class="drag-handle">☰ ${window.i18n.t('list.dragHandle')}</div>
          <div class="card-action-btns">
            <button class="small-btn edit-btn" data-id="${d.id}">${window.i18n.t('actions.edit')}</button>
            <button class="small-btn status-btn" data-id="${d.id}">${
              d.status === 'claimed'
                ? window.i18n.t('actions.markAvailable')
                : window.i18n.t('actions.markClaimed')
            }</button>
          </div>
        </div>
      `;

      // Drag & drop handlers
      card.addEventListener('dragstart', handleCardDragStart);
      card.addEventListener('dragover', handleCardDragOver);
      card.addEventListener('dragleave', handleCardDragLeave);
      card.addEventListener('drop', handleCardDrop);
      card.addEventListener('dragend', handleCardDragEnd);

      container.appendChild(card);
    });
  }

  function handleCardDragStart(e) {
    draggedCardId = this.dataset.id;
    this.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.id);
  }

  function handleCardDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
  }

  function handleCardDragLeave() {
    this.classList.remove('drag-over');
  }

  function handleCardDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    const targetId = this.dataset.id;
    if (!draggedCardId || draggedCardId === targetId) return;

    const sheet = getActiveSheet();
    const fromIdx = sheet.designs.findIndex(d => d.id === draggedCardId);
    const toIdx = sheet.designs.findIndex(d => d.id === targetId);

    if (fromIdx !== -1 && toIdx !== -1) {
      const [moved] = sheet.designs.splice(fromIdx, 1);
      sheet.designs.splice(toIdx, 0, moved);
      saveState();
      renderActiveView();
    }
  }

  function handleCardDragEnd() {
    this.classList.remove('is-dragging');
    document.querySelectorAll('.arrange-card').forEach(c => c.classList.remove('drag-over'));
  }

  function renderActiveView() {
    renderSummary();
    if (currentView === 'table') {
      document.getElementById('tableSection').hidden = false;
      document.getElementById('arrangeSection').hidden = true;
      renderTableView();
    } else {
      document.getElementById('tableSection').hidden = true;
      document.getElementById('arrangeSection').hidden = false;
      renderArrangeView();
    }
  }

  // --- Print Preview Modal ---
  function updatePrintScopeOptions() {
    const scopeSelect = document.getElementById('printScopeSelect');
    const scopeWrap = document.getElementById('printScopeWrap');
    if (!scopeSelect) return;

    const currentVal = scopeSelect.value;
    const activeSheet = getActiveSheet();
    scopeSelect.innerHTML = '';

    const activeOpt = document.createElement('option');
    activeOpt.value = 'active';
    const activeIdx = Math.max(0, state.sheets.findIndex(s => s.id === activeSheet?.id));
    activeOpt.textContent = `${activeSheet?.name || window.i18n.t('sheet.defaultName')} (${window.i18n.t('print.sheetIndex', { current: activeIdx + 1, total: state.sheets.length })})`;
    scopeSelect.appendChild(activeOpt);

    if (state.sheets.length > 1) {
      if (scopeWrap) scopeWrap.hidden = false;
      const allOpt = document.createElement('option');
      allOpt.value = 'all';
      allOpt.textContent = window.i18n.t('print.scopeAll', { count: state.sheets.length });
      scopeSelect.appendChild(allOpt);

      state.sheets.forEach((s, idx) => {
        if (s.id !== activeSheet?.id) {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = `${s.name || window.i18n.t('sheet.defaultName')} (${window.i18n.t('print.sheetIndex', { current: idx + 1, total: state.sheets.length })})`;
          scopeSelect.appendChild(opt);
        }
      });
    } else {
      if (scopeWrap) scopeWrap.hidden = true;
    }

    if (currentVal && Array.from(scopeSelect.options).some(o => o.value === currentVal)) {
      scopeSelect.value = currentVal;
    } else {
      scopeSelect.value = 'active';
    }
  }

  function buildSheetLayoutHtml(sheet, sheetIndex, totalSheets, mode) {
    const curr = sheet.currency || '£';
    const colsClass = 'cols-' + (sheet.gridCols || 3);
    const currentIndex = sheetIndex + 1;
    const pageNumberText = window.i18n.t('print.sheetIndex', { current: currentIndex, total: totalSheets });

    // Header identity
    const headerHtml = `
      <div class="sheet-print-header">
        <div>
          <div class="sheet-print-title">${esc(sheet.name || window.i18n.t('sheet.defaultName'))}</div>
          <div class="sheet-print-artist">${esc(sheet.artist || '')}</div>
          <div class="sheet-print-contact">${esc(sheet.contact || '')}</div>
        </div>
        <div class="sheet-print-date">
          <div>${esc(sheet.date || todayLocal())}</div>
        </div>
      </div>
    `;

    // Footer identity with dynamic sheet index / page number
    const footerText = window.i18n.t('print.footerIdentity', {
      sheet: esc(sheet.name || window.i18n.t('sheet.defaultName')),
      artist: esc(sheet.artist || window.i18n.t('settings.defaultArtist')),
      contact: esc(sheet.contact || ''),
      date: esc(sheet.date || todayLocal())
    });
    const footerHtml = `
      <div class="sheet-print-footer">
        <span class="sheet-print-footer-info">${footerText}</span>
        <span class="sheet-print-page-num">${esc(pageNumberText)}</span>
      </div>
    `;

    if (mode === 'sheet') {
      // Flash Sheet Card Grid
      let cardsHtml = '';
      sheet.designs.forEach((d, i) => {
        const isClaimed = d.status === 'claimed';
        const isRepeatable = d.status === 'repeatable';
        const cardSpanClass = d.span === 2 ? ' span-2' : '';
        const cardClaimedClass = isClaimed ? ' claimed' : '';

        let badgeOverlay = '';
        if (isClaimed) {
          badgeOverlay = `<span class="print-card-badge claimed">${window.i18n.t('print.statusClaimedBadge')}</span>`;
        } else if (isRepeatable) {
          badgeOverlay = `<span class="print-card-badge repeatable">${window.i18n.t('print.statusRepeatableBadge')}</span>`;
        }

        const imgHtml = d.image
          ? `<img src="${d.image}" class="print-card-img" alt="${esc(d.name)}">`
          : `<div class="arrange-no-img">${window.i18n.t('table.noImage')}</div>`;

        let extraMeta = [];
        if (d.deposit) {
          extraMeta.push(window.i18n.t('print.depositTag', { val: fmtPrice(d.deposit, curr) }));
        }
        if (d.sittingTime) {
          extraMeta.push(window.i18n.t('print.timeTag', { val: esc(d.sittingTime) }));
        }

        cardsHtml += `
          <div class="print-card${cardSpanClass}${cardClaimedClass}">
            <div class="print-card-img-wrap">
              ${imgHtml}
              ${badgeOverlay}
            </div>
            <div class="print-card-num">#${i + 1}</div>
            <div class="print-card-name">${esc(d.name)}</div>
            <div class="print-card-meta">
              <span>${esc(d.size ? window.i18n.t('size.' + d.size) : '')}</span>
              <span>·</span>
              <span>${esc(d.style ? window.i18n.t('style.' + d.style) : '')}</span>
            </div>
            <div class="print-card-price-row">
              <div class="print-card-price">${d.price ? fmtPrice(d.price, curr) : window.i18n.t('print.poa')}</div>
              ${extraMeta.length ? `<div class="print-card-extra">${extraMeta.join(' · ')}</div>` : ''}
            </div>
            ${d.notes ? `<div class="print-card-notes">${esc(d.notes)}</div>` : ''}
          </div>
        `;
      });

      return `
        <div class="print-sheet-page">
          <div class="safe-margin-box">
            ${headerHtml}
            <div class="print-grid ${colsClass}">
              ${cardsHtml}
            </div>
            ${footerHtml}
          </div>
        </div>
      `;
    } else {
      // Counter Price List Layout (no artwork, text-only table)
      let rowsHtml = '';
      sheet.designs.forEach((d, i) => {
        let statusBadge = '';
        if (d.status === 'claimed') {
          statusBadge = `<span class="badge badge-claimed">${window.i18n.t('print.statusClaimedBadge')}</span>`;
        } else if (d.status === 'repeatable') {
          statusBadge = `<span class="badge badge-repeatable">${window.i18n.t('print.statusRepeatableBadge')}</span>`;
        } else {
          statusBadge = `<span class="badge badge-available">${window.i18n.t('status.available')}</span>`;
        }

        rowsHtml += `
          <tr class="${d.status === 'claimed' ? 'claimed' : ''}">
            <td>${i + 1}</td>
            <td><strong>${esc(d.name)}</strong></td>
            <td>${esc(d.style ? window.i18n.t('style.' + d.style) : '—')}</td>
            <td>${esc(d.size ? window.i18n.t('size.' + d.size) : '—')}</td>
            <td><strong>${d.price ? fmtPrice(d.price, curr) : window.i18n.t('print.poa')}</strong></td>
            <td>${d.deposit ? fmtPrice(d.deposit, curr) : '—'}</td>
            <td>${esc(d.sittingTime || '—')}</td>
            <td>${statusBadge}</td>
            <td>${esc(d.notes || '—')}</td>
          </tr>
        `;
      });

      return `
        <div class="print-sheet-page">
          <div class="safe-margin-box">
            ${headerHtml}
            <h2 class="counter-price-list-heading">
              ${window.i18n.t('print.counterPriceListTitle')}
            </h2>
            <table class="price-list-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>${window.i18n.t('table.colName')}</th>
                  <th>${window.i18n.t('table.colStyle')}</th>
                  <th>${window.i18n.t('table.colSize')}</th>
                  <th>${window.i18n.t('table.colPrice')}</th>
                  <th>${window.i18n.t('table.colDeposit')}</th>
                  <th>${window.i18n.t('table.colTime')}</th>
                  <th>${window.i18n.t('table.colStatus')}</th>
                  <th>${window.i18n.t('table.colNotes')}</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
            ${footerHtml}
          </div>
        </div>
      `;
    }
  }

  function renderPrintPreview() {
    const container = document.getElementById('printPreviewContent');
    if (!container || !state.sheets.length) return;

    updatePrintScopeOptions();
    const scopeSelect = document.getElementById('printScopeSelect');
    const selectedScope = scopeSelect ? scopeSelect.value : 'active';
    const totalSheets = Math.max(1, state.sheets.length);

    let pagesHtml = '';

    if (selectedScope === 'all') {
      state.sheets.forEach((sheet, idx) => {
        pagesHtml += buildSheetLayoutHtml(sheet, idx, totalSheets, printMode);
      });
    } else if (selectedScope && selectedScope !== 'active') {
      const specificIdx = state.sheets.findIndex(s => s.id === selectedScope);
      const sheet = specificIdx >= 0 ? state.sheets[specificIdx] : getActiveSheet();
      const idx = specificIdx >= 0 ? specificIdx : Math.max(0, state.sheets.findIndex(s => s.id === sheet.id));
      pagesHtml = buildSheetLayoutHtml(sheet, idx, totalSheets, printMode);
    } else {
      const sheet = getActiveSheet();
      const idx = Math.max(0, state.sheets.findIndex(s => s.id === sheet.id));
      pagesHtml = buildSheetLayoutHtml(sheet, idx, totalSheets, printMode);
    }

    container.innerHTML = `
      <div class="safe-margin-indicator-label no-print">${window.i18n.t('print.safeMarginNotice')}</div>
      ${pagesHtml}
    `;
  }

  function openPrintModal(mode) {
    printMode = mode || 'sheet';
    document.querySelectorAll('.print-mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === printMode);
    });
    renderPrintPreview();
    const modal = document.getElementById('printModal');
    if (modal) modal.hidden = false;
  }

  function closePrintModal() {
    const modal = document.getElementById('printModal');
    if (modal) modal.hidden = true;
  }

  // --- CSV Export ---
  function exportCSV() {
    const sheet = getActiveSheet();
    if (!sheet || !sheet.designs || !sheet.designs.length) {
      alert(window.i18n.t('val.noDesignsToExport'));
      return;
    }

    const curr = sheet.currency || '£';
    const headers = [
      '#',
      window.i18n.t('table.colName'),
      window.i18n.t('table.colStyle'),
      window.i18n.t('table.colSize'),
      window.i18n.t('table.colPrice'),
      window.i18n.t('settings.currency'),
      window.i18n.t('table.colDeposit'),
      window.i18n.t('table.colTime'),
      window.i18n.t('table.colStatus'),
      window.i18n.t('table.colSpan'),
      window.i18n.t('table.colNotes')
    ];

    const rows = sheet.designs.map((d, i) => [
      i + 1,
      d.name,
      d.style ? window.i18n.t('style.' + d.style) : '',
      d.size ? window.i18n.t('size.' + d.size) : '',
      d.price !== '' && d.price !== null ? d.price : '',
      curr,
      d.deposit || '',
      d.sittingTime || '',
      d.status,
      d.span === 2 ? '2' : '1',
      d.notes || ''
    ]);

    function csvEscape(val) {
      const s = String(val === undefined || val === null ? '' : val);
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }

    const csvContent = '\uFEFF' + [headers, ...rows]
      .map(r => r.map(csvEscape).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (sheet.name || 'flash-sheet').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.href = url;
    a.download = `${safeName}-${sheet.date || todayLocal()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- JSON Backup Export & Import ---
  function exportJSONBackup() {
    const sheet = getActiveSheet();
    if (!sheet || !sheet.designs || !sheet.designs.length) {
      alert(window.i18n.t('val.noDesignsToExport'));
      return;
    }

    const backupData = {
      version: 2,
      exportDate: todayLocal(),
      sheets: state.sheets
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flash-sheets-backup-${todayLocal()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function triggerImportJSON() {
    const input = document.getElementById('jsonFileInput');
    if (input) input.click();
  }

  function handleImportJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const parsed = JSON.parse(e.target.result);
        let importedSheets = [];

        if (Array.isArray(parsed.sheets)) {
          importedSheets = parsed.sheets;
        } else if (Array.isArray(parsed)) {
          importedSheets = parsed;
        } else if (parsed && parsed.designs) {
          importedSheets = [parsed];
        }

        if (!importedSheets.length) {
          alert(window.i18n.t('sheet.importInvalid'));
          return;
        }

        // Validate structure
        importedSheets.forEach(s => {
          if (!s.id) s.id = uid();
          if (!s.name) s.name = window.i18n.t('sheet.defaultName');
          if (!Array.isArray(s.designs)) s.designs = [];
        });

        // Merge or replace
        importedSheets.forEach(ns => {
          const existingIdx = state.sheets.findIndex(s => s.id === ns.id);
          if (existingIdx !== -1) {
            state.sheets[existingIdx] = ns;
          } else {
            state.sheets.push(ns);
          }
        });

        state.activeSheetId = importedSheets[0].id;
        saveState();
        renderAll();
        alert(window.i18n.t('sheet.importSuccess', { count: importedSheets.length }));
      } catch (err) {
        alert(window.i18n.t('sheet.importInvalid'));
      }
    };
    reader.readAsText(file);
  }

  // --- Design Form Handling ---
  function resetDesignForm() {
    editingDesignId = null;
    currentUploadedImageData = null;
    document.getElementById('designName').value = '';
    document.getElementById('designStyle').value = '';
    document.getElementById('designSize').value = '';
    document.getElementById('designPrice').value = '';
    document.getElementById('designDeposit').value = '';
    document.getElementById('designTime').value = '';
    document.getElementById('designStatus').value = 'available';
    document.getElementById('designSpan').checked = false;
    document.getElementById('designNotes').value = '';

    // Image previews
    const dropzoneContent = document.getElementById('dropzoneContent');
    const imagePreviewWrap = document.getElementById('imagePreviewWrap');
    if (dropzoneContent) dropzoneContent.hidden = false;
    if (imagePreviewWrap) imagePreviewWrap.hidden = true;

    // Reset button labels
    const submitBtn = document.getElementById('designSubmitBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (submitBtn) submitBtn.textContent = window.i18n.t('form.addBtn');
    if (cancelBtn) cancelBtn.hidden = true;
  }

  function populateDesignForm(design) {
    editingDesignId = design.id;
    currentUploadedImageData = design.image || null;

    document.getElementById('designName').value = design.name || '';
    document.getElementById('designStyle').value = design.style || '';
    document.getElementById('designSize').value = design.size || '';
    document.getElementById('designPrice').value = design.price !== '' && design.price !== null ? design.price : '';
    document.getElementById('designDeposit').value = design.deposit !== '' && design.deposit !== null ? design.deposit : '';
    document.getElementById('designTime').value = design.sittingTime || '';
    document.getElementById('designStatus').value = design.status || 'available';
    document.getElementById('designSpan').checked = design.span === 2;
    document.getElementById('designNotes').value = design.notes || '';

    const dropzoneContent = document.getElementById('dropzoneContent');
    const imagePreviewWrap = document.getElementById('imagePreviewWrap');
    const previewThumbImg = document.getElementById('previewThumbImg');

    if (design.image) {
      if (previewThumbImg) previewThumbImg.src = design.image;
      if (dropzoneContent) dropzoneContent.hidden = true;
      if (imagePreviewWrap) imagePreviewWrap.hidden = false;
    } else {
      if (dropzoneContent) dropzoneContent.hidden = false;
      if (imagePreviewWrap) imagePreviewWrap.hidden = true;
    }

    const submitBtn = document.getElementById('designSubmitBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (submitBtn) submitBtn.textContent = window.i18n.t('form.updateBtn');
    if (cancelBtn) cancelBtn.hidden = false;

    // Scroll form into view
    document.getElementById('designFormCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleDesignFormSubmit(e) {
    e.preventDefault();
    const sheet = getActiveSheet();
    if (!sheet) return;

    const name = document.getElementById('designName').value.trim();
    if (!name) {
      alert(window.i18n.t('val.nameRequired'));
      document.getElementById('designName').focus();
      return;
    }

    const priceRaw = document.getElementById('designPrice').value.trim();
    let price = '';
    if (priceRaw !== '') {
      const p = parseFloat(priceRaw);
      if (isNaN(p) || p < 0) {
        alert(window.i18n.t('val.negativePrice'));
        document.getElementById('designPrice').focus();
        return;
      }
      price = p;
    }

    const depositRaw = document.getElementById('designDeposit').value.trim();
    let deposit = '';
    if (depositRaw !== '') {
      const dep = parseFloat(depositRaw);
      if (isNaN(dep) || dep < 0) {
        alert(window.i18n.t('val.negativeDeposit'));
        document.getElementById('designDeposit').focus();
        return;
      }
      if (price !== '' && dep > price) {
        alert(window.i18n.t('val.depositExceedsPrice'));
        document.getElementById('designDeposit').focus();
        return;
      }
      deposit = dep;
    }

    const style = document.getElementById('designStyle').value;
    const size = document.getElementById('designSize').value;
    const sittingTime = document.getElementById('designTime').value.trim();
    const status = document.getElementById('designStatus').value;
    const span = document.getElementById('designSpan').checked ? 2 : 1;
    const notes = document.getElementById('designNotes').value.trim();

    if (editingDesignId) {
      // Update existing
      const idx = sheet.designs.findIndex(d => d.id === editingDesignId);
      if (idx !== -1) {
        sheet.designs[idx] = {
          ...sheet.designs[idx],
          name,
          style,
          size,
          price,
          deposit,
          sittingTime,
          status,
          span,
          notes,
          image: currentUploadedImageData
        };
      }
    } else {
      // Add new
      const newDesign = {
        id: 'des_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
        name,
        style,
        size,
        price,
        deposit,
        sittingTime,
        status,
        span,
        notes,
        image: currentUploadedImageData
      };
      sheet.designs.push(newDesign);
    }

    saveState();
    resetDesignForm();
    renderActiveView();
  }

  // --- Sheet Switcher & Manager Operations ---
  function createNewSheet() {
    const name = prompt(window.i18n.t('sheet.newPrompt'), window.i18n.t('sheet.defaultName'));
    if (!name || !name.trim()) return;

    const newSheet = {
      id: uid(),
      name: name.trim(),
      artist: '',
      contact: '',
      date: todayLocal(),
      currency: '£',
      paperSize: 'a4',
      gridCols: 3,
      designs: []
    };

    state.sheets.push(newSheet);
    state.activeSheetId = newSheet.id;
    saveState();
    renderAll();
  }

  function duplicateActiveSheet() {
    const active = getActiveSheet();
    if (!active) return;

    const dupName = prompt(
      window.i18n.t('sheet.duplicatePrompt'),
      window.i18n.t('sheet.duplicateCopySuffix', { name: active.name })
    );
    if (!dupName || !dupName.trim()) return;

    const cloned = JSON.parse(JSON.stringify(active));
    cloned.id = uid();
    cloned.name = dupName.trim();
    cloned.designs.forEach(d => {
      d.id = 'des_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    });

    state.sheets.push(cloned);
    state.activeSheetId = cloned.id;
    saveState();
    renderAll();
  }

  function deleteActiveSheet() {
    if (state.sheets.length <= 1) {
      alert(window.i18n.t('sheet.cannotDeleteLast'));
      return;
    }

    const active = getActiveSheet();
    if (!confirm(window.i18n.t('sheet.confirmDelete', { name: active.name }))) {
      return;
    }

    state.sheets = state.sheets.filter(s => s.id !== active.id);
    state.activeSheetId = state.sheets[0].id;
    saveState();
    renderAll();
  }

  function clearActiveSheetDesigns() {
    const sheet = getActiveSheet();
    if (!sheet || !sheet.designs.length) return;
    if (confirm(window.i18n.t('val.confirmClearAll'))) {
      sheet.designs = [];
      saveState();
      renderActiveView();
    }
  }

  // --- Master Render ---
  function renderAll() {
    window.i18n.applyToDOM();
    renderSheetSelector();
    renderSheetSettings();
    renderActiveView();
    updateStorageMeter();
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // 1. Language selector
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
      langSelect.value = window.i18n.getCurrentLanguage();
      langSelect.addEventListener('change', function() {
        window.i18n.setLanguage(this.value);
        renderAll();
      });
    }

    // 2. Sheet selector
    const sheetSelect = document.getElementById('sheetSelect');
    if (sheetSelect) {
      sheetSelect.addEventListener('change', function() {
        state.activeSheetId = this.value;
        saveState();
        resetDesignForm();
        renderAll();
      });
    }

    // 3. Sheet action buttons
    document.getElementById('newSheetBtn')?.addEventListener('click', createNewSheet);
    document.getElementById('duplicateSheetBtn')?.addEventListener('click', duplicateActiveSheet);
    document.getElementById('deleteSheetBtn')?.addEventListener('click', deleteActiveSheet);
    document.getElementById('exportJsonBtn')?.addEventListener('click', exportJSONBackup);
    document.getElementById('importJsonBtn')?.addEventListener('click', triggerImportJSON);

    const jsonFileInput = document.getElementById('jsonFileInput');
    if (jsonFileInput) {
      jsonFileInput.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
          handleImportJSON(this.files[0]);
          this.value = '';
        }
      });
    }

    // 4. Sheet settings inputs
    const sheetSettingsInputs = [
      'sheetTitle', 'artistName', 'artistContact', 'sheetDate',
      'currencySelect', 'paperSizeSelect', 'gridColumnsSelect'
    ];
    sheetSettingsInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', function() {
          const sheet = getActiveSheet();
          if (!sheet) return;
          sheet.name = document.getElementById('sheetTitle').value.trim();
          sheet.artist = document.getElementById('artistName').value.trim();
          sheet.contact = document.getElementById('artistContact').value.trim();
          sheet.date = document.getElementById('sheetDate').value;
          sheet.currency = document.getElementById('currencySelect').value;
          sheet.paperSize = document.getElementById('paperSizeSelect').value;
          sheet.gridCols = parseInt(document.getElementById('gridColumnsSelect').value, 10) || 3;

          saveState();
          renderSheetSelector();
          renderSummary();

          // Sync label currencies
          const curr = sheet.currency || '£';
          document.getElementById('priceLabel').textContent = window.i18n.t('form.priceLabel', { curr });
          document.getElementById('depositLabel').textContent = window.i18n.t('form.depositLabel', { curr });
        });
      }
    });

    // 5. Image Dropzone & File Picker
    const imageDropzone = document.getElementById('imageDropzone');
    const imageFileInput = document.getElementById('imageFileInput');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const changeImageBtn = document.getElementById('changeImageBtn');

    if (imageDropzone && imageFileInput) {
      imageDropzone.addEventListener('click', function(e) {
        if (e.target === removeImageBtn || e.target === changeImageBtn) return;
        imageFileInput.click();
      });

      imageFileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
          processUploadedImage(this.files[0], function(dataUrl) {
            currentUploadedImageData = dataUrl;
            document.getElementById('previewThumbImg').src = dataUrl;
            document.getElementById('dropzoneContent').hidden = true;
            document.getElementById('imagePreviewWrap').hidden = false;
          });
          this.value = '';
        }
      });

      imageDropzone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
      });

      imageDropzone.addEventListener('dragleave', function() {
        this.classList.remove('dragover');
      });

      imageDropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          processUploadedImage(e.dataTransfer.files[0], function(dataUrl) {
            currentUploadedImageData = dataUrl;
            document.getElementById('previewThumbImg').src = dataUrl;
            document.getElementById('dropzoneContent').hidden = true;
            document.getElementById('imagePreviewWrap').hidden = false;
          });
        }
      });
    }

    if (removeImageBtn) {
      removeImageBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        currentUploadedImageData = null;
        document.getElementById('previewThumbImg').src = '';
        document.getElementById('dropzoneContent').hidden = false;
        document.getElementById('imagePreviewWrap').hidden = true;
      });
    }

    if (changeImageBtn && imageFileInput) {
      changeImageBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        imageFileInput.click();
      });
    }

    // 6. Design form submit & cancel
    document.getElementById('designForm')?.addEventListener('submit', handleDesignFormSubmit);
    document.getElementById('cancelEditBtn')?.addEventListener('click', resetDesignForm);

    // 7. View tabs (Table vs Arrange)
    const tableSortSelect = document.getElementById('tableSortSelect');
    if (tableSortSelect) {
      tableSortSelect.addEventListener('change', function() {
        currentTableSort = this.value;
        renderTableView();
      });
    }

    document.querySelectorAll('.view-tab').forEach(tab => {
      tab.addEventListener('click', function() {
        document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        currentView = this.dataset.view;
        renderActiveView();
      });
    });

    // 8. Designs Table / Arrange delegate actions (Edit, Status, Delete)
    function handleItemActions(e) {
      const editBtn = e.target.closest('.edit-btn');
      const statusBtn = e.target.closest('.status-btn');
      const delBtn = e.target.closest('.del-btn');
      const sheet = getActiveSheet();
      if (!sheet) return;

      if (editBtn) {
        const id = editBtn.dataset.id;
        const item = sheet.designs.find(d => d.id === id);
        if (item) populateDesignForm(item);
      } else if (statusBtn) {
        const id = statusBtn.dataset.id;
        const item = sheet.designs.find(d => d.id === id);
        if (item) {
          if (item.status === 'claimed') {
            item.status = 'available';
          } else {
            item.status = 'claimed';
          }
          saveState();
          renderActiveView();
        }
      } else if (delBtn) {
        const id = delBtn.dataset.id;
        const item = sheet.designs.find(d => d.id === id);
        if (item && confirm(window.i18n.t('val.confirmDeletePiece', { name: item.name }))) {
          sheet.designs = sheet.designs.filter(d => d.id !== id);
          if (editingDesignId === id) resetDesignForm();
          saveState();
          renderActiveView();
        }
      }
    }

    document.getElementById('designsTableBody')?.addEventListener('click', handleItemActions);
    document.getElementById('arrangeGrid')?.addEventListener('click', handleItemActions);

    // 9. List actions (Preview, Clear All, Export CSV)
    document.getElementById('previewSheetBtn')?.addEventListener('click', () => openPrintModal('sheet'));
    document.getElementById('previewPriceListBtn')?.addEventListener('click', () => openPrintModal('priceList'));
    document.getElementById('exportCsvBtn')?.addEventListener('click', exportCSV);
    document.getElementById('clearAllBtn')?.addEventListener('click', clearActiveSheetDesigns);

    // 10. Print modal buttons & mode switch
    document.getElementById('closePrintModalBtn')?.addEventListener('click', closePrintModal);
    document.getElementById('doPrintBtn')?.addEventListener('click', function() {
      window.print();
    });

    document.getElementById('printScopeSelect')?.addEventListener('change', function() {
      renderPrintPreview();
    });

    window.addEventListener('beforeprint', function() {
      renderPrintPreview();
      const modal = document.getElementById('printModal');
      if (modal) modal.hidden = false;
    });

    document.querySelectorAll('.print-mode-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.print-mode-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        printMode = this.dataset.mode;
        renderPrintPreview();
      });
    });

    // Close modal on escape
    window.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closePrintModal();
    });

    // Parent theme handshake
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'poli-theme') {
        const theme = e.data.theme === 'light' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
      }
    });
  }

  // --- Initializer ---
  function init() {
    window.i18n.init();
    loadState();
    setupEventListeners();
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
