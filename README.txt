Virsad Trip Tracker — recreated PWA

Files:
- index.html
- styles.css
- app.js
- manifest.json
- sw.js
- icon-192.png
- icon-512.png

What changed:
- Added a visible Install App button with browser PWA installation support.
- Added Clear Month and Reset All controls with confirmation dialogs.
- Added iPhone/Safari installation guidance.
- Added real PWA icons and updated manifest.
- Refreshed UI with a modern dashboard/hero card, cleaner calendar, responsive mobile layout, and improved modal.
- Kept the existing localStorage key (virsadTripTracker.v1), so existing saved ride data remains compatible.
- Service worker cache bumped to v2.

Deployment:
Upload all files to the same folder on GitHub Pages (or another HTTPS host). The browser's native install prompt appears when PWA install criteria are met.
