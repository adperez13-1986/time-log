# Time Log

Scan a QR code, tap your name, confirm. The time goes into a Google Sheet.

- `index.html` + `names.js`: static page (GitHub Pages)
- `apps-script/Code.gs`: Google Apps Script that appends rows to the Sheet

## Sheet columns (tab "Log")

| Logged at | Name | Time | Time entered by hand | Remarks | Edited by leader |
|---|---|---|---|---|---|
| when the server got it | who | the time being logged (= Logged at, unless entered by hand) | `yes` if entered by hand | optional, e.g. reason for being late | when a leader last changed Time/Remarks |

Attendance is per day (Vienna time). Each name can log once per day.

## Setup (one time)

1. Create a new Google Sheet, e.g. "Time Log".
2. File > Settings > Time zone: (GMT+01:00) Vienna.
3. Extensions > Apps Script. Replace `Code.gs` with `apps-script/Code.gs`. Save.
4. Project Settings (gear) > Time zone: Vienna.
5. Deploy > New deployment > type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Authorize when asked ("Advanced > Go to ... (unsafe)" is expected for your own script).
6. Project Settings (gear) > Script Properties > add `LEADER_PIN` with the leaders' PIN. (Not in the code: the repo is public.)
7. Copy the web app URL (ends in `/exec`) into `TIME_LOG_ENDPOINT` in `names.js`.

When you change `Code.gs` later: Deploy > Manage deployments > edit > Version: New version. That keeps the same URL.

## Leader mode

"Leader" link at the bottom of the page, then the PIN. Leaders can tap anyone already logged today and change their time and remarks. 5 wrong PINs lock leader mode for 15 minutes. Older days: edit the Sheet.

## Names (People tab)

The Sheet's **People** tab (Group | Name) is the list. The script creates it on first use.

- Add someone: new row, Group = their group's name exactly as written (JAM, VIA, TEAM, MAN, SAN; a new name makes a new section), Name as it should show.
- Group names show as headings on the page, in the order they first appear in the tab. Rename a group by changing every cell of it in column A.
- Remove someone: delete the row. Their past log rows stay.
- Rename: change it in People. The script renames them in the Log tab too (one cell at a time; pasting over several cells won't). A name already used by someone else is refused.
- Names must be unique (e.g. "Grace Perez" / "Grace Palomaria").

No redeploy needed; the page picks changes up on next load (within a minute if open). `names.js` is only a fallback if the script is unreachable.
