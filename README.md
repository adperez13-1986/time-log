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

## Names

Edit `names.js`. Renaming someone in past entries: Edit > Find and replace in the Sheet, column B.
