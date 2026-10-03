// Time Log — Google Apps Script backend.
// Bound to a Google Sheet. Each POST appends one row to the "Log" tab.
// Attendance is per day (Vienna time): a name can be logged once per day.

const SHEET_NAME = 'Log';
const HEADERS = ['Logged at', 'Name', 'Time', 'Time entered by hand', 'Remarks'];
const TZ = 'Europe/Vienna';
// Rows scanned from the bottom to find today's entries. Must exceed one day's rows.
const SCAN_ROWS = 300;

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const name = String(body.name || '').trim().slice(0, 80);
    const remarks = String(body.remarks || '').trim().slice(0, 500);
    if (!name) return json({ ok: false, error: 'Name is required' });

    const loggedAt = new Date();
    let time = loggedAt;
    let manual = false;
    if (body.time) {
      const t = new Date(body.time);
      if (isNaN(t.getTime())) return json({ ok: false, error: 'Invalid time' });
      if (day(t) !== day(loggedAt)) return json({ ok: false, error: 'The time must be today' });
      time = t;
      manual = true;
    }

    // One writer at a time, so two people (or two taps) can't both pass the duplicate check.
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const existing = presentToday().find((p) => p.name === name);
      if (existing) return json({ ok: false, error: 'already', name: name, time: existing.time });
      sheet().appendRow([loggedAt, name, time, manual ? 'yes' : '', remarks]);
    } finally {
      lock.releaseLock();
    }
    return json({ ok: true, name: name, time: time.toISOString(), manual: manual });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// Returns who is present today.
function doGet() {
  return json({ ok: true, day: day(new Date()), present: presentToday() });
}

function presentToday() {
  const sh = sheet();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const start = Math.max(2, last - SCAN_ROWS + 1);
  const rows = sh.getRange(start, 1, last - start + 1, 3).getValues();
  const today = day(new Date());
  const seen = {};
  const present = [];
  rows.forEach((r) => {
    const loggedAt = r[0], name = String(r[1]), time = r[2];
    if (!(loggedAt instanceof Date) || day(loggedAt) !== today || seen[name]) return;
    seen[name] = true;
    present.push({ name: name, time: (time instanceof Date ? time : loggedAt).toISOString() });
  });
  return present;
}

function day(d) {
  return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
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
  } else if (sh.getRange(1, 5).getValue() === '') {
    sh.getRange(1, 5).setValue('Remarks');
  }
  return sh;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
