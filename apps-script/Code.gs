// Time Log — Google Apps Script backend.
// Bound to a Google Sheet. Each POST appends one row to the "Log" tab.

const SHEET_NAME = 'Log';
const HEADERS = ['Logged at', 'Name', 'Time', 'Time entered by hand'];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const name = String(body.name || '').trim().slice(0, 80);
    if (!name) return json({ ok: false, error: 'Name is required' });

    const loggedAt = new Date();
    let time = loggedAt;
    let manual = false;
    if (body.time) {
      const t = new Date(body.time);
      if (isNaN(t.getTime())) return json({ ok: false, error: 'Invalid time' });
      time = t;
      manual = true;
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet().appendRow([loggedAt, name, time, manual ? 'yes' : '']);
    } finally {
      lock.releaseLock();
    }
    return json({ ok: true, name: name, time: time.toISOString(), manual: manual });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json({ ok: true, service: 'time-log' });
}

function sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
    sh.getRange('C:C').setNumberFormat('yyyy-mm-dd hh:mm');
  }
  return sh;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
