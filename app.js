
// --- State & helpers
const S = {
  key(k){ return `vida_${k}`; },
  get(k, fallback){ try{ return JSON.parse(localStorage.getItem(this.key(k))) ?? fallback; }catch{ return fallback; } },
  set(k, v){ localStorage.setItem(this.key(k), JSON.stringify(v)); toast("Guardado"); },
};

let toastTimer=null;
function toast(msg){
  const t = document.querySelector(".toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove("show"), 1500);
}

// --- Router
function show(page){
  document.querySelectorAll(".view").forEach(v=>v.classList.add("hide"));
  document.getElementById(page).classList.remove("hide");
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.querySelector(`.tab[data-target='${page}']`).classList.add("active");
  history.replaceState({}, "", `#${page}`);
}

// --- Init
window.addEventListener("load", ()=>{
  const hash = location.hash?.replace("#","") || "home";
  show(hash);
  if ("serviceWorker" in navigator){ navigator.serviceWorker.register("./sw.js"); }

  initLessons();
  initBitacora();
  initTasks();
  initReminders();
  initFs();
  initRecursos();
});

document.addEventListener("click", (e)=>{
  const tab = e.target.closest(".tab");
  if(tab){
    e.preventDefault();
    show(tab.dataset.target);
  }
});

// ---------- Lessons
function initLessons(){
  [1,2,3,4].forEach(w=>{
    const ns = `lesson_${w}`;
    const data = S.get(ns, { testimonios:"", lugar:"", hora:"" });
    const t = document.getElementById(`testimonios_${w}`);
    const l = document.getElementById(`lugar_${w}`);
    const h = document.getElementById(`hora_${w}`);
    if(t) t.value = data.testimonios;
    if(l) l.value = data.lugar;
    if(h) h.value = data.hora;
    const btn = document.getElementById(`save_${w}`);
    if(btn){
      btn.addEventListener("click", ()=>{
        const payload = { testimonios: t.value, lugar: l.value, hora: h.value };
        S.set(ns, payload);
      });
    }
  });
}

// ---------- Bitácora
const BIT_ITEMS = [
  "Fomento amistad y oración mutua entre los miembros.",
  "Mantengo el enfoque en Aprender (fe, visión, unidad).",
  "Descubro y animo los dones de cada persona.",
  "Delego pequeñas tareas para involucrar a todos.",
  "Transmito que la misión pertenece al equipo, no solo a mí.",
  "Motivo a invitar nuevos amigos y celebro sus esfuerzos.",
  "Acompaño a mi grupo en los entrenamientos de la iglesia.",
  "Oro por crecimiento espiritual y relaciones sanas."
];

function currentWeekKey(){
  const d = new Date();
  const onejan = new Date(d.getFullYear(),0,1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay()+1)/7);
  return `${d.getFullYear()}-W${week}`;
}

function initBitacora(){
  const wrap = document.getElementById("bitacora_checks");
  const weekKey = currentWeekKey();
  const store = S.get("bitacora", {});
  const week = store[weekKey] || BIT_ITEMS.map(()=>({done:false}));
  wrap.innerHTML = "";
  BIT_ITEMS.forEach((label, idx)=>{
    const row = document.createElement("div");
    row.className = "checkrow";
    row.innerHTML = `
      <input type="checkbox" id="b_${idx}" ${week[idx].done ? "checked":""}/>
      <label for="b_${idx}" style="flex:1">${label}</label>`;
    wrap.appendChild(row);
    row.querySelector("input").addEventListener("change", (e)=>{
      week[idx].done = e.target.checked;
      store[weekKey] = week;
      S.set("bitacora", store);
    });
  });

  document.getElementById("bit_note").value = (S.get("bit_notes", {})[weekKey] || "");
  document.getElementById("save_bit").addEventListener("click", ()=>{
    const notes = S.get("bit_notes", {});
    notes[weekKey] = document.getElementById("bit_note").value.trim();
    S.set("bit_notes", notes);
    renderHistory();
  });

  renderHistory();
}

function renderHistory(){
  const hist = document.getElementById("bit_hist");
  const store = S.get("bitacora", {});
  const notes = S.get("bit_notes", {});
  const keys = Object.keys(store).sort().reverse().slice(0,8);
  hist.innerHTML = keys.map(k=>{
    const arr = store[k];
    const pct = Math.round(100 * (arr.filter(x=>x.done).length / arr.length));
    const note = (notes[k]||"").replace(/</g,"&lt;");
    return `<div class="card"><strong>${k}</strong><div class="small">${pct}% completado — ${note||"Sin notas"}</div></div>`;
  }).join("") || `<div class="card small">Sin histórico aún.</div>`;
}

// ---------- Tareas
const DEFAULT_TASKS = [
  "Llamar a los miembros del grupo",
  "Orar por ellos",
  "Asistir a la reunión con su líder",
  "Llenar el libro de formatos",
  "Entregar ofrendas",
  "Asistir al servicio de miércoles",
  "Asistir al servicio de domingo"
];

function initTasks(){
  let tasks = S.get("tasks", null);
  if(!tasks){
    tasks = DEFAULT_TASKS.map(t=>({title:t, done:false}));
    S.set("tasks", tasks);
  }
  renderTasks(tasks);
  document.getElementById("add_task_btn").addEventListener("click", ()=>{
    const v = document.getElementById("add_task").value.trim();
    if(!v) return;
    tasks.push({title:v, done:false});
    S.set("tasks", tasks);
    document.getElementById("add_task").value="";
    renderTasks(tasks);
  });
  document.getElementById("reset_week").addEventListener("click", ()=>{
    tasks.forEach(t=>t.done=false);
    S.set("tasks", tasks);
    renderTasks(tasks);
  });
}
function renderTasks(tasks){
  const wrap = document.getElementById("tasks_list");
  wrap.innerHTML = "";
  tasks.forEach((t, i)=>{
    const row = document.createElement("div");
    row.className = "checkrow";
    row.innerHTML = `
      <input type="checkbox" id="t_${i}" ${t.done?"checked":""}/>
      <label for="t_${i}" style="flex:1">${t.title}</label>
      <button class="btn ghost" data-r="${i}" title="Eliminar">✕</button>`;
    wrap.appendChild(row);
    row.querySelector("input").addEventListener("change", (e)=>{
      t.done = e.target.checked; S.set("tasks", tasks);
    });
    row.querySelector("button").addEventListener("click", ()=>{
      tasks.splice(i,1); S.set("tasks", tasks); renderTasks(tasks);
    });
  });
}

// ---------- Recordatorios
function initReminders(){
  const cfg = S.get("reminders", {
    grupo: { weekday: "3", time: "19:00" },
    miercoles: { time: "19:00" },
    domingo: { time: "10:00" },
    pre: [60,10]
  });

  document.getElementById("r_grupo_day").value = cfg.grupo.weekday;
  document.getElementById("r_grupo_time").value = cfg.grupo.time;
  document.getElementById("r_mie_time").value = cfg.miercoles.time;
  document.getElementById("r_dom_time").value = cfg.domingo.time;
  document.getElementById("r_pre").value = cfg.pre.join(",");

  document.getElementById("save_reminders").addEventListener("click", async ()=>{
    cfg.grupo.weekday = document.getElementById("r_grupo_day").value;
    cfg.grupo.time = document.getElementById("r_grupo_time").value;
    cfg.miercoles.time = document.getElementById("r_mie_time").value;
    cfg.domingo.time = document.getElementById("r_dom_time").value;
    cfg.pre = document.getElementById("r_pre").value.split(",").map(x=>parseInt(x.trim())).filter(x=>!isNaN(x));
    S.set("reminders", cfg);
    if ("Notification" in window){
      const p = await Notification.requestPermission();
      toast(p==="granted" ? "Notificaciones activadas" : "Notificaciones no autorizadas");
    }
  });

  setInterval(()=>checkReminders(), 60000);
  checkReminders();
}
function checkReminders(){
  const cfg = S.get("reminders", null); if(!cfg) return;
  const now = new Date();
  const events = [
    ...nextWeekly(now, parseInt(cfg.grupo.weekday), cfg.grupo.time, cfg.pre, "Reunión de Grupo"),
    ...nextWeekly(now, 3, cfg.miercoles.time, cfg.pre, "Servicio de Miércoles"),
    ...nextWeekly(now, 0, cfg.domingo.time, cfg.pre, "Servicio de Domingo"),
  ];
  events.forEach(ev=>{
    const diffMin = (ev.when - now)/60000;
    if (diffMin <= 0 && diffMin > -1) fireNotification(ev.title, ev.body);
  });
}
function nextWeekly(now, weekday, timeStr, pres, title){
  const [hh,mm] = timeStr.split(":").map(Number);
  let next = new Date(now);
  next.setHours(hh, mm, 0, 0);
  const day = next.getDay();
  let delta = (weekday - day);
  if (delta < 0 || (delta===0 && next <= now)) delta += 7;
  next.setDate(next.getDate() + delta);
  return pres.map(mins=>({ when: new Date(next.getTime() - mins*60000), title, body:`Recordatorio (${mins} min antes)` }));
}
async function fireNotification(title, body){
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (navigator.serviceWorker?.controller){
    navigator.serviceWorker.controller.postMessage({type:"notify", title, body});
  }else{
    new Notification(title, { body });
  }
}

// ---------- Font size
const FS_LEVELS = [1, 1.1, 1.22, 1.35];
function setFs(levelIndex){
  const idx = Math.max(0, Math.min(FS_LEVELS.length-1, levelIndex));
  document.documentElement.style.setProperty("--fs", FS_LEVELS[idx]);
  S.set("fs_idx", idx);
}
function initFs(){
  const idx = S.get("fs_idx", 0);
  setFs(idx);
  document.getElementById("fs_minus").addEventListener("click", ()=> setFs((S.get("fs_idx",0))-1) );
  document.getElementById("fs_plus").addEventListener("click", ()=> setFs((S.get("fs_idx",0))+1) );
}

// ---------- Recursos (audios, descargas, miembros)
function initRecursos(){
  // Audios
  let audios = S.get("audios", []);
  const aWrap = document.getElementById("audio_list");
  const aUrl = document.getElementById("audio_url");
  const aAdd = document.getElementById("audio_add");
  function renderAudios(){
    aWrap.innerHTML = audios.map((u,i)=>`
      <div class="card">
        <audio controls src="${u}" style="width:100%"></audio>
        <div class="small">${u}</div>
        <div><button class="btn ghost" data-i="${i}">Eliminar</button></div>
      </div>`).join("") || `<div class="card small">Sin audios aún.</div>`;
    aWrap.querySelectorAll("button[data-i]").forEach(btn=>{
      btn.addEventListener("click",()=>{ const i = parseInt(btn.dataset.i); audios.splice(i,1); S.set("audios", audios); renderAudios(); });
    });
  }
  aAdd.addEventListener("click", ()=>{
    const u = aUrl.value.trim(); if(!u) return;
    audios.push(u); S.set("audios", audios); aUrl.value=""; renderAudios();
  });
  renderAudios();

  // Descargables
  let files = S.get("files", []);
  const fWrap = document.getElementById("file_list");
  const fTitle = document.getElementById("file_title");
  const fUrl = document.getElementById("file_url");
  const fAdd = document.getElementById("file_add");
  function renderFiles(){
    fWrap.innerHTML = files.map((it,i)=>`
      <div class="checkrow">
        <a href="${it.url}" target="_blank">${it.title}</a>
        <button class="btn ghost" data-i="${i}">✕</button>
      </div>`).join("") || `<div class="card small">Sin materiales aún.</div>`;
    fWrap.querySelectorAll("button[data-i]").forEach(btn=>{
      btn.addEventListener("click",()=>{ const i = parseInt(btn.dataset.i); files.splice(i,1); S.set("files", files); renderFiles(); });
    });
  }
  fAdd.addEventListener("click", ()=>{
    const title = fTitle.value.trim(); const url = fUrl.value.trim();
    if(!title || !url) return;
    files.push({title,url}); S.set("files", files); fTitle.value=""; fUrl.value=""; renderFiles();
  });
  renderFiles();

  // Miembros
  let members = S.get("members", []);
  const mWrap = document.getElementById("members_list");
  const mName = document.getElementById("member_name");
  const mPhone = document.getElementById("member_phone");
  const mAdd = document.getElementById("member_add");
  function renderMembers(){
    mWrap.innerHTML = members.map((m,i)=>`
      <div class="checkrow">
        <div style="flex:1">
          <strong>${m.name}</strong><div class="small">${m.phone||""}</div>
        </div>
        <button class="btn ghost" data-i="${i}">✕</button>
      </div>`).join("") || `<div class="card small">Aún no hay miembros registrados.</div>`;
    mWrap.querySelectorAll("button[data-i]").forEach(btn=>{
      btn.addEventListener("click",()=>{ const i = parseInt(btn.dataset.i); members.splice(i,1); S.set("members", members); renderMembers(); });
    });
  }
  mAdd.addEventListener("click", ()=>{
    const name = mName.value.trim(); const phone = mPhone.value.trim();
    if(!name) return;
    members.push({name, phone}); S.set("members", members); mName.value=""; mPhone.value=""; renderMembers();
  });
  renderMembers();
}
