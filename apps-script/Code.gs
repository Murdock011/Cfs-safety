/**
 * Deploy: script.google.com → New project → paste this in → Deploy →
 * New deployment → type "Web app" → Execute as: Me → Who has access: Anyone
 * → copy the deployment URL into APPS_SCRIPT_URL in the report forms.
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const attachments = (data.photos || []).map((p) =>
      Utilities.newBlob(Utilities.base64Decode(p.base64), p.type || 'image/jpeg', p.name || 'photo.jpg')
    );
    if (data.pdf) {
      attachments.push(Utilities.newBlob(Utilities.base64Decode(data.pdf.base64), data.pdf.type || 'application/pdf', data.pdf.name || 'report.pdf'));
    }
    MailApp.sendEmail({
      to: data.to,
      subject: data.subject || 'CFS Report',
      body: data.body || '',
      attachments: attachments
    });
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
