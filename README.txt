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
