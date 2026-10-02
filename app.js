const PRICE = 100;
const STORAGE_KEY = "virsadTripTracker.v1";

let state = loadState();
let current = new Date();
current.setDate(1);
let selectedDate = null;
let deferredInstallPrompt = null;

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const keyFor = (date) => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;

function loadState(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function monthName(date){ return date.toLocaleString("en-IN",{month:"long",year:"numeric"}); }
function isToday(date){
  const t = new Date();
  return date.getFullYear()===t.getFullYear() && date.getMonth()===t.getMonth() && date.getDate()===t.getDate();
}
function getRides(date){ return state[keyFor(date)] || {morning:false, evening:false}; }
function setRide(date,type,value){
  const key=keyFor(date);
  const rides=getRides(date);
  rides[type]=value;
  if(!rides.morning && !rides.evening) delete state[key];
  else state[key]=rides;
  saveState();
}
function monthStats(){
  let morning=0, evening=0;
  Object.entries(state).forEach(([key,rides])=>{
    const [y,m]=key.split("-").map(Number);
    if(y===current.getFullYear() && m===current.getMonth()+1){
      if(rides.morning) morning++;
      if(rides.evening) evening++;
    }
  });
  return {morning,evening,rides:morning+evening,amount:(morning+evening)*PRICE};
}

function render(){
  $("monthLabel").textContent=monthName(current);
  $("summaryMonth").textContent=monthName(current);

  const calendar=$("calendar");
  calendar.innerHTML="";
  const firstDay=new Date(current.getFullYear(),current.getMonth(),1).getDay();
  const mondayOffset=(firstDay+6)%7;

  for(let i=0;i<mondayOffset;i++){
    const blank=document.createElement("div");
    blank.className="day empty";
    calendar.appendChild(blank);
  }

  const daysInMonth=new Date(current.getFullYear(),current.getMonth()+1,0).getDate();
  for(let d=1;d<=daysInMonth;d++){
    const date=new Date(current.getFullYear(),current.getMonth(),d);
    const rides=getRides(date);
    const day=document.createElement("button");
    day.type="button";
    day.className="day"+(isToday(date)?" today":"");
    day.setAttribute("aria-label",`${date.toDateString()}, ${rides.morning?"morning ride taken":"morning ride missed"}, ${rides.evening?"evening ride taken":"evening ride missed"}`);

    const labels=[];
    if(rides.morning) labels.push(`<span class="pill morning">☀ ₹100</span>`);
    if(rides.evening) labels.push(`<span class="pill evening">☾ ₹100</span>`);
    day.innerHTML=`<span class="day-number">${d}</span><span class="ride-pills">${labels.join("")}</span>`;
    day.addEventListener("click",()=>openModal(date));
    calendar.appendChild(day);
  }

  const s=monthStats();
  $("morningCount").textContent=s.morning;
  $("eveningCount").textContent=s.evening;
  $("totalAmount").textContent=`₹${s.amount.toLocaleString("en-IN")}`;
  $("totalRides").textContent=`${s.rides} ride${s.rides===1?"":"s"}`;
  $("summaryMorning").textContent=s.morning;
  $("summaryEvening").textContent=s.evening;
  $("summaryRides").textContent=s.rides;
  $("summaryAmount").textContent=`₹${s.amount.toLocaleString("en-IN")}`;
  $("heroAmount").textContent=`₹${s.amount.toLocaleString("en-IN")}`;
  $("heroRides").textContent=`${s.rides} ride${s.rides===1?"":"s"}`;
}

function openModal(date){
  selectedDate=new Date(date);
  $("modalTitle").textContent=date.toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
  updateModal();
  $("rideModal").classList.remove("hidden");
}
function closeModal(){ $("rideModal").classList.add("hidden"); selectedDate=null; }
function updateModal(){
  if(!selectedDate) return;
  const rides=getRides(selectedDate);
  $("morningBtn").classList.toggle("active",rides.morning);
  $("morningBtn").classList.toggle("morning-active",rides.morning);
  $("eveningBtn").classList.toggle("active",rides.evening);
  $("eveningBtn").classList.toggle("evening-active",rides.evening);
  $("morningCheck").textContent=rides.morning?"✓":"○";
  $("eveningCheck").textContent=rides.evening?"✓":"○";
}

$("prevMonth").addEventListener("click",()=>{current.setMonth(current.getMonth()-1);render();});
$("nextMonth").addEventListener("click",()=>{current.setMonth(current.getMonth()+1);render();});
$("todayBtn").addEventListener("click",()=>{current=new Date();current.setDate(1);render();});
$("closeModal").addEventListener("click",closeModal);
$("rideModal").addEventListener("click",(e)=>{if(e.target===$("rideModal"))closeModal();});
$("morningBtn").addEventListener("click",()=>{
  if(!selectedDate) return;
  setRide(selectedDate,"morning",!getRides(selectedDate).morning);
  render(); updateModal();
});
$("eveningBtn").addEventListener("click",()=>{
  if(!selectedDate) return;
  setRide(selectedDate,"evening",!getRides(selectedDate).evening);
  render(); updateModal();
});
$("clearMonth").addEventListener("click",()=>{
  const label=monthName(current);
  if(!confirm(`Clear all rides recorded for ${label}?`)) return;
  Object.keys(state).forEach(key=>{
    const [y,m]=key.split("-").map(Number);
    if(y===current.getFullYear() && m===current.getMonth()+1) delete state[key];
  });
  saveState(); render();
});

$("resetAll").addEventListener("click",()=>{
  const confirmed = confirm("Reset ALL recorded rides? This will permanently clear every saved ride on this device.");
  if(!confirmed) return;
  state = {};
  saveState();
  render();
});
document.addEventListener("keydown",(e)=>{if(e.key==="Escape"){closeModal();closeIosHint();}});

/* PWA installation */
function isStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function isIOS(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function showInstallButton(){
  if(!isStandalone()) $("installBtn").classList.remove("hidden");
}
window.addEventListener("beforeinstallprompt",(e)=>{
  e.preventDefault();
  deferredInstallPrompt=e;
  showInstallButton();
});
window.addEventListener("appinstalled",()=>{
  deferredInstallPrompt=null;
  $("installBtn").classList.add("hidden");
});
$("installBtn").addEventListener("click",async()=>{
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt=null;
    $("installBtn").classList.add("hidden");
    return;
  }
  if(isIOS()) $("iosInstallHint").classList.remove("hidden");
});
function closeIosHint(){ $("iosInstallHint").classList.add("hidden"); }
$("closeIosHint").addEventListener("click",closeIosHint);
$("iosHintOk").addEventListener("click",closeIosHint);
$("iosInstallHint").addEventListener("click",(e)=>{if(e.target===$("iosInstallHint"))closeIosHint();});

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.error));
}
render();
showInstallButton();
