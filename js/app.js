/* ===== APP.JS — Общая логика ===== */

// Burger menu
document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger');
  const navLinks = document.getElementById('navLinks');
  if (burger && navLinks) {
    burger.addEventListener('click', () => navLinks.classList.toggle('open'));
  }
});

// ===== TOAST =====
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ===== FORMAT BYTES =====
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===== HISTORY (localStorage) =====
const HISTORY_KEY = 'filezip_history';

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}

function addHistoryEntry(entry) {
  const history = getHistory();
  history.unshift({ ...entry, id: Date.now(), date: new Date().toLocaleString('ru') });
  if (history.length > 100) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// ===== GET FILE ICON =====
function getFileIcon(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const icons = {
    pdf: '📄', doc: '📝', docx: '📝', txt: '📃', ppt: '📊', pptx: '📊',
    xls: '📈', xlsx: '📈', csv: '📋', zip: '🗜️',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', webp: '🖼️'
  };
  return icons[ext] || '📁';
}

// ===== GET FILE TYPE =====
function getFileType(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (['jpg','jpeg','png','webp'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  return 'other';
}

// ===== SLEEP =====
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===== DOWNLOAD BLOB =====
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
