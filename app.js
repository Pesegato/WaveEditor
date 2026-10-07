// Parameters per movement type: edit here to add or change movements.
const MOVERS = {
  Swoop:     ["enterSpeed","swoopSpeed","diveDelay","diveDuration"],
  StopAndGo: ["enterSpeed","enterDuration","hoverDuration","retreatSpeed"],
  Circular:  ["hSpeed","radius","angularSpeed","startAngle"],
  Lissajous: ["baseSpeedX","ampX","ampY","freq"]
};
// Parameters shared by all movements, placed before the specific ones (0.5 in the example).
const COMMON = ["startPosition"];
const $ = id => document.getElementById(id);
let state = {id:"", meta:"", duration:"", entities:[]};
let editing = null;
let draftArgs = [];

const blank = () => ({ type: ENTITY_TYPES[0], h: "0", on: true, mover: Object.keys(MOVERS)[0], args: ["0.5"] });
const ser = e => [e.type, e.h, e.on, e.mover, ...e.args].join(",");
function parse(s){
  const p = String(s).split(",").map(x => x.trim());
  return {type:p[0]||"", h:p[1]||"", on:(p[2]||"true").toLowerCase()==="true", mover:p[3]||Object.keys(MOVERS)[0], args:p.slice(4)};
}

const DEFAULT_ENTITY_TYPES = [
  "Slug_soldier", "SmartSlug", "Slug_shell", "Slug_redshell",
  "Slug_captain", "Slug_general", "BOSS1GREEN", "BOSS1YELLOW",
  "BOSS1RED", "Pignata_NORMAL", "Pignata_CYAN", "Pignata_RED",
  "Pignata_PURPLE", "Headcrab", "Slug_egg"
];

function loadEntityTypes() {
  try {
    const raw = localStorage.getItem("shmup_entity_types");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch(e) {
    console.warn("Impossibile caricare tipi da localStorage:", e);
  }
  return DEFAULT_ENTITY_TYPES;
}

let ENTITY_TYPES = loadEntityTypes();

// Ascolta in tempo reale se EntityEditor aggiorna la lista mentre WaveEditor è aperto
window.addEventListener("storage", ev => {
  if (ev.key === "shmup_entity_types") {
    ENTITY_TYPES = loadEntityTypes();
    $("type").innerHTML = ENTITY_TYPES.map(t => `<option value="${t}">${t}</option>`).join("");
  }
});


function init() {
  $("type").innerHTML = ENTITY_TYPES.map(t => `<option value="${t}">${t}</option>`).join("");
  $("mover").innerHTML = Object.keys(MOVERS).map(m => `<option>${m}</option>`).join("");
  $("h").value = "0";
  draftArgs = ["0.5"];
  renderArgs();
  renderAll();
}

function renderArgs(){
  const m = $("mover").value, names = [...COMMON, ...(MOVERS[m] || [])];
  const n = Math.max(names.length, draftArgs.length);
  $("args").innerHTML = Array.from({length:n}, (_, i) => {
    const isStartPos = (i === 0 && names[i] === "startPosition");
    const val = draftArgs[i] ?? (isStartPos ? "0.5" : "");
    const attrs = isStartPos 
      ? `min="0" max="1" step="0.1"` 
      : `step="any"`;
    return `<div><label for="a${i}">${names[i] || "extra " + (i+1)}</label><input id="a${i}" type="number" ${attrs} value="${val}" data-i="${i}"></div>`;
  }).join("");
  updatePreview();
}

function readDraft(){
  draftArgs = [...document.querySelectorAll("#args input")].map(i => i.value.trim());
}

$("type").addEventListener("change", () => { updatePreview(); });
$("mover").addEventListener("change", () => { readDraft(); renderArgs(); });
$("args").addEventListener("input", () => { readDraft(); updatePreview(); });

function formEntity(){
  readDraft();
  return {type:$("type").value.trim(), h:$("h").value.trim(), on:$("on").checked, mover:$("mover").value, args:draftArgs.slice()};
}
function validate(e){
  if(!e.type) return "Enter the type.";
  if(/[,"]/.test(e.type)) return "The type cannot contain commas or quotes.";
  if(e.h==="") return "Enter H.";
  const need = COMMON.length + (MOVERS[e.mover]||[]).length;
  for(let i=0;i<Math.max(need,e.args.length);i++) if(e.args[i]===undefined||e.args[i]==="") return "Fill in all parameters.";
  return "";
}

$("save").onclick = () => {
  const e = formEntity(), er = validate(e);
  $("err").textContent = er;
  if(er) return;
  if(editing===null) state.entities.push(e); else state.entities[editing] = e;
  stopEdit(); renderAll();
};
$("cancel").onclick = () => { stopEdit(); };

function loadForm(e) {
  if (!ENTITY_TYPES.includes(e.type) && e.type) {
    $("type").insertAdjacentHTML("beforeend", `<option value="${esc(e.type)}">${esc(e.type)}</option>`);
  }
  $("type").value = e.type || ENTITY_TYPES[0];
  $("h").value = e.h;
  $("on").checked = e.on;
  $("mover").value = e.mover;
  if (!MOVERS[e.mover]) $("mover").insertAdjacentHTML("beforeend", `<option>${e.mover}</option>`), $("mover").value = e.mover;
  draftArgs = e.args.slice();
  renderArgs();
}

function startEdit(i){
  editing = i; loadForm(state.entities[i]);
  $("edTitle").textContent = `Edit entity ${i+1}`;
  $("save").textContent = "Save changes"; $("cancel").hidden = false;
  $("err").textContent = ""; renderList();
  $("type").scrollIntoView({block:"center", behavior:"smooth"});
}

function stopEdit(){
  editing = null;
  const keep = {type:$("type").value, mover:$("mover").value};
  loadForm({...blank(), mover:keep.mover, type:keep.type});
  $("h").value = "0";
  $("edTitle").textContent = "New entity";
  $("save").textContent = "Add"; $("cancel").hidden = true; $("err").textContent = "";
  renderList();
}

function renderList(){
  const L = state.entities;
  $("count").textContent = L.length;
  $("list").innerHTML = L.length ? L.map((e,i) => `
    <div class="ent ${i===editing?"sel":""} ${e.on?"":"off"}">
      <div class="t"><b>${esc(e.type)}</b> <span>H ${esc(e.h)} · ${esc(e.mover)} · ${e.args.map(esc).join(", ")}${e.on?"":" · disabled"}</span></div>
      <button class="sm" data-a="up" data-i="${i}" title="Up" ${i===0?"disabled":""}>▲</button>
      <button class="sm" data-a="dn" data-i="${i}" title="Down" ${i===L.length-1?"disabled":""}>▼</button>
      <button class="sm" data-a="ed" data-i="${i}">Edit</button>
      <button class="sm" data-a="dup" data-i="${i}">Duplicate</button>
      <button class="sm del" data-a="rm" data-i="${i}">Delete</button>
    </div>`).join("") : `<div class="empty">No entities yet. Fill in the form above and press Add.</div>`;
}
$("list").addEventListener("click", ev => {
  const b = ev.target.closest("button"); if(!b) return;
  const i = +b.dataset.i, L = state.entities;
  switch(b.dataset.a){
    case "ed": return startEdit(i);
    case "dup": L.splice(i+1,0,{...L[i],args:L[i].args.slice()}); break;
    case "rm": L.splice(i,1); if(editing===i) stopEdit(); else if(editing>i) editing--; break;
    case "up": [L[i-1],L[i]]=[L[i],L[i-1]]; if(editing===i) editing--; else if(editing===i-1) editing++; break;
    case "dn": [L[i+1],L[i]]=[L[i],L[i+1]]; if(editing===i) editing++; else if(editing===i+1) editing--; break;
  }
  renderAll();
});

function esc(s){ return String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }

function toJSON(){
  return {id:state.id, meta:state.meta, duration:String(state.duration), entities:state.entities.map(ser)};
}
function renderOut() {
  $("out").textContent = JSON.stringify(toJSON(), null, 4);
}
function renderAll(){ renderList(); renderOut(); }

["id","meta","dur"].forEach(k => $(k).addEventListener("input", () => {
  state.id = $("id").value; state.meta = $("meta").value; state.duration = $("dur").value; renderOut();
}));

$("down").onclick = () => {
  const blob = new Blob([JSON.stringify(toJSON(), null, 4)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (state.id.trim() || "level") + ".json";
  a.click(); URL.revokeObjectURL(a.href);
};
$("copy").onclick = () => navigator.clipboard?.writeText($("out").textContent);
$("up").onclick = () => $("file").click();
function loadFile(f) {
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      let d = JSON.parse(r.result);
      if (Array.isArray(d)) d = d[0];
      if (!d || !Array.isArray(d.entities)) throw new Error("Missing entities array.");
      state = {
        id: String(d.id ?? ""),
        meta: String(d.meta ?? ""),
        duration: String(d.duration ?? ""),
        entities: d.entities.map(parse)
      };
      $("id").value = state.id;
      $("meta").value = state.meta;
      $("dur").value = state.duration;
      stopEdit();
      renderAll();
      if (previewMode === "wave") updateWavePreview();
    } catch(e) {
      alert("Invalid file: " + e.message);
    }
    $("file").value = "";
  };
  r.readAsText(f);
}

$("up").onclick = () => $("file").click();
$("file").onchange = ev => loadFile(ev.target.files[0]);
$("btnSendLevel").onclick = sendWaveToLevelEditor;

// ---------- Drag & Drop JSON ----------
window.addEventListener("dragover", ev => {
  ev.preventDefault();
  ev.dataTransfer.dropEffect = "copy";
  document.body.classList.add("drag-over");
});

window.addEventListener("dragleave", ev => {
  if (ev.relatedTarget === null) {
    document.body.classList.remove("drag-over");
  }
});

window.addEventListener("drop", ev => {
  ev.preventDefault();
  document.body.classList.remove("drag-over");
  const f = ev.dataTransfer.files[0];
  if (f) loadFile(f);
});
$("reset").onclick = () => {
  if(state.entities.length && !confirm("Discard the current work?")) return;
  state = {id:"", meta:"", duration:"", entities:[]};
  $("id").value = $("meta").value = $("dur").value = "";
  stopEdit(); renderAll();
};
// ---------- Movement preview (Lissajous) ----------
// Assumptions: visible area is VIEW_W x VIEW_H, the entity starts on the right edge at mid height.
// Risoluzione logica reale del gioco (Full HD)
const VIEW_W = 1920, VIEW_H = 1080, DT = 1/60, T_MAX = 20, PAUSE = 0.8;
const cv = $("pv"), ctx = cv.getContext("2d");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

function computeSwoopTrajectory(entity) {
  const delay = parseFloat(entity.h) || 0;
  const startYNorm = parseFloat(entity.args[0]);
  const normY = isNaN(startYNorm) ? 0.5 : Math.max(0, Math.min(1, startYNorm));
  const y0 = VIEW_H * (1 - normY);

  const specificArgs = entity.args.slice(COMMON.length).map(parseFloat);
  if (specificArgs.length < 3 || isNaN(specificArgs[0]) || isNaN(specificArgs[1]) || isNaN(specificArgs[2])) {
    return null;
  }

  const enterSpeed = -Math.abs(specificArgs[0]);
  const swoopSpeed = Math.abs(specificArgs[1]);
  const diveDelay = specificArgs[2];
  const diveDuration = (!isNaN(specificArgs[3]) && specificArgs[3] > 0) ? specificArgs[3] : 1.2;

  let x = VIEW_W;
  let y = y0;
  const pts = [[x, y]];
  let tEnd = 0;

  for (let t = DT; t <= T_MAX; t += DT) {
    let vx = 0;
    let vy = 0;

    if (t < diveDelay) {
      vx = enterSpeed;
      vy = 0;
    } else if (t < diveDelay + diveDuration) {
      const diveProgress = (t - diveDelay) / diveDuration;
      const sinFactor = Math.sin(diveProgress * Math.PI);
      vx = enterSpeed - (sinFactor * swoopSpeed * 0.5);
      // Nel canvas y cresce verso il basso, quindi il tuffo verso il basso incrementa y (+vy)
      vy = sinFactor * swoopSpeed;
    } else {
      vx = enterSpeed * 1.5;
      vy = 0;
    }

    x += vx * DT;
    y += vy * DT;
    pts.push([x, y]);
    tEnd = t;

    if (pts.length > 1 && x < -50) break;
  }

  return {
    type: entity.type || "Entity",
    delay,
    tEnd,
    totalSpan: delay + tEnd,
    pts
  };
}

function computeStopAndGoTrajectory(entity) {
  const delay = parseFloat(entity.h) || 0;
  const startYNorm = parseFloat(entity.args[0]);
  const normY = isNaN(startYNorm) ? 0.5 : Math.max(0, Math.min(1, startYNorm));
  const y0 = VIEW_H * (1 - normY);

  const specificArgs = entity.args.slice(COMMON.length).map(parseFloat);
  if (specificArgs.length < 4 || specificArgs.some(isNaN)) {
    return null;
  }

  const enterSpeed = -Math.abs(specificArgs[0]);
  const enterDuration = Math.max(0.01, specificArgs[1]);
  const hoverDuration = Math.max(0, specificArgs[2]);
  const retreatSpeed = specificArgs[3];

  let x = VIEW_W;
  let y = y0;
  const pts = [[x, y]];
  let tEnd = 0;

  let currentPhase = "ENTER";
  let phaseTimer = 0;
  let bobbingTimer = 0;

  for (let t = DT; t <= T_MAX; t += DT) {
    phaseTimer += DT;
    let vx = 0;
    let vy = 0;

    switch (currentPhase) {
      case "ENTER": {
        const tEnter = Math.min(1.0, phaseTimer / enterDuration);
        vx = enterSpeed * (1.0 - tEnter);
        vy = 0;
        if (phaseTimer >= enterDuration) {
          currentPhase = "HOVER";
          phaseTimer = 0;
        }
        break;
      }
      case "HOVER": {
        bobbingTimer += DT * 4.0;
        vx = 0;
        // In Java vy è positivo verso l'alto; nel canvas verso il basso, invertiamo il segno
        vy = -Math.cos(bobbingTimer) * 40.0;
        if (phaseTimer >= hoverDuration) {
          currentPhase = "RETREAT";
          phaseTimer = 0;
        }
        break;
      }
      case "RETREAT": {
        const tRetreat = Math.min(1.0, phaseTimer * 2.0);
        vx = -retreatSpeed * tRetreat;
        vy = 0;
        break;
      }
    }

    x += vx * DT;
    y += vy * DT;
    pts.push([x, y]);
    tEnd = t;

    // Se l'entità è in fase RETREAT ed esce dallo schermo a sinistra o a destra
    if (currentPhase === "RETREAT" && (x < -50 || x > VIEW_W + 50)) {
      break;
    }
  }

  return {
    type: entity.type || "Entity",
    delay,
    tEnd,
    totalSpan: delay + tEnd,
    pts
  };
}

function computeCircularTrajectory(entity) {
  const delay = parseFloat(entity.h) || 0;
  const startYNorm = parseFloat(entity.args[0]);
  const normY = isNaN(startYNorm) ? 0.5 : Math.max(0, Math.min(1, startYNorm));
  const y0 = VIEW_H * (1 - normY);

  const specificArgs = entity.args.slice(COMMON.length).map(parseFloat);
  if (specificArgs.length < 4 || specificArgs.some(isNaN)) {
    return null;
  }

  const hSpeed = -Math.abs(specificArgs[0]);
  const radius = specificArgs[1];
  const angularSpeed = specificArgs[2];
  let angle = specificArgs[3];

  let x = VIEW_W;
  let y = y0;
  const pts = [[x, y]];
  let tEnd = 0;

  for (let t = DT; t <= T_MAX; t += DT) {
    angle += angularSpeed * DT;

    const vxCircle = -Math.sin(angle) * (radius * angularSpeed);
    const vyCircle = Math.cos(angle) * (radius * angularSpeed);

    const vx = hSpeed + vxCircle;
    // Invertito di segno per l'asse Y del canvas (y va verso il basso)
    const vy = -vyCircle;

    x += vx * DT;
    y += vy * DT;
    pts.push([x, y]);
    tEnd = t;

    if (pts.length > 1 && x < -Math.abs(radius) - 50) break;
  }

  return {
    type: entity.type || "Entity",
    delay,
    tEnd,
    totalSpan: delay + tEnd,
    pts
  };
}

// Funzione generica per calcolare la traiettoria di qualsiasi mover supportato
function computeTrajectory(entity) {
  if (entity.mover === "Lissajous") return computeLissajousTrajectory(entity);
  if (entity.mover === "Swoop") return computeSwoopTrajectory(entity);
  if (entity.mover === "StopAndGo") return computeStopAndGoTrajectory(entity);
  if (entity.mover === "Circular") return computeCircularTrajectory(entity);
  return null;
}

function computeLissajousTrajectory(entity) {
  const delay = parseFloat(entity.h) || 0;
  const startYNorm = parseFloat(entity.args[0]);
  const normY = isNaN(startYNorm) ? 0.5 : Math.max(0, Math.min(1, startYNorm));
  const y0 = VIEW_H * (1 - normY);

  const specificArgs = entity.args.slice(COMMON.length).map(parseFloat);
  if (specificArgs.length < 4 || specificArgs.some(isNaN)) return null;

  const bx = -Math.abs(specificArgs[0]);
  const ax = specificArgs[1];
  const ay = specificArgs[2];
  const f = specificArgs[3];

  const pos = t => [
    VIEW_W + bx * t + ax * Math.sin(f * t),
    y0 + ay * Math.sin(2 * f * t)
  ];

  const pts = [];
  let tEnd = 0;
  for (let t = 0; t <= T_MAX; t += DT) {
    const p = pos(t);
    pts.push(p);
    tEnd = t;
    if (pts.length > 1 && p[0] < -Math.abs(ax) - 20) break;
  }

  return {
    type: entity.type || "Entity",
    delay,
    tEnd,
    totalSpan: delay + tEnd,
    pts
  };
}

let previewMode = "single"; // "single" o "wave"
let waveTrajectories = [];
let waveMaxDuration = 0;
let pv = null, t0 = performance.now();

$("btnSimWave").onclick = () => {
  previewMode = "wave";
  $("btnSimWave").classList.add("pri");
  $("btnSimEntity").classList.remove("pri");
  updateWavePreview();
};

$("btnSimEntity").onclick = () => {
  previewMode = "single";
  $("btnSimEntity").classList.add("pri");
  $("btnSimWave").classList.remove("pri");
  updatePreview();
};

function updateWavePreview() {
  t0 = performance.now();
  const note = $("pvNote");
  const activeEntities = state.entities.filter(e => e.on);
  if (!activeEntities.length) {
    waveTrajectories = [];
    note.textContent = "Nessuna entità abilitata nella wave.";
    return;
  }

  waveTrajectories = activeEntities
    .map(computeTrajectory)
    .filter(Boolean);

  if (!waveTrajectories.length) {
    note.textContent = "Nessuna traiettoria valida calcolata (controlla i parametri delle entità).";
    return;
  }

  waveMaxDuration = Math.max(0, ...waveTrajectories.map(tr => tr.totalSpan));
  const totalWaveDur = parseFloat(state.duration) || waveMaxDuration;
  note.textContent = `Simulazione wave: ${waveTrajectories.length} entità simulate (durata: ${waveMaxDuration.toFixed(1)}s, wave dur: ${totalWaveDur}s).`;
}

function updatePreview() {
  if (previewMode === "wave") {
    updateWavePreview();
    return;
  }
  const note = $("pvNote");
  pv = null; 
  t0 = performance.now();
  readDraft();
  const currentDraft = {
    type: $("type").value,
    h: $("h").value,
    mover: $("mover").value,
    args: draftArgs
  };
  const tr = computeTrajectory(currentDraft);
  if (!tr) {
    note.textContent = "Fill all required fields to see the preview.";
    return;
  }
  pv = tr;
  const left = tr.tEnd >= T_MAX - DT;
  note.textContent = left 
    ? `The entity does not exit the screen within ${T_MAX} s.` 
    : `Traverses the screen in approximately ${tr.tEnd.toFixed(1)} s (spawn delay: ${tr.delay} s).`;
}

function frame(now) {
  const css = getComputedStyle(document.documentElement);
  const k = cv.width / VIEW_W;
  ctx.clearRect(0, 0, cv.width, cv.height);

  const enemyColor = css.getPropertyValue("--enemy").trim() || "#4be817";
  const lineColor = css.getPropertyValue("--line").trim() || "#3b2059";
  const muteColor = css.getPropertyValue("--mute").trim() || "#a797be";

  // Linea guida di centro schermo
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, cv.height / 2);
  ctx.lineTo(cv.width, cv.height / 2);
  ctx.stroke();

  // Reset glow per le linee generali
  ctx.shadowBlur = 0;

  if (previewMode === "single" && pv && pv.pts.length) {
    const span = pv.tEnd + PAUSE;
    const t = reduceMotion ? pv.tEnd : Math.min(((now - t0) / 1000) % span, pv.tEnd);
    const n = Math.max(0, Math.min(pv.pts.length - 1, Math.round(t / DT)));

    // Traiettoria intera (linea viola sottile di riferimento)
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.strokeStyle = lineColor;
    ctx.beginPath();
    pv.pts.forEach((p, i) => i ? ctx.lineTo(p[0] * k, p[1] * k) : ctx.moveTo(p[0] * k, p[1] * k));
    ctx.stroke();

    // Traiettoria percorsa (verde acido con glow)
    ctx.shadowColor = enemyColor;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = enemyColor;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const p = pv.pts[i];
      if (p) { i ? ctx.lineTo(p[0] * k, p[1] * k) : ctx.moveTo(p[0] * k, p[1] * k); }
    }
    ctx.stroke();

    // Nemico (pallino verde acido brillante)
    const p = pv.pts[n];
    if (p) {
      ctx.fillStyle = enemyColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p[0] * k, p[1] * k, 7, 0, Math.PI * 2);
      ctx.fill();

      // Testo timer
      ctx.shadowBlur = 0;
      ctx.fillStyle = muteColor;
      ctx.font = "13px sans-serif";
      ctx.fillText(`t = ${(n * DT).toFixed(1)} s`, 12, 22);
    }
  } else if (previewMode === "wave" && waveTrajectories.length) {
    const cycle = waveMaxDuration + PAUSE;
    const elapsed = ((now - t0) / 1000) % cycle;

    waveTrajectories.forEach(tr => {
      // Traiettorie intere della wave
      ctx.shadowBlur = 0;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      tr.pts.forEach((p, i) => i ? ctx.lineTo(p[0] * k, p[1] * k) : ctx.moveTo(p[0] * k, p[1] * k));
      ctx.stroke();

      // Nemici attivi
      if (elapsed >= tr.delay && (elapsed - tr.delay) <= tr.tEnd) {
        const tRel = elapsed - tr.delay;
        const n = Math.max(0, Math.min(tr.pts.length - 1, Math.round(tRel / DT)));
        const p = tr.pts[n];
        if (p) {
          // Pallino nemico verde acido
          ctx.shadowColor = enemyColor;
          ctx.shadowBlur = 10;
          ctx.fillStyle = enemyColor;
          ctx.beginPath();
          ctx.arc(p[0] * k, p[1] * k, 6, 0, Math.PI * 2);
          ctx.fill();

          // Label tipo nemico
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#fff";
          ctx.font = "12px sans-serif";
          ctx.fillText(tr.type, p[0] * k + 10, p[1] * k - 6);
        }
      }
    });

    // Timer Wave
    ctx.shadowBlur = 0;
    ctx.fillStyle = muteColor;
    ctx.font = "13px sans-serif";
    ctx.fillText(`Wave t = ${elapsed.toFixed(1)} s`, 12, 22);
  }

  requestAnimationFrame(frame);
}

function sendWaveToLevelEditor() {
  const currentWave = toJSON();
  if (!currentWave.id) {
    alert("Assegna un ID alla wave prima di inviarla.");
    return;
  }

  // Carica le wave già esistenti in memoria
  let waves = [];
  try {
    const raw = localStorage.getItem("shmup_waves");
    if (raw) waves = JSON.parse(raw) || [];
  } catch(e) {}

  // Aggiorna la wave se ha lo stesso ID, altrimenti aggiungila
  const idx = waves.findIndex(w => w.id === currentWave.id);
  if (idx >= 0) {
    waves[idx] = currentWave;
  } else {
    waves.push(currentWave);
  }

  // Salva l'array di wave e l'ultima wave corrente
  localStorage.setItem("shmup_waves", JSON.stringify(waves));
  localStorage.setItem("shmup_last_wave", JSON.stringify(currentWave));

  // Opzionale: chiedi se aprire il LevelEditor
  if (confirm(`Wave "${currentWave.id}" salvata nel pacchetto (${waves.length} wave totali). Vuoi aprire il LevelEditor?`)) {
    window.open("https://pesegato.github.io/LevelEditor/", "_blank");
  }
}

// Chiama renderAll e avvia il loop
init();
updatePreview();
requestAnimationFrame(frame);