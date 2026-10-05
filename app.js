const PRICE = 70;
const STORAGE_KEY = "virsadTripTracker.v1";   // same key: old saved rides still work
const SIZE_KEY = "virsadTextSize";
const TYPES = ["morning", "evening"];
const SHORT = { morning: "AM", evening: "PM" };
const MARK = { taken: "✓", skipped: "✗" };
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
function getRides(date) { return { ...(state[keyFor(date)] || {}) }; }
function setRide(date, type, value) {
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
  document.querySelectorAll(".choice-btn").forEach((b) => {
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
render();
showInstallButton();
