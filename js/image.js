/* ===== IMAGE.JS — Работа с изображениями ===== */

// ===== COMPRESS IMAGE (Canvas API) =====
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // For high compression, also reduce dimensions slightly
        if (compressionLevel === 'high' && (width > 1920 || height > 1080)) {
          const scale = Math.min(1920 / width, 1080 / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const quality = parseInt(document.getElementById('qualitySlider')?.value || 75) / 100;
        const ext = file.name.split('.').pop().toLowerCase();
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const outputExt = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpg';

        canvas.toBlob(blob => {
          if (!blob) return reject(new Error('Canvas toBlob failed'));
          const name = file.name.replace(/\.[^.]+$/, '') + '_compressed.' + outputExt;
          resolve({ blob, outputName: name });
        }, mimeType, mimeType === 'image/png' ? undefined : quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===== RESIZE IMAGE TOOL =====
function initResize() {
  const input = document.getElementById('resizeInput');
  if (!input) return;
  input.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        document.getElementById('resizeImg').src = ev.target.result;
        document.getElementById('resizePreview').style.display = 'block';
        document.getElementById('resizeW').value = img.width;
        document.getElementById('resizeH').value = img.height;
        document.getElementById('resizeOrigInfo').textContent =
          `Оригинал: ${img.width}×${img.height}px · ${formatBytes(file.size)}`;
        document.getElementById('resizeBtnExec').style.display = 'inline-block';

        // Aspect ratio linking
        const wInput = document.getElementById('resizeW');
        const hInput = document.getElementById('resizeH');
        let origW = img.width, origH = img.height;

        wInput.addEventListener('input', () => {
          if (document.getElementById('resizeAspect').checked) {
            hInput.value = Math.round(parseInt(wInput.value) * origH / origW) || '';
          }
        });
        hInput.addEventListener('input', () => {
          if (document.getElementById('resizeAspect').checked) {
            wInput.value = Math.round(parseInt(hInput.value) * origW / origH) || '';
          }
        });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function resizeImage() {
  const input = document.getElementById('resizeInput');
  const file = input.files[0];
  if (!file) return showToast('Выберите изображение', 'error');
  const newW = parseInt(document.getElementById('resizeW').value);
  const newH = parseInt(document.getElementById('resizeH').value);
  if (!newW || !newH || newW <= 0 || newH <= 0) return showToast('Введите корректные размеры', 'error');

  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = newW; canvas.height = newH;
      canvas.getContext('2d').drawImage(img, 0, 0, newW, newH);
      canvas.toBlob(blob => {
        const ext = file.name.split('.').pop().toLowerCase();
        const outName = file.name.replace(/\.[^.]+$/, '') + `_${newW}x${newH}.${ext}`;
        const url = URL.createObjectURL(blob);
        document.getElementById('resizeResult').innerHTML = `
          <img src="${url}" style="max-height:150px;border-radius:8px;margin-bottom:0.5rem;border:1px solid var(--border)"><br>
          <p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:0.8rem">${newW}×${newH}px · ${formatBytes(blob.size)}</p>
          <button class="btn-download" onclick="downloadBlob(window._resizeBlob,'${outName}')">⬇ Скачать</button>`;
        window._resizeBlob = blob;
        addHistoryEntry({ name: file.name, operation: 'Изменение размера', originalSize: formatBytes(file.size), newSize: formatBytes(blob.size), saved: '-', type: 'image' });
        showToast('Готово!', 'success');
      }, file.type || 'image/jpeg', 0.9);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ===== CROP IMAGE =====
function initCrop() {
  const input = document.getElementById('cropInput');
  if (!input) return;
  input.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = document.getElementById('cropImg');
      img.src = ev.target.result;
      document.getElementById('cropPreview').style.display = 'block';
      document.getElementById('cropBtnExec').style.display = 'inline-block';
      img.onload = () => {
        document.getElementById('cropW').value = img.naturalWidth;
        document.getElementById('cropH').value = img.naturalHeight;
      };
    };
    reader.readAsDataURL(file);
  });
}

function cropImage() {
  const input = document.getElementById('cropInput');
  const file = input.files[0];
  if (!file) return showToast('Выберите изображение', 'error');
  const x = parseInt(document.getElementById('cropX').value) || 0;
  const y = parseInt(document.getElementById('cropY').value) || 0;
  const w = parseInt(document.getElementById('cropW').value) || 400;
  const h = parseInt(document.getElementById('cropH').value) || 300;

  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
      canvas.toBlob(blob => {
        const ext = file.name.split('.').pop().toLowerCase();
        const outName = file.name.replace(/\.[^.]+$/, '') + `_crop.${ext}`;
        const url = URL.createObjectURL(blob);
        document.getElementById('cropResult').innerHTML = `
          <img src="${url}" style="max-height:150px;border-radius:8px;margin-bottom:0.5rem;border:1px solid var(--border)"><br>
          <button class="btn-download" onclick="downloadBlob(window._cropBlob,'${outName}')">⬇ Скачать</button>`;
        window._cropBlob = blob;
        addHistoryEntry({ name: file.name, operation: 'Обрезка', originalSize: formatBytes(file.size), newSize: formatBytes(blob.size), saved: '-', type: 'image' });
        showToast('Готово!', 'success');
      }, file.type || 'image/jpeg', 0.9);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ===== ROTATE IMAGE =====
function initImgRotate() {
  const input = document.getElementById('imgrotInput');
  if (!input) return;
  input.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      document.getElementById('imgrotImg').src = ev.target.result;
      document.getElementById('imgrotPreview').style.display = 'block';
      document.getElementById('imgrotBtnExec').style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
  });
}

function rotateImage() {
  const input = document.getElementById('imgrotInput');
  const file = input.files[0];
  if (!file) return showToast('Выберите изображение', 'error');
  const angle = parseInt(document.getElementById('imgrotAngle').value);

  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const rad = (angle * Math.PI) / 180;
      const sin = Math.abs(Math.sin(rad)), cos = Math.abs(Math.cos(rad));
      const newW = Math.round(img.width * cos + img.height * sin);
      const newH = Math.round(img.width * sin + img.height * cos);
      const canvas = document.createElement('canvas');
      canvas.width = newW; canvas.height = newH;
      const ctx = canvas.getContext('2d');
      ctx.translate(newW / 2, newH / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      canvas.toBlob(blob => {
        const ext = file.name.split('.').pop().toLowerCase();
        const outName = file.name.replace(/\.[^.]+$/, '') + `_rot${angle}.${ext}`;
        const url = URL.createObjectURL(blob);
        document.getElementById('imgrotResult').innerHTML = `
          <img src="${url}" style="max-height:150px;border-radius:8px;margin-bottom:0.5rem;border:1px solid var(--border)"><br>
          <button class="btn-download" onclick="downloadBlob(window._rotImgBlob,'${outName}')">⬇ Скачать</button>`;
        window._rotImgBlob = blob;
        addHistoryEntry({ name: file.name, operation: `Поворот ${angle}°`, originalSize: formatBytes(file.size), newSize: formatBytes(blob.size), saved: '-', type: 'image' });
        showToast('Готово!', 'success');
      }, file.type || 'image/jpeg', 0.9);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ===== CONVERT IMAGE FORMAT =====
function initImgConvert() {
  const input = document.getElementById('imgcInput');
  if (!input) return;
  input.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      document.getElementById('imgcImg').src = ev.target.result;
      document.getElementById('imgcPreview').style.display = 'block';
      document.getElementById('imgcBtnExec').style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
  });
}

function convertImage() {
  const input = document.getElementById('imgcInput');
  const file = input.files[0];
  if (!file) return showToast('Выберите изображение', 'error');
  const targetMime = document.getElementById('imgcTarget').value;
  const quality = parseInt(document.getElementById('imgcQual').value) / 100;
  const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const outExt = extMap[targetMime];

  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      const q = targetMime === 'image/png' ? undefined : quality;
      canvas.toBlob(blob => {
        const outName = file.name.replace(/\.[^.]+$/, '') + '.' + outExt;
        const url = URL.createObjectURL(blob);
        document.getElementById('imgcResult').innerHTML = `
          <img src="${url}" style="max-height:120px;border-radius:8px;margin-bottom:0.5rem;border:1px solid var(--border)"><br>
          <p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:0.8rem">${formatBytes(blob.size)}</p>
          <button class="btn-download" onclick="downloadBlob(window._convImgBlob,'${outName}')">⬇ Скачать ${outExt.toUpperCase()}</button>`;
        window._convImgBlob = blob;
        addHistoryEntry({ name: file.name, operation: `Конвертация → ${outExt.toUpperCase()}`, originalSize: formatBytes(file.size), newSize: formatBytes(blob.size), saved: '-', type: 'image' });
        showToast('Конвертация завершена!', 'success');
      }, targetMime, q);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
