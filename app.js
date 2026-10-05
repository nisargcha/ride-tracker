const PRICE = 70;
const STORAGE_KEY = "virsadTripTracker.v1";   // same key: old saved rides still work
const SIZE_KEY = "virsadTextSize";
const TYPES = ["morning", "evening"];
const SHORT = { morning: "AM", evening: "PM" };
const MARK = { taken: "✓", skipped: "✗" };
const LABEL = { morning: "Morning", evening: "Evening" };
// Reminder times (24h). Sunday has no entry: no rides, always shown as ✗.
const WEEKDAY = { morning: "10:00", evening: "17:30" };
const SCHEDULE = { 1: WEEKDAY, 2: WEEKDAY, 3: WEEKDAY, 4: WEEKDAY, 5: WEEKDAY,
                   6: { morning: "07:00", evening: "12:00" } };
const REMIND_KEY = "virsadReminders";
const SENT_KEY = "virsadSentReminders";
const SIZES = [
  { name: "Normal", px: 18 },
  { name: "Large", px: 21 },
  { name: "Extra large", px: 24 }
];

let state = loadState();
let current = new Date();
current.setDate(1);
let selectedDate = null;
let deferredInstallPrompt = null;

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const keyFor = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const rupee = (n) => `₹${n.toLocaleString("en-IN")}`;
const plural = (n) => `${n} ride${n === 1 ? "" : "s"}`;

/* ---------- storage ---------- */
// Old data stored true/false. New data stores "taken" / "skipped".
function loadState() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { raw = {}; }
  const out = {};
  Object.entries(raw).forEach(([key, r]) => {
    const rides = {};
    TYPES.forEach((t) => {
      if (r[t] === true || r[t] === "taken") rides[t] = "taken";
      else if (r[t] === "skipped") rides[t] = "skipped";
    });
    if (Object.keys(rides).length) out[key] = rides;
  });
  return out;
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { console.error(e); }
}
const isSunday = (d) => d.getDay() === 0;
function getRides(date) {
  if (isSunday(date)) return { morning: "skipped", evening: "skipped" };
  return { ...(state[keyFor(date)] || {}) };
}
function setRide(date, type, value) {
  if (isSunday(date)) return;
  const key = keyFor(date);
  const rides = getRides(date);
  if (rides[type] === value) delete rides[type];   // tap again to undo
  else rides[type] = value;
  if (Object.keys(rides).length) state[key] = rides;
  else delete state[key];
  saveState();
}

/* ---------- helpers ---------- */
function monthName(d) { return d.toLocaleString("en-IN", { month: "long", year: "numeric" }); }
function isToday(d) {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}
function inCurrentMonth(key) {
  const [y, m] = key.split("-").map(Number);
  return y === current.getFullYear() && m === current.getMonth() + 1;
}
function monthStats() {
  let morning = 0, evening = 0, skipped = 0;
  Object.entries(state).forEach(([key, rides]) => {
    if (!inCurrentMonth(key)) return;
    const [y, m, d] = key.split("-").map(Number);
    if (new Date(y, m - 1, d).getDay() === 0) return;   // Sundays are not counted
    if (rides.morning === "taken") morning++;
    if (rides.evening === "taken") evening++;
    TYPES.forEach((t) => { if (rides[t] === "skipped") skipped++; });
  });
  const rides = morning + evening;
  return { morning, evening, skipped, rides, amount: rides * PRICE };
}

/* ---------- render ---------- */
function render() {
  $("monthLabel").textContent = monthName(current);
  $("summaryMonth").textContent = `Summary for ${monthName(current)}`;

  const cal = $("calendar");
  cal.innerHTML = "";
  const offset = (new Date(current.getFullYear(), current.getMonth(), 1).getDay() + 6) % 7;
  for (let i = 0; i < offset; i++) {
    const blank = document.createElement("div");
    blank.className = "day empty";
    cal.appendChild(blank);
  }

  const days = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const date = new Date(current.getFullYear(), current.getMonth(), d);
    const rides = getRides(date);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day" + (isToday(date) ? " today" : "");

    const spoken = TYPES.map((t) =>
      `${t} ${rides[t] === "taken" ? "ride taken" : rides[t] === "skipped" ? "ride not taken" : "not marked"}`).join(", ");
    btn.setAttribute("aria-label", `${date.toDateString()}${isToday(date) ? " (today)" : ""}, ${spoken}`);

    const pills = TYPES.filter((t) => rides[t])
      .map((t) => `<span class="pill ${rides[t]}">${SHORT[t]} ${MARK[rides[t]]}</span>`).join("");
    btn.innerHTML = `<span class="day-number">${d}</span><span class="pills">${pills}</span>`;
    btn.addEventListener("click", () => openModal(date));
    cal.appendChild(btn);
  }

  const s = monthStats();
  $("morningCount").textContent = s.morning;
  $("eveningCount").textContent = s.evening;
  $("skippedCount").textContent = s.skipped;
  $("summaryMorning").textContent = s.morning;
  $("summaryEvening").textContent = s.evening;
  $("summarySkipped").textContent = s.skipped;
  $("summaryRides").textContent = s.rides;
  $("summaryAmount").textContent = rupee(s.amount);
  $("heroAmount").textContent = rupee(s.amount);
  $("heroRides").textContent = plural(s.rides);
  renderReminder();
}

/* ---------- month navigation (buttons, swipe, arrow keys) ---------- */
function changeMonth(delta) {
  current = new Date(current.getFullYear(), current.getMonth() + delta, 1);
  render();
  const cal = $("calendar");
  cal.classList.remove("slide-next", "slide-prev");
  void cal.offsetWidth;   // restart animation
  cal.classList.add(delta > 0 ? "slide-next" : "slide-prev");
}
$("prevMonth").addEventListener("click", () => changeMonth(-1));
$("nextMonth").addEventListener("click", () => changeMonth(1));
$("todayBtn").addEventListener("click", () => {
  const now = new Date();
  current = new Date(now.getFullYear(), now.getMonth(), 1);
  render();
});

let touchX = 0, touchY = 0;
const card = $("calendarCard");
card.addEventListener("touchstart", (e) => {
  touchX = e.changedTouches[0].clientX;
  touchY = e.changedTouches[0].clientY;
}, { passive: true });
card.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - touchX;
  const dy = e.changedTouches[0].clientY - touchY;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) changeMonth(dx < 0 ? 1 : -1);
}, { passive: true });

/* ---------- day dialog ---------- */
function openModal(date) {
  selectedDate = new Date(date);
  $("modalTitle").textContent = date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  updateModal();
  $("rideModal").classList.remove("hidden");
  $("doneBtn").focus();
}
function closeModal() { $("rideModal").classList.add("hidden"); selectedDate = null; }
function updateModal() {
  if (!selectedDate) return;
  const rides = getRides(selectedDate);
  const sun = isSunday(selectedDate);
  $("modalSub").textContent = sun
    ? "Sunday: no rides. Both are marked ✗ automatically."
    : "Was each ride taken? Tap again to undo.";
  document.querySelectorAll("#rideModal .choice-btn").forEach((b) => {
    b.disabled = sun;
    b.setAttribute("aria-pressed", String(rides[b.dataset.type] === b.dataset.value));
  });
}
document.querySelectorAll(".choice-btn").forEach((b) => {
  b.addEventListener("click", () => {
    if (!selectedDate) return;
    setRide(selectedDate, b.dataset.type, b.dataset.value);
    render();
    updateModal();
  });
});
$("closeModal").addEventListener("click", closeModal);
$("doneBtn").addEventListener("click", closeModal);
$("rideModal").addEventListener("click", (e) => { if (e.target === $("rideModal")) closeModal(); });

/* ---------- clear / reset ---------- */
$("clearMonth").addEventListener("click", () => {
  if (!confirm(`Clear all rides recorded for ${monthName(current)}?`)) return;
  Object.keys(state).forEach((key) => { if (inCurrentMonth(key)) delete state[key]; });
  saveState();
  render();
});
$("resetAll").addEventListener("click", () => {
  if (!confirm("Reset ALL recorded rides? This will permanently clear every saved ride on this device.")) return;
  state = {};
  saveState();
  render();
});

/* ---------- text size ---------- */
let sizeIndex = 0;
try { sizeIndex = Math.min(Math.max(parseInt(localStorage.getItem(SIZE_KEY), 10) || 0, 0), SIZES.length - 1); } catch {}
function applySize() {
  document.documentElement.style.fontSize = SIZES[sizeIndex].px + "px";
  $("sizeBtn").textContent = `Text: ${SIZES[sizeIndex].name}`;
  try { localStorage.setItem(SIZE_KEY, String(sizeIndex)); } catch {}
}
$("sizeBtn").addEventListener("click", () => { sizeIndex = (sizeIndex + 1) % SIZES.length; applySize(); });

/* ---------- reminders ---------- */
const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const fmt12 = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`; };

function dueRides(now = new Date()) {
  const sch = SCHEDULE[now.getDay()];
  if (!sch) return [];
  const mins = now.getHours() * 60 + now.getMinutes();
  const rides = getRides(now);
  return TYPES.filter((t) => !rides[t] && toMin(sch[t]) <= mins);
}
// In-app banner: shows rides whose time has passed today and are still unmarked.
function renderReminder() {
  const box = $("reminder");
  const now = new Date();
  const due = dueRides(now);
  if (!due.length) { box.classList.add("hidden"); box.innerHTML = ""; return; }
  const sch = SCHEDULE[now.getDay()];
  box.innerHTML = "<h2>Please fill in today's rides</h2>" + due.map((t) =>
    `<div class="rem-row"><span><b>${LABEL[t]}</b> ride (${fmt12(sch[t])}) is not marked yet</span>
     <span class="rem-btns"><button type="button" class="rem-btn yes" data-type="${t}" data-value="taken">✓ Taken</button>
     <button type="button" class="rem-btn no" data-type="${t}" data-value="skipped">✗ Not taken</button></span></div>`).join("");
  box.classList.remove("hidden");
}
$("reminder").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-type]");
  if (!b) return;
  setRide(new Date(), b.dataset.type, b.dataset.value);
  render();
});

function remindersOn() {
  try { return localStorage.getItem(REMIND_KEY) === "1" && "Notification" in window && Notification.permission === "granted"; }
  catch { return false; }
}
function notify(title, body, tag) {
  const opts = { body, tag, icon: "icon-192.png", requireInteraction: true };
  const fallback = () => { try { new Notification(title, opts); } catch {} };
  if ("serviceWorker" in navigator) navigator.serviceWorker.ready.then((r) => r.showNotification(title, opts)).catch(fallback);
  else fallback();
}
function tick() {
  const now = new Date();
  renderReminder();
  if (!remindersOn()) return;
  const sch = SCHEDULE[now.getDay()];
  if (!sch) return;
  const mins = now.getHours() * 60 + now.getMinutes();
  const rides = getRides(now);
  let sent = {};
  try { sent = JSON.parse(localStorage.getItem(SENT_KEY)) || {}; } catch {}
  TYPES.forEach((t) => {
    const id = `${keyFor(now)}-${t}`;
    const at = toMin(sch[t]);
    if (rides[t] || sent[id] || mins < at || mins > at + 10) return;   // only near the set time
    sent[id] = 1;
    notify(`${LABEL[t]} ride reminder`, `Time to mark your ${t} ride (${fmt12(sch[t])}). Taken or not taken?`, id);
  });
  const today = keyFor(now);
  Object.keys(sent).forEach((k) => { if (!k.startsWith(today)) delete sent[k]; });
  try { localStorage.setItem(SENT_KEY, JSON.stringify(sent)); } catch {}
}
setInterval(tick, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });

function updateRemindUI() {
  const btn = $("notifyBtn"), st = $("notifyStatus");
  if (!("Notification" in window)) {
    btn.classList.add("hidden");
    st.textContent = "This browser cannot show notifications. Use the phone calendar alarms below.";
  } else if (Notification.permission === "denied") {
    btn.disabled = true;
    st.textContent = "Notifications are blocked. Allow them in your browser's site settings, then reload.";
  } else {
    const on = remindersOn();
    btn.textContent = on ? "Turn notifications off" : "Turn notifications on";
    st.textContent = on ? "Notifications are on." : "Notifications are off.";
  }
}
$("notifyBtn").addEventListener("click", async () => {
  try {
    if (remindersOn()) localStorage.setItem(REMIND_KEY, "0");
    else {
      const p = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (p === "granted") localStorage.setItem(REMIND_KEY, "1");
    }
  } catch {}
  updateRemindUI();
});

// Calendar file: repeating weekly alarms that ring even when the app is closed.
function nextDate(dow) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7));
  return d;
}
function icsTime(d, hhmm) {
  const [h, m] = hhmm.split(":");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${h}${m}00`;
}
function downloadAlarms() {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const events = [];
  const add = (type, hhmm, days, startDow) => events.push([
    "BEGIN:VEVENT", `UID:virsad-${type}-${hhmm.replace(":", "")}-${days.replace(/,/g, "")}@virsadtrips`,
    `DTSTAMP:${stamp}`, `DTSTART:${icsTime(nextDate(startDow), hhmm)}`, "DURATION:PT15M",
    `RRULE:FREQ=WEEKLY;BYDAY=${days}`, `SUMMARY:Virsad Trips: mark your ${type} ride`,
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:Mark your ${type} ride`, "TRIGGER:PT0M", "END:VALARM",
    "END:VEVENT"].join("\r\n"));
  add("morning", SCHEDULE[1].morning, "MO,TU,WE,TH,FR", 1);
  add("evening", SCHEDULE[1].evening, "MO,TU,WE,TH,FR", 1);
  add("morning", SCHEDULE[6].morning, "SA", 6);
  add("evening", SCHEDULE[6].evening, "SA", 6);
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Virsad Trips//EN", "CALSCALE:GREGORIAN",
    ...events, "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "virsad-trip-alarms.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
$("alarmBtn").addEventListener("click", downloadAlarms);

function buildSchedule() {
  const w = SCHEDULE[1], s = SCHEDULE[6];
  $("scheduleList").innerHTML =
    `<div><b>Monday to Friday</b><span>Morning ${fmt12(w.morning)}, Evening ${fmt12(w.evening)}</span></div>
     <div><b>Saturday</b><span>Morning ${fmt12(s.morning)}, Afternoon ${fmt12(s.evening)}</span></div>
     <div><b>Sunday</b><span>No rides, marked ✗ automatically</span></div>`;
}

/* ---------- keyboard ---------- */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeModal(); closeIosHint(); return; }
  const open = !$("rideModal").classList.contains("hidden") || !$("iosInstallHint").classList.contains("hidden");
  if (open) return;
  if (e.key === "ArrowLeft") changeMonth(-1);
  if (e.key === "ArrowRight") changeMonth(1);
});

/* ---------- PWA install ---------- */
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
function showInstallButton() { if (!isStandalone()) $("installBtn").classList.remove("hidden"); }
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  showInstallButton();
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  $("installBtn").classList.add("hidden");
});
$("installBtn").addEventListener("click", async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    $("installBtn").classList.add("hidden");
    return;
  }
  if (isIOS()) $("iosInstallHint").classList.remove("hidden");
});
function closeIosHint() { $("iosInstallHint").classList.add("hidden"); }
$("closeIosHint").addEventListener("click", closeIosHint);
$("iosHintOk").addEventListener("click", closeIosHint);
$("iosInstallHint").addEventListener("click", (e) => { if (e.target === $("iosInstallHint")) closeIosHint(); });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.error));
}

/* ---------- start ---------- */
document.querySelectorAll("[data-price]").forEach((el) => {
  el.textContent = rupee(PRICE * Number(el.dataset.price));
});
applySize();
buildSchedule();
updateRemindUI();
render();
tick();
showInstallButton();
