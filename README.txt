Virsad Trip Tracker - PWA

Files: index.html, styles.css, app.js, manifest.json, sw.js, icon-192.png, icon-512.png

Changes in this version:
- Ride price is now Rs. 70 (change PRICE at the top of app.js; all labels update automatically).
- Each ride can be marked Taken (tick) or Not taken (cross). Tap again to undo.
- Month navigation: big Previous/Next buttons, swipe left/right on the calendar, and arrow keys.
- Easier to read: larger text, high-contrast calm colours, big touch targets, and a
  "Text" button that switches between Normal / Large / Extra large (remembered on the device).
- Colours are never the only signal: AM/PM labels plus tick/cross marks.
- Old saved data (virsadTripTracker.v1) is converted automatically.
- Service worker cache bumped to v4 so phones pick up the update.

Deployment: upload all files to the same folder on GitHub Pages (or any HTTPS host).

Update 2 - Reminders:
- Reminder times: Mon-Fri 10:00 AM and 5:30 PM; Saturday 7:00 AM and 12:00 PM. Edit SCHEDULE at the top of app.js.
- Sundays have no rides: both rides always show as cross and cannot be changed (not counted in totals).
- When a ride time has passed and it is unmarked, a banner at the top lets you tap Taken / Not taken.
- Optional notifications (button in Reminders section) while the app is open or running in the background.
- "Add alarms to phone calendar" downloads a .ics file with repeating weekly alarms; open it once on the phone.
- Service worker cache bumped to v5.
