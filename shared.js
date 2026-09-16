const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function pad(n) { return String(n).padStart(2, '0'); }
function bravoDate(d) { return new Date(d.getTime() + 2 * 60 * 60000); }
function formatDTG(d) {
  const b = bravoDate(d);
  return `${pad(b.getUTCDate())}${pad(b.getUTCHours())}${pad(b.getUTCMinutes())}B ${MONTHS[b.getUTCMonth()]} ${pad(b.getUTCFullYear() % 100)}`;
}
function isoDate(d) {
  const b = bravoDate(d);
  return `${b.getUTCFullYear()}-${pad(b.getUTCMonth() + 1)}-${pad(b.getUTCDate())}`;
}
function finYear(d) {
  const b = bravoDate(d);
  const y = b.getUTCFullYear(), m = b.getUTCMonth() + 1;
  const start = (m >= 4) ? y : y - 1;
  return `${String(start).slice(2)}/${String(start + 1).slice(2)}`;
}

const dtgEl = document.getElementById('dtg');
if (dtgEl) {
  const tickDTG = () => { dtgEl.textContent = formatDTG(new Date()); };
  tickDTG();
  setInterval(tickDTG, 1000);
}

function autoGrow(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
document.querySelectorAll('textarea').forEach(el => {
  autoGrow(el);
  el.addEventListener('input', () => autoGrow(el));
});

(function() {
  const KEY = 'cfsInstallDismissed';
  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }
  if (isStandalone()) return;
  let dismissed = false;
  try { dismissed = localStorage.getItem(KEY) === '1'; } catch (e) {}
  if (dismissed) return;

  const banner = document.getElementById('installBanner');
  const msg = document.getElementById('installMsg');
  const installBtn = document.getElementById('installBtn');
  const closeBtn = document.getElementById('installClose');
  let deferredPrompt = null;

  function dismiss() {
    banner.classList.remove('show');
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
  }
  closeBtn.addEventListener('click', dismiss);

  if (isIOS()) {
    msg.textContent = '📲 For the best experience, tap the Share icon and select "Add to Home Screen"';
    banner.classList.add('show');
  } else {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      msg.textContent = 'Install this app for one-tap access, even offline.';
      installBtn.style.display = '';
      banner.classList.add('show');
    });
    installBtn.addEventListener('click', () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => dismiss());
    });
  }
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
