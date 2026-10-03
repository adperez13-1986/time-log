// Time Log — Google Apps Script backend.
// Bound to a Google Sheet. Each log appends one row to the "Log" tab.
// Attendance is per day (Vienna time): a name can be logged once per day.
// Leaders (PIN in Script Properties as LEADER_PIN) can edit today's time and remarks.

const SHEET_NAME = 'Log';
const HEADERS = ['Logged at', 'Name', 'Time', 'Time entered by hand', 'Remarks', 'Edited by leader'];
const TZ = 'Europe/Vienna';
// Rows scanned from the bottom to find today's entries. Must exceed one day's rows.
const SCAN_ROWS = 300;
// Wrong PINs allowed before leader mode locks for LOCKOUT_SECONDS (for everyone).
const MAX_PIN_FAILS = 5;
const LOCKOUT_SECONDS = 15 * 60;

const COL = { loggedAt: 1, name: 2, time: 3, manual: 4, remarks: 5, edited: 6 };

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'leader') return json(leaderList(body));
    if (body.action === 'edit') return json(leaderEdit(body));
    return json(logTime(body));
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// Returns who is present today (no remarks; those are for leaders).
function doGet() {
  return json({
    ok: true,
    day: day(new Date()),
    present: today().map((r) => ({ name: r.name, time: r.time })),
  });
}

function logTime(body) {
  const name = String(body.name || '').trim().slice(0, 80);
  const remarks = String(body.remarks || '').trim().slice(0, 500);
  if (!name) return { ok: false, error: 'Name is required' };

  const loggedAt = new Date();
  let time = loggedAt;
  let manual = false;
  if (body.time) {
    time = parseToday(body.time, loggedAt);
    if (!time) return { ok: false, error: 'The time must be today' };
    manual = true;
  }

  // One writer at a time, so two people (or two taps) can't both pass the duplicate check.
  return withLock(() => {
    const existing = today().find((r) => r.name === name);
    if (existing) return { ok: false, error: 'already', name: name, time: existing.time };
    sheet().appendRow([loggedAt, name, time, manual ? 'yes' : '', remarks, '']);
    return { ok: true, name: name, time: time.toISOString(), manual: manual };
  });
}

function leaderList(body) {
  const denied = checkPin(body.pin);
  if (denied) return denied;
  return { ok: true, present: today().map((r) => ({ name: r.name, time: r.time, remarks: r.remarks })) };
}

function leaderEdit(body) {
  const denied = checkPin(body.pin);
  if (denied) return denied;
  const name = String(body.name || '').trim();
  const remarks = String(body.remarks || '').trim().slice(0, 500);
  const time = parseToday(body.time, new Date());
  if (!time) return { ok: false, error: 'The time must be today' };

  return withLock(() => {
    const row = today().find((r) => r.name === name);
    if (!row) return { ok: false, error: name + ' is not logged today' };
    const sh = sheet();
    sh.getRange(row.row, COL.time).setValue(time);
    sh.getRange(row.row, COL.remarks).setValue(remarks);
    sh.getRange(row.row, COL.edited).setValue(new Date());
    return { ok: true, name: name, time: time.toISOString(), remarks: remarks };
  });
}

// null when the PIN is right; otherwise the error response.
function checkPin(pin) {
  const expected = PropertiesService.getScriptProperties().getProperty('LEADER_PIN');
  if (!expected) return { ok: false, error: 'Leader PIN is not set up' };
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('pinFails') || 0);
  if (fails >= MAX_PIN_FAILS) return { ok: false, error: 'locked' };
  if (String(pin || '') === expected) return null;
  cache.put('pinFails', String(fails + 1), LOCKOUT_SECONDS);
  return { ok: false, error: 'pin' };
}

// Today's entries, first log per name, with their sheet row numbers.
function today() {
  const sh = sheet();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const start = Math.max(2, last - SCAN_ROWS + 1);
  const rows = sh.getRange(start, 1, last - start + 1, COL.remarks).getValues();
  const todayKey = day(new Date());
  const seen = {};
  const out = [];
  rows.forEach((r, i) => {
    const loggedAt = r[COL.loggedAt - 1], name = String(r[COL.name - 1]), time = r[COL.time - 1];
    if (!(loggedAt instanceof Date) || day(loggedAt) !== todayKey || seen[name]) return;
    seen[name] = true;
    out.push({
      row: start + i,
      name: name,
      time: (time instanceof Date ? time : loggedAt).toISOString(),
      remarks: String(r[COL.remarks - 1] || ''),
    });
  });
  return out;
}

function parseToday(iso, now) {
  const t = new Date(iso);
  if (isNaN(t.getTime()) || day(t) !== day(now)) return null;
  return t;
}

function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
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
    sh.getRange('F:F').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  } else if (sh.getRange(1, COL.edited).getValue() === '') {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sh.getRange('F:F').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  }
  return sh;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
