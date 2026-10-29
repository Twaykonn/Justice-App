const canvas = document.getElementById("lienzo");
const ctx = canvas.getContext("2d");
const workspace = document.getElementById("workspace");

let mode = "free";
let narrativa = "";
let dibujando = false;
let freeHistory = [];
let freeHistoryIndex = -1;

let neoColor = "#111111";
let objects = [];
let selectedId = null;
let neoHistory = [];
let neoHistoryIndex = -1;
let dragState = null;
let dimensionEditState = {
  editing:false,
  originalRatio:null
};

const challenges = [
  "Crea una obra usando 3 rectángulos, 2 líneas negras y solo rojo y amarillo.",
  "Construye una composición con equilibrio asimétrico y al menos una gran zona blanca.",
  "Usa solo formas rectangulares y coloca una línea vertical como eje visual.",
  "Crea una composición con rojo, azul y amarillo, dejando espacios blancos visibles.",
  "Diseña una obra que transmita orden mediante líneas verticales y horizontales.",
  "Crea una composición con cinco elementos y diferentes tamaños."
];

function fitCanvas(){
  // Mantiene un sistema de coordenadas estable (1000×700) al cambiar de dispositivo
  // o plegar los paneles; así no se borran ni deforman las creaciones existentes.
  const rect = workspace.getBoundingClientRect();
  const availableW = Math.max(120, rect.width - 12);
  const availableH = Math.max(120, rect.height - 12);
  const scale = Math.min(availableW / 1000, availableH / 700);
  if (canvas.width !== 1000 || canvas.height !== 700) {
    const old = document.createElement("canvas");
    old.width = canvas.width || 1;
    old.height = canvas.height || 1;
    old.getContext("2d").drawImage(canvas, 0, 0);
    canvas.width = 1000;
    canvas.height = 700;
    ctx.drawImage(old, 0, 0, 1000, 700);
  }
  canvas.style.width = Math.floor(1000 * scale) + "px";
  canvas.style.height = Math.floor(700 * scale) + "px";
  redraw();
}
window.addEventListener("resize", fitCanvas);
if ("ResizeObserver" in window) new ResizeObserver(fitCanvas).observe(workspace);
applyResponsiveDefaults();
fitCanvas();

function toggleSidePanel(side){
  const isLeft = side === "left";
  const className = isLeft ? "left-panel-collapsed" : "right-panel-collapsed";
  document.body.classList.toggle(className);
  const button = document.getElementById(isLeft ? "toggleLeftPanel" : "toggleRightPanel");
  const collapsed = document.body.classList.contains(className);
  button.setAttribute("aria-expanded", String(!collapsed));
  button.setAttribute("aria-label", (collapsed ? "Mostrar" : "Ocultar") + (isLeft ? " panel izquierdo" : " panel derecho"));
  button.title = (collapsed ? "Mostrar" : "Ocultar") + (isLeft ? " herramientas de creación" : " herramientas y propiedades");
  button.textContent = isLeft ? (collapsed ? "›" : "‹") : (collapsed ? "‹" : "›");
  // Recalcula el tamaño visual del lienzo después de la transición del layout.
  window.requestAnimationFrame(() => window.requestAnimationFrame(fitCanvas));
}

function applyResponsiveDefaults(){
  // En móviles se inicia con ambos paneles plegados para dar prioridad al lienzo.
  if (window.matchMedia("(max-width: 640px)").matches) {
    document.body.classList.add("left-panel-collapsed", "right-panel-collapsed");
    const left = document.getElementById("toggleLeftPanel");
    const right = document.getElementById("toggleRightPanel");
    left.textContent = "›"; right.textContent = "‹";
    left.setAttribute("aria-expanded", "false"); right.setAttribute("aria-expanded", "false");
    left.setAttribute("aria-label", "Mostrar panel izquierdo"); right.setAttribute("aria-label", "Mostrar panel derecho");
  }
}

function setMode(next){
  mode = next;
  document.getElementById("freeControls").classList.toggle("hidden", next !== "free");
  document.getElementById("neoControls").classList.toggle("hidden", next !== "neo");
  document.getElementById("freeModeBtn").classList.toggle("active", next === "free");
  document.getElementById("neoModeBtn").classList.toggle("active", next === "neo");
  document.getElementById("emptyHint").classList.toggle("hidden", next === "neo" || freeHistoryIndex >= 0);
  updateStatus();
  redraw();
}

function updateStatus(text){
  document.getElementById("statusBar").textContent =
    text || ("Modo: " + (mode === "free" ? "Lienzo libre" : "Composición neoplasticista") +
    " · " + (narrativa ? narrativa + " · " : "") +
    "ODS 16: Paz, justicia e instituciones sólidas.");
}

function cambiarNarrativa(valor) {
  const mensaje = document.getElementById("mensaje");
  if (valor === "paz") {
    narrativa = "Paz";
    mensaje.textContent = "Palabras clave: armonía, diálogo, empatía, cooperación.";
  } else if (valor === "justicia") {
    narrativa = "Justicia";
    mensaje.textContent = "Palabras clave: equidad, verdad, igualdad, dignidad.";
  } else if (valor === "instituciones") {
    narrativa = "Instituciones sólidas";
    mensaje.textContent = "Palabras clave: confianza, democracia, transparencia, solidez.";
  }
  updateStatus();
}

// -------------------- LIENZO LIBRE --------------------
function saveFreeState(){
  const data = ctx.getImageData(0,0,canvas.width,canvas.height);
  freeHistory = freeHistory.slice(0, freeHistoryIndex + 1);
  freeHistory.push(data);
  freeHistoryIndex++;
  document.getElementById("emptyHint").classList.add("hidden");
}
function restoreFreeState(index){
  if(index < 0){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    document.getElementById("emptyHint").classList.remove("hidden");
    return;
  }
  ctx.putImageData(freeHistory[index],0,0);
  document.getElementById("emptyHint").classList.add("hidden");
}
function undoFree(){
  if(freeHistoryIndex >= 0){
    freeHistoryIndex--;
    restoreFreeState(freeHistoryIndex);
  }
}
function redoFree(){
  if(freeHistoryIndex < freeHistory.length-1){
    freeHistoryIndex++;
    restoreFreeState(freeHistoryIndex);
  }
}
function startDrawing(e){
  if(mode !== "free") return;
  dibujando = true;
  const p = getCanvasPoint(e);
  ctx.beginPath();
  ctx.moveTo(p.x,p.y);
}
function stopDrawing(){
  if(!dibujando) return;
  dibujando = false;
  ctx.closePath();
  saveFreeState();
}
function drawFree(e){
  if(!dibujando || mode !== "free") return;
  const p = getCanvasPoint(e);
  ctx.lineWidth = Number(document.getElementById("brushSize").value);
  ctx.lineCap = document.getElementById("brushType").value;
  ctx.lineJoin = "round";
  ctx.strokeStyle = document.getElementById("colorPicker").value;
  ctx.lineTo(p.x,p.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(p.x,p.y);
}
function getCanvasPoint(e){
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX-r.left) * (canvas.width/r.width),
    y: (e.clientY-r.top) * (canvas.height/r.height)
  };
}

// -------------------- RASTRO DE PARTÍCULAS (RATÓN Y PANTALLA TÁCTIL) --------------------
const particleCanvas = document.getElementById("particleCanvas");
const particleCtx = particleCanvas.getContext("2d");
const primaryColors = ["#f2d400", "#e32636", "#2458d3"];
const particles = [];
const particlePointer = { x: 0, y: 0, active: false, type: "mouse" };
let particleLastEmit = 0;
let particleAnimationFrame = 0;
let particleLastFrame = 0;

function syncParticleCanvas(){
  const canvasRect = canvas.getBoundingClientRect();
  const workspaceRect = workspace.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  particleCanvas.style.left = (canvasRect.left - workspaceRect.left) + "px";
  particleCanvas.style.top = (canvasRect.top - workspaceRect.top) + "px";
  particleCanvas.style.width = canvasRect.width + "px";
  particleCanvas.style.height = canvasRect.height + "px";
  const width = Math.max(1, Math.round(canvasRect.width * dpr));
  const height = Math.max(1, Math.round(canvasRect.height * dpr));
  if (particleCanvas.width !== width || particleCanvas.height !== height){
    particleCanvas.width = width;
    particleCanvas.height = height;
  }
  particleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function particlePointFromEvent(e){
  const r = particleCanvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function emitTrailParticle(x, y){
  // Variaciones pequeñas crean un rastro orgánico incluso con el cursor inmóvil.
  particles.push({
    x: x + (Math.random() - 0.5) * 8,
    y: y + (Math.random() - 0.5) * 8,
    vx: (Math.random() - 0.5) * 0.55,
    vy: (Math.random() - 0.5) * 0.55 - 0.12,
    radius: 1.5 + Math.random() * 3.2,
    color: primaryColors[Math.floor(Math.random() * primaryColors.length)],
    life: 0.75 + Math.random() * 0.6,
    maxLife: 1.35,
    gravity: -0.04 + Math.random() * 0.08
  });
}

function createParticleBurst(x, y){
  const count = 28 + Math.floor(Math.random() * 15);
  for(let i = 0; i < count; i++){
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.1 + Math.random() * 4.8;
    const life = 0.55 + Math.random() * 0.65;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 1.8 + Math.random() * 3.4,
      color: primaryColors[Math.floor(Math.random() * primaryColors.length)],
      life, maxLife: life,
      gravity: 0.025 + Math.random() * 0.06
    });
  }
}

function handleParticlePointerMove(e){
  // Ratón: el rastro permanece activo mientras el puntero esté dentro.
  // Táctil/lápiz: solo se mantiene activo durante el contacto.
  if(e.pointerType === "touch" && e.buttons === 0) return;
  const p = particlePointFromEvent(e);
  particlePointer.x = p.x;
  particlePointer.y = p.y;
  particlePointer.type = e.pointerType || "mouse";
  particlePointer.active = true;
}

canvas.addEventListener("pointerenter", e => {
  if(e.pointerType !== "touch") handleParticlePointerMove(e);
});
canvas.addEventListener("pointermove", handleParticlePointerMove);
canvas.addEventListener("pointerdown", e => {
  const p = particlePointFromEvent(e);
  particlePointer.x = p.x;
  particlePointer.y = p.y;
  particlePointer.type = e.pointerType || "mouse";
  particlePointer.active = true;
  createParticleBurst(p.x, p.y);
});
canvas.addEventListener("pointerup", e => {
  if(e.pointerType === "touch" || e.pointerType === "pen") particlePointer.active = false;
});
canvas.addEventListener("pointercancel", () => { particlePointer.active = false; });
canvas.addEventListener("pointerleave", e => {
  if(e.pointerType !== "touch") particlePointer.active = false;
});

function animateParticles(timestamp){
  const rect = particleCanvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const delta = particleLastFrame ? Math.min(2, (timestamp - particleLastFrame) / 16.67) : 1;
  particleLastFrame = timestamp;

  particleCtx.clearRect(0, 0, width, height);
  if(particlePointer.active){
    // Emitir por tiempo, no solo por movimiento: también funciona en reposo.
    if(timestamp - particleLastEmit >= 32){
      emitTrailParticle(particlePointer.x, particlePointer.y);
      if(Math.random() < 0.48) emitTrailParticle(particlePointer.x, particlePointer.y);
      particleLastEmit = timestamp;
    }
  }

  for(let i = particles.length - 1; i >= 0; i--){
    const p = particles[i];
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    p.vy += p.gravity * delta;
    p.vx *= Math.pow(0.985, delta);
    p.life -= 0.016 * delta;
    if(p.life <= 0 || p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20){
      particles.splice(i, 1);
      continue;
    }
    const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    particleCtx.globalAlpha = alpha;
    particleCtx.fillStyle = p.color;
    particleCtx.beginPath();
    particleCtx.arc(p.x, p.y, p.radius * (0.65 + alpha * 0.35), 0, Math.PI * 2);
    particleCtx.fill();
  }
  particleCtx.globalAlpha = 1;

  // Limita la cantidad de partículas en sesiones largas.
  if(particles.length > 650) particles.splice(0, particles.length - 650);
  particleAnimationFrame = window.requestAnimationFrame(animateParticles);
}

window.addEventListener("resize", syncParticleCanvas);
if("ResizeObserver" in window) new ResizeObserver(syncParticleCanvas).observe(workspace);
canvas.addEventListener("pointerdown", startDrawing);
canvas.addEventListener("pointermove", drawFree);
canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointercancel", stopDrawing);
canvas.addEventListener("pointerleave", stopDrawing);

function clearCanvas(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  saveFreeState();
}
function clearAll(){
  if(mode === "free"){
    clearCanvas();
  } else {
    objects = [];
    selectedId = null;
    pushNeoHistory();
    redraw();
    updateProperties();
    renderShapeList();
  }
}

function freeUndoRedoReset(){
  freeHistory = [];
  freeHistoryIndex = -1;
  ctx.clearRect(0,0,canvas.width,canvas.height);
}
freeUndoRedoReset();

// -------------------- NEOPLASTICISMO --------------------
function uid(){ return Math.random().toString(36).slice(2,10); }

function addObject(obj){
  objects.push({...obj, id:uid()});
  selectedId = objects[objects.length-1].id;
  pushNeoHistory();
  redraw();
  renderShapeList();
  updateProperties();
}

function addRectangle(){
  const w = 170, h = 120;
  addObject({
    type:"rect", x:canvas.width/2-w/2, y:canvas.height/2-h/2,
    w,h,color:neoColor,rotation:0
  });
}

function addLine(orientation){
  const x = canvas.width/2;
  const y = canvas.height/2;
  addObject(orientation === "h" ? {
    type:"line", orientation:"h", x:x-150,y,w:300,h:14,color:"#111111",rotation:0
  } : {
    type:"line", orientation:"v", x:x-7,y:y-150,w:14,h:300,color:"#111111",rotation:0
  });
}

function cloneObject(o, dx=20, dy=20){
  return {...o,id:uid(),x:o.x+dx,y:o.y+dy};
}

function duplicateSelected(){
  const o = selectedObject();
  if(!o) return;
  const n = cloneObject(o);
  objects.push(n);
  selectedId = n.id;
  pushNeoHistory();
  redraw(); renderShapeList(); updateProperties();
}

function deleteSelected(){
  if(!selectedId) return;
  objects = objects.filter(o => o.id !== selectedId);
  selectedId = null;
  pushNeoHistory(); redraw(); renderShapeList(); updateProperties();
}

function selectedObject(){
  return objects.find(o=>o.id===selectedId);
}

function setNeoColor(color,btn){
  neoColor = color;
  document.querySelectorAll(".color-btn").forEach(b=>b.classList.remove("selected"));
  btn.classList.add("selected");
  const o = selectedObject();
  if(o){
    o.color = color;
    pushNeoHistory();
    redraw();
    updateProperties();
    renderShapeList();
  }
}

function syncProportionControls(){
  const o = selectedObject();
  const ws = document.getElementById("widthSlider");
  const hs = document.getElementById("heightSlider");
  const wv = document.getElementById("widthValue");
  const hv = document.getElementById("heightValue");
  const ri = document.getElementById("ratioInfo");

  if(!o){
    wv.textContent = "—";
    hv.textContent = "—";
    ri.textContent = "Selecciona un elemento para editar sus proporciones.";
    return;
  }

  ws.value = Math.round(o.w);
  hs.value = Math.round(o.h);
  wv.textContent = Math.round(o.w) + " px";
  hv.textContent = Math.round(o.h) + " px";

  const ratio = o.h > 0 ? o.w / o.h : 1;
  ri.textContent =
    "Relación actual: " + ratio.toFixed(3) +
    " · " + (o.type === "line"
      ? "En líneas puedes ajustar longitud y grosor."
      : "Ancho y alto pueden modificarse por separado.");

  handleDimensionLocks(false);
}

function handleDimensionLocks(){
  const lockW = document.getElementById("lockWidth").checked;
  const lockH = document.getElementById("lockHeight").checked;
  const ws = document.getElementById("widthSlider");
  const hs = document.getElementById("heightSlider");

  ws.disabled = lockW;
  hs.disabled = lockH;

  if(lockW && lockH){
    document.getElementById("ratioInfo").textContent =
      "Ancho y alto están bloqueados. Desbloquea al menos una dimensión para editar.";
  }
}

function toggleAspectLock(){
  const o = selectedObject();
  dimensionEditState.originalRatio = o && o.h > 0 ? o.w / o.h : null;
  handleDimensionLocks();
  syncProportionControls();
}

function previewDimension(axis, rawValue){
  const o = selectedObject();
  if(!o) return;

  if(!dimensionEditState.editing){
    dimensionEditState.editing = true;
    dimensionEditState.originalRatio = o.h > 0 ? o.w / o.h : 1;
  }

  const value = Math.max(6, Number(rawValue) || 6);
  const lockW = document.getElementById("lockWidth").checked;
  const lockH = document.getElementById("lockHeight").checked;
  const lockAspect = document.getElementById("lockAspect").checked;
  const ratio = dimensionEditState.originalRatio || 1;

  if(axis === "width"){
    if(lockW) return;
    o.w = Math.min(1000, value);

    if(lockAspect && !lockH){
      o.h = Math.max(6, Math.min(700, o.w / ratio));
    }
  }else{
    if(lockH) return;
    o.h = Math.min(700, value);

    if(lockAspect && !lockW){
      o.w = Math.max(6, Math.min(1000, o.h * ratio));
    }
  }

  redraw();
  renderShapeList();
  updateProperties(false);
  updateProportionLabels();
}

function updateProportionLabels(){
  const o = selectedObject();
  if(!o) return;

  document.getElementById("widthSlider").value = Math.round(o.w);
  document.getElementById("heightSlider").value = Math.round(o.h);
  document.getElementById("widthValue").textContent = Math.round(o.w) + " px";
  document.getElementById("heightValue").textContent = Math.round(o.h) + " px";

  const ratio = o.h > 0 ? o.w / o.h : 1;
  document.getElementById("ratioInfo").textContent =
    "Relación actual: " + ratio.toFixed(3) +
    " · " + (o.type === "line" ? "línea: longitud y grosor editables." : "rectángulo: ancho y alto editables.");
}

function commitDimensionChange(){
  const o = selectedObject();
  if(!o || !dimensionEditState.editing) return;

  pushNeoHistory();
  dimensionEditState.editing = false;
  dimensionEditState.originalRatio = null;

  redraw();
  renderShapeList();
  updateProperties();
}

function nudgeSelected(dx,dy){
  const o = selectedObject(); if(!o) return;
  o.x += dx; o.y += dy;
  pushNeoHistory(); redraw(); updateProperties();
}
function resizeSelected(sx,sy){
  const o = selectedObject(); if(!o) return;

  const lockW = document.getElementById("lockWidth").checked;
  const lockH = document.getElementById("lockHeight").checked;
  const lockAspect = document.getElementById("lockAspect").checked;

  let w = lockW ? o.w : Math.max(6, o.w*sx);
  let h = lockH ? o.h : Math.max(6, o.h*sy);

  if(lockAspect){
    const ratio = o.h > 0 ? o.w / o.h : 1;

    if(!lockW && lockH) w = Math.max(6, h*ratio);
    else if(lockW && !lockH) h = Math.max(6, w/ratio);
    else if(!lockW && !lockH){
      const factor = Math.abs(sx-1) >= Math.abs(sy-1) ? sx : sy;
      w = Math.max(6, o.w*factor);
      h = Math.max(6, o.h*factor);
    }
  }

  o.w = Math.min(1000,w);
  o.h = Math.min(700,h);

  pushNeoHistory();
  redraw();
  updateProperties();
}
function rotateSelected(deg){
  const o = selectedObject(); if(!o) return;
  o.rotation = (o.rotation + deg) % 360;
  pushNeoHistory(); redraw(); updateProperties();
}
function bringForward(){
  const i = objects.findIndex(o=>o.id===selectedId); if(i<0 || i===objects.length-1)return;
  [objects[i],objects[i+1]]=[objects[i+1],objects[i]];
  pushNeoHistory(); redraw(); renderShapeList();
}
function sendBackward(){
  const i = objects.findIndex(o=>o.id===selectedId); if(i<=0)return;
  [objects[i],objects[i-1]]=[objects[i-1],objects[i]];
  pushNeoHistory(); redraw(); renderShapeList();
}

function alignSelected(kind){
  const o = selectedObject(); if(!o)return;
  if(kind==="left") o.x=20;
  if(kind==="right") o.x=canvas.width-o.w-20;
  if(kind==="center") o.x=(canvas.width-o.w)/2;
  if(kind==="top") o.y=20;
  if(kind==="bottom") o.y=canvas.height-o.h-20;
  if(kind==="middle") o.y=(canvas.height-o.h)/2;
  pushNeoHistory(); redraw(); updateProperties();
}

function distributeSelected(axis){
  if(objects.length < 3){
    updateStatus("Necesitas al menos 3 elementos para distribuir.");
    return;
  }
  const sorted = [...objects].sort((a,b)=>
    axis==="h" ? (a.x-b.x) : (a.y-b.y)
  );
  const first = sorted[0], last = sorted[sorted.length-1];
  if(axis==="h"){
    const span = (last.x-first.x) / (sorted.length-1);
    sorted.forEach((o,i)=>o.x=first.x+span*i);
  } else {
    const span = (last.y-first.y) / (sorted.length-1);
    sorted.forEach((o,i)=>o.y=first.y+span*i);
  }
  pushNeoHistory(); redraw(); updateProperties();
}

function divideSelected(axis){
  const o = selectedObject(); if(!o) return;
  const original = {...o};
  const gap = 5;
  if(axis==="v"){
    const w = (o.w-gap)/2;
    o.w = w;
    const second = {...original,id:uid(),x:o.x+w+gap,w:w};
    objects.push(second);
  } else {
    const h = (o.h-gap)/2;
    o.h = h;
    const second = {...original,id:uid(),y:o.y+h+gap,h:h};
    objects.push(second);
  }
  selectedId = objects[objects.length-1].id;
  pushNeoHistory(); redraw(); renderShapeList(); updateProperties();
}

function generateComposition(){
  // Genera una composición nueva con los mismos tipos de elementos editables
  // que el constructor: rectángulos de color y barras horizontales/verticales.
  const previousObjects = objects;
  objects = [];
  const W = canvas.width, H = canvas.height;
  const palette = ["#ffffff", "#ffffff", "#111111", "#d72626", "#2458d3", "#f2d400"];
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const gap = 5;
  const count = 7 + Math.floor(Math.random() * 6); // 7–12 figuras de color
  const cols = 3 + Math.floor(Math.random() * 2);
  const rows = 2 + Math.floor(Math.random() * 2);
  const cellW = (W - gap * (cols + 1)) / cols;
  const cellH = (H - gap * (rows + 1)) / rows;

  // Bloques de tamaños variados, colocados dentro de una retícula flexible.
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols) % rows;
    const maxW = Math.max(45, Math.min(cellW * 1.35, W * 0.48));
    const maxH = Math.max(35, Math.min(cellH * 1.35, H * 0.48));
    const w = rand(Math.max(35, cellW * 0.35), maxW);
    const h = rand(Math.max(28, cellH * 0.28), maxH);
    const xBase = gap + c * (cellW + gap);
    const yBase = gap + r * (cellH + gap);
    const x = Math.max(0, Math.min(W - w, xBase + rand(-cellW * 0.12, cellW * 0.12)));
    const y = Math.max(0, Math.min(H - h, yBase + rand(-cellH * 0.12, cellH * 0.12)));
    objects.push({
      id: uid(), type: "rect", x, y, w, h,
      color: pick(palette), rotation: 0
    });
  }

  // Barras negras que estructuran la composición con ejes ortogonales.
  const barCount = 3 + Math.floor(Math.random() * 4); // 3–6 barras
  for (let i = 0; i < barCount; i++) {
    const horizontal = Math.random() < 0.5;
    if (horizontal) {
      const h = rand(8, 18);
      const y = rand(0, H - h);
      const x = rand(0, W * 0.22);
      const w = rand(W * 0.35, W - x);
      objects.push({id:uid(), type:"line", orientation:"h", x, y, w:Math.min(w,W-x), h, color:"#111111", rotation:0});
    } else {
      const w = rand(8, 18);
      const x = rand(0, W - w);
      const y = rand(0, H * 0.22);
      const h = rand(H * 0.35, H - y);
      objects.push({id:uid(), type:"line", orientation:"v", x, y, w, h:Math.min(h,H-y), color:"#111111", rotation:0});
    }
  }

  selectedId = objects.length ? objects[objects.length - 1].id : null;
  pushNeoHistory();
  redraw();
  renderShapeList();
  updateProperties();
  updateStatus("Composición aleatoria generada. Selecciona, mueve, cambia tamaño o color de cada elemento.");
}
function newChallenge(){
  const text = challenges[Math.floor(Math.random()*challenges.length)];
  document.getElementById("challengeBox").textContent = text;
}
function applyRules(){
  const messages=[];
  if(document.getElementById("ruleHV").checked) messages.push("✓ Orientación vertical/horizontal");
  if(document.getElementById("rulePalette").checked) messages.push("✓ Paleta limitada");
  if(document.getElementById("ruleRect").checked) messages.push("✓ Formas rectangulares");
  if(document.getElementById("ruleBalance").checked) messages.push("✓ Revisar equilibrio visual");
  updateStatus(messages.join(" · ") || "Sin reglas activas.");
}

// Hit testing y arrastre
function pointInObject(p,o){
  if(o.type==="rect") return p.x>=o.x && p.x<=o.x+o.w && p.y>=o.y && p.y<=o.y+o.h;
  return p.x>=o.x && p.x<=o.x+o.w && p.y>=o.y && p.y<=o.y+o.h;
}
canvas.addEventListener("pointerdown", e=>{
  if(mode!=="neo") return;
  const p=getCanvasPoint(e);
  for(let i=objects.length-1;i>=0;i--){
    if(pointInObject(p,objects[i])){
      selectedId=objects[i].id;
      dimensionEditState.editing=false;
      dragState={startX:p.x,startY:p.y,origX:objects[i].x,origY:objects[i].y};
      renderShapeList(); updateProperties(); redraw();
      return;
    }
  }
  selectedId=null;
  renderShapeList(); updateProperties(); redraw();
});
canvas.addEventListener("pointermove", e=>{
  if(mode!=="neo" || !dragState) return;
  const o=selectedObject(); if(!o)return;
  const p=getCanvasPoint(e);
  let dx=p.x-dragState.startX, dy=p.y-dragState.startY;
  if(document.getElementById("ruleHV").checked){
    if(Math.abs(dx) >= Math.abs(dy)) dy=0; else dx=0;
  }
  o.x=dragState.origX+dx;
  o.y=dragState.origY+dy;
  redraw(); updateProperties();
});
canvas.addEventListener("pointerup", ()=>{
  if(mode!=="neo" || !dragState) return;
  dragState=null;
  pushNeoHistory(); renderShapeList();
});
canvas.addEventListener("pointercancel", ()=>dragState=null);

function drawObject(o,selected=false){
  ctx.save();
  ctx.translate(o.x+o.w/2,o.y+o.h/2);
  ctx.rotate((o.rotation||0)*Math.PI/180);
  ctx.translate(-o.w/2,-o.h/2);
  ctx.fillStyle=o.color;
  ctx.strokeStyle="#111";
  if(o.type==="rect"){
    ctx.fillRect(0,0,o.w,o.h);
    if(selected){
      ctx.strokeStyle="#ffcc00";
      ctx.lineWidth=3;
      ctx.strokeRect(0,0,o.w,o.h);
    }
  } else if(o.type==="line"){
    ctx.fillRect(0,0,o.w,o.h);
    if(selected){
      ctx.strokeStyle="#ffcc00";
      ctx.lineWidth=3;
      ctx.strokeRect(0,0,o.w,o.h);
    }
  }
  ctx.restore();
}

function redraw(){
  if(mode==="free"){
    // El lienzo libre conserva su bitmap actual.
    return;
  }
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#ffffff";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  objects.forEach(o=>drawObject(o,o.id===selectedId));
}

function pushNeoHistory(){
  const snapshot=JSON.parse(JSON.stringify(objects));
  neoHistory=neoHistory.slice(0,neoHistoryIndex+1);
  neoHistory.push(snapshot);
  neoHistoryIndex++;
}
function restoreNeo(index){
  objects=JSON.parse(JSON.stringify(neoHistory[index]||[]));
  selectedId=null;
  redraw(); renderShapeList(); updateProperties();
}
function undo(){
  if(mode==="free"){undoFree();return;}
  if(neoHistoryIndex>0){neoHistoryIndex--;restoreNeo(neoHistoryIndex)}
}
function redo(){
  if(mode==="free"){redoFree();return;}
  if(neoHistoryIndex<neoHistory.length-1){neoHistoryIndex++;restoreNeo(neoHistoryIndex)}
}

function renderShapeList(){
  const box=document.getElementById("shapeList");
  box.innerHTML="";
  [...objects].reverse().forEach((o,revIndex)=>{
    const el=document.createElement("div");
    el.className="shape-item"+(o.id===selectedId?" selected":"");
    const mini=document.createElement("span");
    mini.className="mini";
    mini.style.background=o.color;
    const label=document.createElement("span");
    label.textContent=(o.type==="rect"?"Rectángulo":"Línea")+" · "+Math.round(o.w)+"×"+Math.round(o.h);
    el.appendChild(mini);el.appendChild(label);
    el.onclick=()=>{selectedId=o.id;renderShapeList();updateProperties();redraw();};
    box.appendChild(el);
  });
}
function updateProperties(syncControls=true){
  const box=document.getElementById("properties");
  const o=selectedObject();

  if(!o){
    box.textContent="Selecciona un elemento en el modo neoplasticista.";
    if(syncControls) syncProportionControls();
    return;
  }

  box.innerHTML =
    "Tipo: <b>"+(o.type==="rect"?"Rectángulo":"Línea")+"</b><br>"+
    "Color: "+o.color+"<br>"+
    "X: "+Math.round(o.x)+" · Y: "+Math.round(o.y)+"<br>"+
    "Ancho: "+Math.round(o.w)+" · Alto: "+Math.round(o.h)+"<br>"+
    "Rotación: "+(o.rotation||0)+"°";

  if(syncControls) syncProportionControls();
}

// Guardar/cargar proyectos
function projectData(){
  if(mode==="free"){
    return {mode:"free",narrativa,freeImage:canvas.toDataURL(),canvasW:canvas.width,canvasH:canvas.height};
  }
  return {mode:"neo",narrativa,objects};
}
function saveProject(){
  const data=JSON.stringify(projectData(),null,2);
  const blob=new Blob([data],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="ODS16_proyecto.json";
  a.click();
  URL.revokeObjectURL(a.href);
  updateStatus("Proyecto guardado.");
}
function loadProject(ev){
  const file=ev.target.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const data=JSON.parse(reader.result);
      if(data.mode==="neo"){
        setMode("neo");
        objects=data.objects||[];
        selectedId=null;
        pushNeoHistory(); redraw(); renderShapeList(); updateProperties();
      } else {
        setMode("free");
        const img=new Image();
        img.onload=()=>{
          ctx.clearRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(img,0,0,canvas.width,canvas.height);
          saveFreeState();
        };
        img.src=data.freeImage;
      }
      if(data.narrativa)narrativa=data.narrativa;
      updateStatus("Proyecto cargado.");
    }catch(err){
      updateStatus("No se pudo cargar el proyecto.");
    }
  };
  reader.readAsText(file);
}

function downloadCanvas(){
  if(mode==="neo") redraw();
  const enlace=document.createElement("a");
  enlace.download="ODS16_creacion_"+(mode==="free"?"libre":"neoplasticista")+".png";
  enlace.href=canvas.toDataURL("image/png");
  enlace.click();
  document.getElementById("mensaje").textContent="Creación exportada como PNG. ODS 16: Paz, justicia e instituciones sólidas.";
}

function initialise(){
  // Estado inicial vacío y una composición de ejemplo solo al entrar manualmente.
  ctx.clearRect(0,0,canvas.width,canvas.height);
  pushNeoHistory();
  syncProportionControls();
  updateStatus();
  syncParticleCanvas();
  if(!particleAnimationFrame) particleAnimationFrame = window.requestAnimationFrame(animateParticles);
}
initialise();
