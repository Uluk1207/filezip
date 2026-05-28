/* ===== HISTORY.JS — История операций ===== */

let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  renderHistory();
  renderSummary();
});

function renderHistory() {
  const history = getHistory();
  const body = document.getElementById('historyBody');
  const empty = document.getElementById('emptyHistory');
  const tableWrap = document.getElementById('historyTableWrap');

  const filtered = currentFilter === 'all'
    ? history
    : history.filter(e => e.type === currentFilter);

  if (!filtered.length) {
    empty.style.display = 'block';
    tableWrap.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  tableWrap.style.display = 'block';

  body.innerHTML = filtered.map(e => `
    <tr>
      <td>
        <span style="margin-right:0.5rem">${getFileIcon(e.name)}</span>
        <span style="font-size:0.85rem;font-weight:500">${truncate(e.name, 30)}</span>
      </td>
      <td style="color:var(--text-muted);font-size:0.82rem">${e.operation}</td>
      <td style="font-size:0.82rem">${e.originalSize}</td>
      <td style="font-size:0.82rem">${e.newSize}</td>
      <td><span class="badge-saved">${e.saved}</span></td>
      <td style="color:var(--text-muted);font-size:0.78rem;white-space:nowrap">${e.date}</td>
    </tr>
  `).join('');
}

function renderSummary() {
  const history = getHistory();
  document.getElementById('statTotal').textContent = history.length;

  // Saved bytes (only where we have numeric pct)
  let totalSavedBytes = 0;
  let pctSum = 0;
  let pctCount = 0;
  const types = new Set();

  history.forEach(e => {
    types.add(e.type);
    const pctStr = e.saved;
    const pct = parseInt(pctStr);
    if (!isNaN(pct) && pct > 0) {
      pctSum += pct;
      pctCount++;
    }
  });

  document.getElementById('statSaved').textContent = history.length
    ? formatBytes(estimateSavedBytes(history))
    : '0 KB';
  document.getElementById('statAvg').textContent = pctCount
    ? Math.round(pctSum / pctCount) + '%'
    : '0%';
  document.getElementById('statTypes').textContent = types.size || '—';
}

function estimateSavedBytes(history) {
  let total = 0;
  history.forEach(e => {
    const pct = parseInt(e.saved);
    if (!isNaN(pct) && pct > 0) {
      // Parse original size back to bytes roughly
      const orig = parseSize(e.originalSize);
      total += Math.round(orig * pct / 100);
    }
  });
  return total;
}

function parseSize(str) {
  if (!str) return 0;
  const match = str.match(/([\d.]+)\s*(B|KB|MB|GB)/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const map = { B: 1, KB: 1024, MB: 1024*1024, GB: 1024*1024*1024 };
  return Math.round(val * (map[unit] || 1));
}

function filterHistory(type, btn) {
  currentFilter = type;
  document.querySelectorAll('.tab-bar .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderHistory();
}

function clearHistory() {
  if (!confirm('Очистить всю историю операций?')) return;
  localStorage.removeItem('filezip_history');
  renderHistory();
  renderSummary();
  showToast('История очищена', 'success');
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}
