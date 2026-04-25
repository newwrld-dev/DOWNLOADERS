const API_BASE = 'https://api-aswin-sparky.koyeb.app/api/downloader';
let currentPlatform = 'facebook';
let currentMedia = null;

const ENDPOINTS = {
  facebook: 'fbdl',
  instagram: 'igdl',
  tiktok: 'tiktok',
  pinterest: 'pin'
};

const PLATFORM_META = {
  facebook: { label: 'Facebook', emoji: '𝒇', color: '#1877F2' },
  instagram: { label: 'Instagram', emoji: '📷', color: '#E1306C' },
  tiktok: { label: 'TikTok', emoji: '♪', color: '#69C9D0' },
  pinterest: { label: 'Pinterest', emoji: '📌', color: '#E60023' }
};

function selectPlatform(el, platform) {
  document.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  currentPlatform = platform;
  document.getElementById('urlInput').placeholder = `Paste your ${PLATFORM_META[platform].label} link…`;
  document.getElementById('resultArea').innerHTML = '';
}

async function pasteUrl() {
  try {
    const text = await navigator.clipboard.readText();
    document.getElementById('urlInput').value = text;
    showToast('📋 Link pasted!', 'success');
  } catch {
    showToast('Tap the input and paste manually', 'error');
  }
}

async function fetchMedia() {
  const url = document.getElementById('urlInput').value.trim();
  if (!url) { showToast('⚠️ Please paste a link first', 'error'); return; }

  setLoading(true);
  document.getElementById('resultArea').innerHTML = `<div class="glass-card result-area"><div class="shimmer"></div></div>`;

  const endpoint = `${API_BASE}/${ENDPOINTS[currentPlatform]}?url=${encodeURIComponent(url)}`;

  try {
    const res = await fetch(endpoint);
    const data = await res.json();
    renderResult(data, url);
  } catch (e) {
    renderError('Could not fetch media. Check your link and try again.');
  } finally {
    setLoading(false);
  }
}

function renderResult(data, originalUrl) {
  const area = document.getElementById('resultArea');
  const meta = PLATFORM_META[currentPlatform];

  let items = [];

  if (data.status === false || data.error) {
    renderError(data.message || 'No media found for this link.');
    return;
  }

  // Facebook
  if (currentPlatform === 'facebook') {
    if (data.result) {
      const r = data.result;
      if (r.hd) items.push({ type: 'video', url: r.hd, label: 'HD Video', quality: 'HD' });
      if (r.sd) items.push({ type: 'video', url: r.sd, label: 'SD Video', quality: 'SD' });
      if (r.thumbnail) items.push({ type: 'image', url: r.thumbnail, label: 'Thumbnail', quality: 'IMG' });
    }
  }
  // Instagram
  else if (currentPlatform === 'instagram') {
    const result = data.result || data.data || [];
    if (Array.isArray(result)) {
      result.forEach((item, i) => {
        if (item.url || item.video_url) items.push({ type: item.type || (item.video_url ? 'video' : 'image'), url: item.url || item.video_url, label: `Media ${i+1}`, quality: item.type === 'video' ? 'MP4' : 'IMG', thumb: item.thumbnail || item.url });
      });
    } else if (result.url) {
      items.push({ type: result.type || 'video', url: result.url, label: 'Media', quality: 'MP4' });
    }
  }
  // TikTok
  else if (currentPlatform === 'tiktok') {
    const r = data.result || data.data || data;
    if (r.video) items.push({ type: 'video', url: r.video, label: 'Video (No Watermark)', quality: 'HD' });
    if (r.music) items.push({ type: 'audio', url: r.music, label: 'Audio / Music', quality: 'MP3' });
    if (r.cover || r.thumbnail) items.push({ type: 'image', url: r.cover || r.thumbnail, label: 'Cover Image', quality: 'IMG' });
  }
  // Pinterest
  else if (currentPlatform === 'pinterest') {
    const r = data.result || data.data || data;
    if (r.url) items.push({ type: r.type || 'image', url: r.url, label: 'Media', quality: r.type === 'video' ? 'MP4' : 'IMG' });
    if (Array.isArray(r)) r.forEach((item, i) => items.push({ type: item.type || 'image', url: item.url, label: `Item ${i+1}`, quality: 'IMG' }));
  }

  if (items.length === 0) {
    renderError('No downloadable media found. The link may be private or unsupported.');
    return;
  }

  let html = `<div class="result-area">`;

  const primary = items[0];
  html += `<div class="result-card">`;
  html += `<div class="result-preview">`;
  if (primary.type === 'video') {
    html += `<video src="${primary.url}" controls playsinline style="max-height:300px;width:100%;"></video>`;
  } else if (primary.type === 'image') {
    html += `<img src="${primary.url}" alt="preview" onerror="this.style.display='none'"/>`;
  } else {
    html += `<div style="padding:40px;text-align:center;font-size:40px;">🎵</div>`;
  }
  html += `<div class="preview-overlay"></div>`;
  html += `</div>`;

  html += `<div class="result-info">`;
  html += `<div class="result-meta">
    <div class="platform-tag">
      <div class="platform-tag-dot" style="background:${meta.color}"></div>
      ${meta.label}
    </div>
    <div class="media-type-tag">${primary.quality}</div>
  </div>`;
  html += `<div class="result-title">✅ Media found — ready to save!</div>`;

  if (items.length === 1) {
    const saveClass = primary.type === 'image' ? 'image-save' : 'video-save';
    const saveIcon = primary.type === 'image' ? '🖼️' : (primary.type === 'audio' ? '🎵' : '🎬');
    html += `<button class="save-btn ${saveClass}" onclick="saveFile('${primary.url}','${primary.label}','${primary.type}')">
      ${saveIcon} Save to Files
    </button>`;
  }
  html += `</div></div>`;

  if (items.length > 1) {
    html += `<div class="glass-card" style="margin-top:0">`;
    html += `<div class="quality-label">All Available Files</div>`;
    html += `<div class="items-grid">`;
    items.forEach((item, i) => {
      const icon = item.type === 'video' ? '🎬' : item.type === 'audio' ? '🎵' : '🖼️';
      html += `<div class="media-item">`;
      if (item.thumb) {
        html += `<img class="media-thumb" src="${item.thumb}" onerror="this.style.display='none'"/>`;
      } else {
        html += `<div class="media-thumb-placeholder">${icon}</div>`;
      }
      html += `<div class="media-details">
        <div class="media-label">${item.label}</div>
        <div class="format-name" style="font-size:13px;font-weight:700;">${item.quality}</div>
      </div>`;
      html += `<button class="item-dl-btn" onclick="saveFile('${item.url}','${item.label}','${item.type}')" title="Save ${item.label}">⬇</button>`;
      html += `</div>`;
    });
    html += `</div></div>`;
  }

  html += `</div>`;
  area.innerHTML = html;
  area.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('✅ Media fetched!', 'success');
}

function renderError(msg) {
  document.getElementById('resultArea').innerHTML = `
    <div class="glass-card result-area">
      <div class="error-state">
        <div class="error-icon">😕</div>
        <div class="error-msg">${msg}</div>
      </div>
    </div>`;
  showToast('❌ ' + msg.slice(0,40), 'error');
}

async function saveFile(url, label, type) {
  showToast('⏳ Preparing download…', '');

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const ext = type === 'video' ? 'mp4' : type === 'audio' ? 'mp3' : 'jpg';
    const filename = `PopKid_${label.replace(/\s+/g,'_')}_${Date.now()}.${ext}`;

    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    showToast('✅ Saved to Files!', 'success');
  } catch {
    window.open(url, '_blank');
    showToast('🔗 Opened — long press to save', 'success');
  }
}

function setLoading(on) {
  const btn = document.getElementById('dlBtn');
  const spinner = document.getElementById('spinner');
  const txt = document.getElementById('dlBtnText');
  btn.disabled = on;
  spinner.style.display = on ? 'block' : 'none';
  txt.textContent = on ? 'Fetching…' : '⬇ Fetch Media';
}

let toastTimer;
function showToast(msg, type) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  toast.className = 'toast ' + (type || '');
  toastMsg.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// Auto-detect platform from pasted URL
document.getElementById('urlInput').addEventListener('input', function() {
  const val = this.value;
  if (val.includes('facebook.com') || val.includes('fb.watch')) {
    document.querySelector('[data-platform="facebook"]').click();
  } else if (val.includes('instagram.com')) {
    document.querySelector('[data-platform="instagram"]').click();
  } else if (val.includes('tiktok.com') || val.includes('vt.tiktok')) {
    document.querySelector('[data-platform="tiktok"]').click();
  } else if (val.includes('pinterest') || val.includes('pin.it')) {
    document.querySelector('[data-platform="pinterest"]').click();
  }
});

// Enter key support
document.getElementById('urlInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') fetchMedia();
});
