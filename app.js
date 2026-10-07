// Parameters per movement type: edit here to add or change movements.
const MOVERS = {
  Swoop:     ["enterSpeed","swoopSpeed","diveDelay"],
  StopAndGo: ["enterSpeed","enterDuration","hoverDuration","retreatSpeed"],
  Circular:  ["hSpeed","radius","angularSpeed","startAngle"],
  Lissajous: ["baseSpeedX","ampX","ampY","freq"]
};
// Parameters shared by all movements, placed before the specific ones (0.5 in the example).
const COMMON = ["startPosition"];
// y0: 0 in basso => VIEW_H, 1 in alto => 0
const y0 = VIEW_H * (1 - startPosNorm);
const $ = id => document.getElementById(id);
let state = {id:"", meta:"", duration:"", entities:[]};
let editing = null;
let draftArgs = [];

const blank = () => ({type:"", h:"", on:true, mover:Object.keys(MOVERS)[0], args:[]});
const ser = e => [e.type, e.h, e.on, e.mover, ...e.args].join(",");
function parse(s){
  const p = String(s).split(",").map(x => x.trim());
  return {type:p[0]||"", h:p[1]||"", on:(p[2]||"true").toLowerCase()==="true", mover:p[3]||Object.keys(MOVERS)[0], args:p.slice(4)};
}

function init(){
  $("mover").innerHTML = Object.keys(MOVERS).map(m => `<option>${m}</option>`).join("");
  draftArgs = []; renderArgs(); renderAll();
}

function renderArgs(){
  const m = $("mover").value, names = [...COMMON, ...(MOVERS[m] || [])];
  const n = Math.max(names.length, draftArgs.length);
  $("args").innerHTML = Array.from({length:n}, (_, i) =>
    `<div><label for="a${i}">${names[i] || "extra " + (i+1)}</label><input id="a${i}" type="number" step="any" value="${draftArgs[i] ?? ""}" data-i="${i}"></div>`).join("");
  updatePreview();
}
function readDraft(){
  draftArgs = [...document.querySelectorAll("#args input")].map(i => i.value.trim());
}

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

function loadForm(e){
  $("type").value = e.type; $("h").value = e.h; $("on").checked = e.on; $("mover").value = e.mover;
  if(!MOVERS[e.mover]) $("mover").insertAdjacentHTML("beforeend", `<option>${e.mover}</option>`), $("mover").value = e.mover;
  draftArgs = e.args.slice(); renderArgs();
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
  $("h").value = "";
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
function renderOut(){
  $("out").textContent = JSON.stringify(toJSON(), null, 4);
  const types = [...new Set(state.entities.map(e => e.type))];
  $("types").innerHTML = types.map(t => `<option value="${esc(t)}">`).join("");
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
$("file").onchange = ev => {
  const f = ev.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = () => {
    try{
      let d = JSON.parse(r.result);
      if(Array.isArray(d)) d = d[0];
      if(!d || !Array.isArray(d.entities)) throw new Error("Missing entities array.");
      state = {id:String(d.id ?? ""), meta:String(d.meta ?? ""), duration:String(d.duration ?? ""), entities:d.entities.map(parse)};
      $("id").value = state.id; $("meta").value = state.meta; $("dur").value = state.duration;
      stopEdit(); renderAll();
    }catch(e){ alert("Invalid file: " + e.message); }
    $("file").value = "";
  };
  r.readAsText(f);
};
$("reset").onclick = () => {
  if(state.entities.length && !confirm("Discard the current work?")) return;
  state = {id:"", meta:"", duration:"", entities:[]};
  $("id").value = $("meta").value = $("dur").value = "";
  stopEdit(); renderAll();
};
// ---------- Movement preview (Lissajous) ----------
// Assumptions: visible area is VIEW_W x VIEW_H, the entity starts on the right edge at mid height.
const VIEW_W = 800, VIEW_H = 450, DT = 1/60, T_MAX = 20, PAUSE = 0.8;
const cv = $("pv"), ctx = cv.getContext("2d");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  const activeEntities = state.entities.filter(e => e.on && e.mover === "Lissajous");
  if (!activeEntities.length) {
    waveTrajectories = [];
    note.textContent = "Nessuna entità Lissajous abilitata nella wave.";
    return;
  }

  waveTrajectories = activeEntities
    .map(computeLissajousTrajectory)
    .filter(Boolean);

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
  if ($("mover").value !== "Lissajous") {
    note.textContent = "La preview è disponibile solo per Lissajous.";
    return;
  }
  readDraft();
  const currentDraft = {
    type: $("type").value,
    h: $("h").value,
    args: draftArgs
  };
  const tr = computeLissajousTrajectory(currentDraft);
  if (!tr) {
    note.textContent = "Compila i parametri (startPosition 0..1, velocità, ampiezze, freq) per vedere la preview.";
    return;
  }
  pv = tr;
  const left = tr.tEnd >= T_MAX - DT;
  note.textContent = left 
    ? `L'entità non esce dallo schermo entro ${T_MAX} s.` 
    : `Attraversa lo schermo in circa ${tr.tEnd.toFixed(1)} s (spawn delay: ${tr.delay} s).`;
}

function frame(now) {
  const css = getComputedStyle(document.documentElement);
  const k = cv.width / VIEW_W;
  ctx.clearRect(0, 0, cv.width, cv.height);

  // Griglia / linea di mezzo di riferimento
  ctx.strokeStyle = css.getPropertyValue("--line");
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, cv.height / 2);
  ctx.lineTo(cv.width, cv.height / 2);
  ctx.stroke();

  if (previewMode === "single" && pv && pv.pts.length) {
    const span = pv.tEnd + PAUSE;
    const t = reduceMotion ? pv.tEnd : Math.min(((now - t0) / 1000) % span, pv.tEnd);
    const n = Math.max(0, Math.min(pv.pts.length - 1, Math.round(t / DT)));

    // Traiettoria intera
    ctx.lineWidth = 2;
    ctx.strokeStyle = css.getPropertyValue("--line");
    ctx.beginPath();
    pv.pts.forEach((p, i) => i ? ctx.lineTo(p[0] * k, p[1] * k) : ctx.moveTo(p[0] * k, p[1] * k));
    ctx.stroke();

    // Traiettoria percorsa
    ctx.strokeStyle = css.getPropertyValue("--acc");
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const p = pv.pts[i];
      i ? ctx.lineTo(p[0] * k, p[1] * k) : ctx.moveTo(p[0] * k, p[1] * k);
    }
    ctx.stroke();

    // Entità (pallino)
    const p = pv.pts[n];
    if (p) {
      ctx.fillStyle = css.getPropertyValue("--acc");
      ctx.beginPath();
      ctx.arc(p[0] * k, p[1] * k, 8 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = css.getPropertyValue("--mute");
      ctx.font = `${14 * k}px sans-serif`;
      ctx.fillText(`t = ${(n * DT).toFixed(1)} s`, 10 * k, 20 * k);
    }
  } else if (previewMode === "wave" && waveTrajectories.length) {
    const cycle = waveMaxDuration + PAUSE;
    const elapsed = ((now - t0) / 1000) % cycle;

    waveTrajectories.forEach((tr, idx) => {
      // Traiettoria semi-trasparente
      ctx.strokeStyle = css.getPropertyValue("--line");
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      tr.pts.forEach((p, i) => i ? ctx.lineTo(p[0] * k, p[1] * k) : ctx.moveTo(p[0] * k, p[1] * k));
      ctx.stroke();

      // L'entità è attiva solo se elapsed >= delay e tRelativo <= tEnd
      if (elapsed >= tr.delay && (elapsed - tr.delay) <= tr.tEnd) {
        const tRel = elapsed - tr.delay;
        const n = Math.max(0, Math.min(tr.pts.length - 1, Math.round(tRel / DT)));
        const p = tr.pts[n];
        if (p) {
          ctx.fillStyle = css.getPropertyValue("--acc");
          ctx.beginPath();
          ctx.arc(p[0] * k, p[1] * k, 7 * k, 0, Math.PI * 2);
          ctx.fill();

          // Label tipo sopra l'entità
          ctx.fillStyle = css.getPropertyValue("--mute");
          ctx.font = `${11 * k}px sans-serif`;
          ctx.fillText(tr.type, p[0] * k + 10 * k, p[1] * k - 5 * k);
        }
      }
    });

    ctx.fillStyle = css.getPropertyValue("--mute");
    ctx.font = `${14 * k}px sans-serif`;
    ctx.fillText(`Wave t = ${elapsed.toFixed(1)} s`, 10 * k, 20 * k);
  }

  requestAnimationFrame(frame);
}

// Chiama renderAll e avvia il loop
init();
updatePreview();
requestAnimationFrame(frame);