/**
 * Deploy: script.google.com → New project → paste this in → Deploy →
 * New deployment → type "Web app" → Execute as: Me → Who has access: Anyone
 * → copy the deployment URL into APPS_SCRIPT_URL in the report forms.
 *
 * Also: Project Settings → Script Properties → add SUBMIT_SECRET with a
 * random value, and put the same value in SUBMIT_TOKEN in each form's HTML.
 * This isn't real auth (the token is readable in the page's JS) — it just
 * blocks bots/scanners hitting the bare URL. Real abuse-prevention is the
 * rate limit below.
 */
// Fixed recipient — never trust `to` from the client, or this endpoint becomes an open mail relay.
const RECIPIENT_EMAIL = 'gerhard.duminy@gmail.com';
const MAX_SUBMITS_PER_HOUR = 10;
const MAX_PHOTOS = 5;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const MAX_BODY_CHARS = 20000;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('SUBMIT_SECRET');
    if (!secret || data.secret !== secret) {
      return jsonOut({ ok: false, error: 'forbidden' });
    }
    if (!underRateLimit()) {
      return jsonOut({ ok: false, error: 'rate limit exceeded, try again later' });
    }
    const photos = data.photos || [];
    if (photos.length > MAX_PHOTOS) {
      return jsonOut({ ok: false, error: 'too many photos' });
    }
    if ((data.body || '').length > MAX_BODY_CHARS || (data.subject || '').length > 500) {
      return jsonOut({ ok: false, error: 'payload too large' });
    }
    for (const p of photos) {
      if (ALLOWED_PHOTO_TYPES.indexOf(p.type) === -1) {
        return jsonOut({ ok: false, error: 'unsupported photo type' });
      }
    }
    const attachments = photos.map((p) => {
      const bytes = Utilities.base64Decode(p.base64);
      if (bytes.length > MAX_ATTACHMENT_BYTES) throw new Error('photo too large');
      return Utilities.newBlob(bytes, p.type, p.name || 'photo.jpg');
    });
    if (data.pdf) {
      const pdfBytes = Utilities.base64Decode(data.pdf.base64);
      if (pdfBytes.length > MAX_ATTACHMENT_BYTES) {
        return jsonOut({ ok: false, error: 'pdf too large' });
      }
      attachments.push(Utilities.newBlob(pdfBytes, data.pdf.type || 'application/pdf', data.pdf.name || 'report.pdf'));
    }
    MailApp.sendEmail({
      to: RECIPIENT_EMAIL,
      subject: data.subject || 'CFS Report',
      body: data.body || '',
      attachments: attachments
    });
    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

// ponytail: CacheService get+put isn't atomic, so concurrent requests could
// both squeeze past the cap by a submit or two — fine for this app's real
// traffic (a handful of field reports), upgrade to LockService if that
// changes.
function underRateLimit() {
  const cache = CacheService.getScriptCache();
  const key = 'submits_' + Math.floor(Date.now() / 3600000);
  const count = Number(cache.get(key) || 0);
  if (count >= MAX_SUBMITS_PER_HOUR) return false;
  cache.put(key, String(count + 1), 3600);
  return true;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
