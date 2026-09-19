const KEY = 'poli-flash-builder';
const addBtn      = document.getElementById('add-btn');
const designsBody = document.getElementById('designs-body');
const listSection = document.getElementById('list-section');
const emptyState  = document.getElementById('empty-state');
const printBtn    = document.getElementById('print-btn');
const exportBtn   = document.getElementById('export-btn');
const clearBtn    = document.getElementById('clear-btn');
const printModal  = document.getElementById('print-modal');
const printPreview= document.getElementById('print-preview');
const doPrintBtn  = document.getElementById('do-print-btn');
const closeModal  = document.getElementById('close-modal-btn');

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
document.getElementById('sheet-date').value = todayLocal();

function load() { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtPrice(p) { return '£' + parseFloat(p).toFixed(2); }

function render() {
  const pieces = load();
  document.getElementById('piece-count').textContent = pieces.length || '';

  if (!pieces.length) {
    listSection.style.display = 'none';
    emptyState.style.display  = '';
    return;
  }
  emptyState.style.display  = 'none';
  listSection.style.display = '';

  const available  = pieces.filter(p => !p.sold);
  const soldPieces = pieces.filter(p => p.sold);
  const totalVal   = available.reduce((s, p) => s + parseFloat(p.price || 0), 0);
  document.getElementById('summary-strip').innerHTML =
    `<span>Total: <strong>${pieces.length}</strong></span>` +
    `<span>Available: <strong>${available.length}</strong></span>` +
    `<span>Sold: <strong>${soldPieces.length}</strong></span>` +
    `<span>Available value: <strong>£${totalVal.toFixed(2)}</strong></span>`;

  designsBody.innerHTML = pieces.map((p, i) => `
    <tr class="${p.sold ? 'sold-row' : ''}">
      <td>${i + 1}</td>
      <td>${escHtml(p.name)}</td>
      <td>${escHtml(p.style || '—')}</td>
      <td>${escHtml(p.size  || '—')}</td>
      <td>${p.price ? fmtPrice(p.price) : '—'}</td>
      <td>${p.sold ? '<span style="color:#3fb950;font-size:0.8rem;font-weight:700">SOLD</span>' : 'Available'}</td>
      <td>${escHtml(p.notes || '—')}</td>
      <td class="action-cell">
        <button class="sold-btn" data-idx="${i}">${p.sold ? 'Unsell' : 'Sold'}</button>
        <button class="del-btn"  data-idx="${i}">×</button>
      </td>
    </tr>`).join('');
}

addBtn.addEventListener('click', () => {
  const name = document.getElementById('design-name').value.trim();
  if (!name) { alert('Please enter a design name.'); return; }
  const pieces = load();
  pieces.push({
    name,
    style: document.getElementById('design-style').value,
    size:  document.getElementById('design-size').value,
    price: document.getElementById('design-price').value,
    notes: document.getElementById('design-notes').value.trim(),
    sold:  false,
  });
  save(pieces);
  document.getElementById('design-name').value  = '';
  document.getElementById('design-style').value = '';
  document.getElementById('design-size').value  = '';
  document.getElementById('design-price').value = '';
  document.getElementById('design-notes').value = '';
  render();
});

designsBody.addEventListener('click', e => {
  const soldBtn = e.target.closest('.sold-btn');
  const delBtn  = e.target.closest('.del-btn');
  const pieces  = load();
  if (soldBtn) {
    const idx = parseInt(soldBtn.dataset.idx, 10);
    pieces[idx].sold = !pieces[idx].sold;
    save(pieces); render();
  }
  if (delBtn) {
    if (!confirm('Delete this design?')) return;
    const idx = parseInt(delBtn.dataset.idx, 10);
    pieces.splice(idx, 1);
    save(pieces); render();
  }
});

printBtn.addEventListener('click', () => {
  const pieces  = load();
  const artist  = document.getElementById('artist-name').value.trim()    || 'Flash Sheet';
  const contact = document.getElementById('artist-contact').value.trim();
  const date    = document.getElementById('sheet-date').value;
  const meta    = [artist, contact, date].filter(Boolean).map(escHtml).join(' · ');
  printPreview.innerHTML = `
    <div class="print-header">
      <div class="print-title">Flash Available</div>
      <div class="print-artist">${meta}</div>
    </div>
    <div class="print-grid">
      ${pieces.map((p, i) => `
        <div class="print-card${p.sold ? ' sold-card' : ''}">
          <div class="print-num">#${i + 1}${p.sold ? ' — SOLD' : ''}</div>
          <div class="print-name">${escHtml(p.name)}</div>
          <div class="print-meta">${[p.style, p.size].filter(Boolean).map(escHtml).join(' · ') || '&nbsp;'}</div>
          <div class="print-price">${p.price ? fmtPrice(p.price) : 'POA'}</div>
          ${p.notes ? `<div class="print-notes">${escHtml(p.notes)}</div>` : ''}
        </div>`).join('')}
    </div>`;
  printModal.style.display = 'flex';
});

doPrintBtn.addEventListener('click', () => window.print());
closeModal.addEventListener('click', () => { printModal.style.display = 'none'; });
printModal.addEventListener('click', e => { if (e.target === printModal) printModal.style.display = 'none'; });

exportBtn.addEventListener('click', () => {
  const pieces = load();
  if (!pieces.length) { alert('No designs to export.'); return; }
  const rows = pieces.map((p, i) =>
    [i + 1, p.name, p.style, p.size, p.price, p.sold ? 'Sold' : 'Available', p.notes]
      .map(v => `"${String(v || '').replace(/"/g, '""')}"`)
      .join(',')
  );
  const csv = ['Number,Name,Style,Size,Price,Status,Notes', ...rows].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'flash-sheet.csv';
  a.click();
});

clearBtn.addEventListener('click', () => {
  if (!confirm('Clear all flash designs? This cannot be undone.')) return;
  localStorage.removeItem(KEY);
  render();
});

render();
