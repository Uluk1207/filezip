/* ===== COMPRESS.JS — Логика страницы сжатия ===== */

let currentTab = 'docs';
let uploadedFiles = [];
let compressionLevel = 'medium';
let processedResults = [];

// ===== SWITCH TAB =====
function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tabDocs').classList.toggle('active', tab === 'docs');
  document.getElementById('tabImages').classList.toggle('active', tab === 'images');

  const fileInput = document.getElementById('fileInput');
  const dzFormats = document.getElementById('dzFormats');
  const dzIcon = document.getElementById('dzIcon');

  if (tab === 'docs') {
    fileInput.accept = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip';
    dzFormats.textContent = 'Поддерживаются: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, CSV, ZIP';
    dzIcon.textContent = '📂';
  } else {
    fileInput.accept = '.jpg,.jpeg,.png,.webp';
    dzFormats.textContent = 'Поддерживаются: JPG, JPEG, PNG, WEBP';
    dzIcon.textContent = '🖼️';
  }

  uploadedFiles = [];
  renderFileList();
  document.getElementById('settingsPanel').style.display = 'none';
  document.getElementById('compressActions').style.display = 'none';
  document.getElementById('resultsBlock').style.display = 'none';

  // Show/hide quality slider
  document.getElementById('qualityGroup').style.display = tab === 'images' ? 'block' : 'none';
}

// ===== LEVEL SELECTION =====
function setLevel(level) {
  compressionLevel = level;
  ['high','medium','low'].forEach(l => {
    document.getElementById('lvl' + l.charAt(0).toUpperCase() + l.slice(1))
      .classList.toggle('active', l === level);
  });
  // update quality slider default
  const qs = document.getElementById('qualitySlider');
  const qv = document.getElementById('qualityVal');
  if (level === 'high') { qs.value = 40; qv.textContent = '40%'; }
  if (level === 'medium') { qs.value = 75; qv.textContent = '75%'; }
  if (level === 'low') { qs.value = 90; qv.textContent = '90%'; }
}

// ===== FILE INPUT =====
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('fileInput');
  const dropZone = document.getElementById('dropZone');

  // Check URL param for pre-select tab
  const p = new URLSearchParams(location.search).get('type');
  if (p === 'image') switchTab('images');
  else switchTab('docs');

  input.addEventListener('change', e => {
    handleFiles(Array.from(e.target.files));
    input.value = '';
  });

  // Drag & Drop
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFiles(Array.from(e.dataTransfer.files));
  });
});

function handleFiles(files) {
  if (!files.length) return;
  files.forEach(f => {
    if (!uploadedFiles.find(u => u.name === f.name && u.size === f.size)) {
      uploadedFiles.push(f);
    }
  });
  renderFileList();
  document.getElementById('settingsPanel').style.display = 'block';
  document.getElementById('compressActions').style.display = 'block';
  document.getElementById('resultsBlock').style.display = 'none';
}

// ===== RENDER FILE LIST =====
function renderFileList() {
  const list = document.getElementById('fileList');
  if (!uploadedFiles.length) { list.innerHTML = ''; return; }
  list.innerHTML = uploadedFiles.map((f, i) => `
    <div class="file-item">
      <div class="file-item-icon">${getFileIcon(f.name)}</div>
      <div class="file-item-info">
        <div class="file-item-name">${f.name}</div>
        <div class="file-item-size">${formatBytes(f.size)}</div>
      </div>
      <button class="file-item-remove" onclick="removeFile(${i})">✕</button>
    </div>
  `).join('');
}

function removeFile(i) {
  uploadedFiles.splice(i, 1);
  renderFileList();
  if (!uploadedFiles.length) {
    document.getElementById('settingsPanel').style.display = 'none';
    document.getElementById('compressActions').style.display = 'none';
  }
}

// ===== COMPRESSION DISPATCH =====
async function startCompression() {
  if (!uploadedFiles.length) return showToast('Выберите файлы', 'error');

  document.getElementById('compressBtn').disabled = true;
  document.getElementById('loadingBlock').style.display = 'block';
  document.getElementById('resultsBlock').style.display = 'none';
  processedResults = [];

  for (let i = 0; i < uploadedFiles.length; i++) {
    const file = uploadedFiles[i];
    document.getElementById('loadingMsg').textContent = `Обработка: ${file.name} (${i+1}/${uploadedFiles.length})`;

    try {
      const start = Date.now();
      let result;
      const ext = file.name.split('.').pop().toLowerCase();

      if (['jpg','jpeg','png','webp'].includes(ext)) {
        result = await compressImage(file);
      } else if (ext === 'pdf') {
        result = await compressPDF(file);
      } else {
        result = await compressGenericDoc(file);
      }

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const saved = file.size - result.blob.size;
      const pct = Math.max(0, Math.round((saved / file.size) * 100));

      const resultObj = {
        name: file.name,
        originalSize: file.size,
        newSize: result.blob.size,
        saved,
        pct,
        elapsed,
        blob: result.blob,
        outputName: result.outputName || getCompressedName(file.name)
      };
      processedResults.push(resultObj);

      // Save to history
      addHistoryEntry({
        name: file.name,
        operation: 'Сжатие',
        originalSize: formatBytes(file.size),
        newSize: formatBytes(result.blob.size),
        saved: pct + '%',
        type: getFileType(file.name)
      });

    } catch (err) {
      console.error(err);
      showToast(`Ошибка обработки ${file.name}: ${err.message}`, 'error');
    }
  }

  document.getElementById('loadingBlock').style.display = 'none';
  document.getElementById('compressBtn').disabled = false;
  renderResults();
}

function getCompressedName(name) {
  const dot = name.lastIndexOf('.');
  if (dot === -1) return name + '_compressed';
  return name.slice(0, dot) + '_compressed' + name.slice(dot);
}

// ===== RENDER RESULTS =====
function renderResults() {
  if (!processedResults.length) return;
  const block = document.getElementById('resultsBlock');
  const list = document.getElementById('resultsList');
  block.style.display = 'block';
  block.scrollIntoView({ behavior: 'smooth', block: 'start' });

  list.innerHTML = processedResults.map((r, i) => `
    <div class="result-card">
      <div style="font-size:2rem">${getFileIcon(r.name)}</div>
      <div class="result-info">
        <div class="result-name">${r.name}</div>
        <div class="result-stats">
          <span>Исходный: <strong>${formatBytes(r.originalSize)}</strong></span>
          <span>Результат: <strong>${formatBytes(r.newSize)}</strong></span>
          <span class="saved">Сэкономлено: ${formatBytes(Math.max(0,r.saved))} (${r.pct}%)</span>
          <span>Время: ${r.elapsed}с</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${r.pct}%"></div>
        </div>
      </div>
      <button class="btn-download" onclick="downloadResult(${i})">⬇ Скачать</button>
    </div>
  `).join('');
}

function downloadResult(i) {
  const r = processedResults[i];
  downloadBlob(r.blob, r.outputName);
  showToast(`Скачивание: ${r.outputName}`, 'success');
}

function downloadAll() {
  processedResults.forEach((r, i) => {
    setTimeout(() => downloadResult(i), i * 400);
  });
}

function resetAll() {
  uploadedFiles = [];
  processedResults = [];
  renderFileList();
  document.getElementById('settingsPanel').style.display = 'none';
  document.getElementById('compressActions').style.display = 'none';
  document.getElementById('resultsBlock').style.display = 'none';
  document.getElementById('loadingBlock').style.display = 'none';
}
