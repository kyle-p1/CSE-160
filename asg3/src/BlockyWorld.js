// BlockyWorld.js
var VSHADER_SOURCE = `
precision mediump float;
attribute vec4 a_Position;
attribute vec2 a_UV;
varying vec2 v_UV;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;

void main() {
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
  v_UV = a_UV;
}
`;

var FSHADER_SOURCE = `
precision mediump float;
varying vec2 v_UV;

uniform vec4 u_BaseColor;
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler2;
uniform int u_TextureUnit;
uniform float u_TexColorWeight;

uniform float u_UVScale;

void main() {
  vec4 texColor;
  if (u_TextureUnit == 0) texColor = texture2D(u_Sampler0, v_UV * u_UVScale);
  else if (u_TextureUnit == 1) texColor = texture2D(u_Sampler1, v_UV * u_UVScale);
  else texColor = texture2D(u_Sampler2, v_UV * u_UVScale);

  gl_FragColor = mix(u_BaseColor, texColor, u_TexColorWeight);
}
`;

// globals
let canvas, gl;
let g_fpsSmooth = 60;
let g_msSmooth = 16.67;

// attribs
let a_Position, a_UV;

// uniforms
let u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_BaseColor, u_TexColorWeight, u_TextureUnit;
let u_Sampler0, u_Sampler1, u_Sampler2;
let u_UVScale;

// time
let g_lastTime = performance.now();
let g_startTime = performance.now();
let g_seconds = 0;

// camera
let camPos = new Vector3([16, 1.5, 28]);
let yaw = 180;
let pitch = 0;
let moveSpeed = 0.15;
let turnSpeed = 2.5;

// input
let keys = Object.create(null);

// world
const WORLD_SIZE = 32;
const WORLD_H = 4;
let map = [];
let needsRebuild = true;
let walls = [];

// textures
let texturesReady = false;

// picking
let g_target = null;
const MAX_REACH = 4.0;

// outline
let g_outlineBuffer = null;

// pig
const PIG_X = 10.5;
const PIG_Z = 8.5;
const PIG_RADIUS = 0.75;

// pig anim
let g_headAngle = 0;
let g_tailAngle = 0;
let g_walkAnimation = true;
let g_headAnimation = true;
let g_tailAnimation = true;

// win overlay
let g_winActive = false;
let g_inPigZone = false;

function main() {
  setupWebGL();
  connectGLSL();
  resizeCanvasToWindow();

  initOutlineBuffer();
  initInput();

  buildMap32();
  rebuildWorld();

  gl.clearColor(0, 0, 0, 1);

  initAllTextures();
  requestAnimationFrame(tick);
}

function setupWebGL() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log("WebGL context failed");
    return;
  }
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
}

function connectGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Shader init failed");
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  a_UV = gl.getAttribLocation(gl.program, "a_UV");

  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, "u_ProjectionMatrix");

  u_BaseColor = gl.getUniformLocation(gl.program, "u_BaseColor");
  u_TexColorWeight = gl.getUniformLocation(gl.program, "u_TexColorWeight");
  u_TextureUnit = gl.getUniformLocation(gl.program, "u_TextureUnit");

  u_Sampler0 = gl.getUniformLocation(gl.program, "u_Sampler0");
  u_Sampler1 = gl.getUniformLocation(gl.program, "u_Sampler1");
  u_Sampler2 = gl.getUniformLocation(gl.program, "u_Sampler2");

  u_UVScale = gl.getUniformLocation(gl.program, "u_UVScale");

  gl.uniform1i(u_Sampler0, 0);
  gl.uniform1i(u_Sampler1, 1);
  gl.uniform1i(u_Sampler2, 2);
}

function resizeCanvasToWindow() {
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener("resize", resize);
  resize();
}

function initOutlineBuffer() {
  const edges = new Float32Array([
    // bottom
    0,0,0,  1,0,0,
    1,0,0,  1,0,1,
    1,0,1,  0,0,1,
    0,0,1,  0,0,0,
    // top
    0,1,0,  1,1,0,
    1,1,0,  1,1,1,
    1,1,1,  0,1,1,
    0,1,1,  0,1,0,
    // sides
    0,0,0,  0,1,0,
    1,0,0,  1,1,0,
    1,0,1,  1,1,1,
    0,0,1,  0,1,1,
  ]);

  g_outlineBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_outlineBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, edges, gl.STATIC_DRAW);
}

function initInput() {
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    keys[k] = true;

    if (k === "enter") {
      e.preventDefault();
      hideWin();
    }
  });

  window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

  canvas.addEventListener("click", () => {
    if (!g_winActive) canvas.requestPointerLock?.();
  });

  document.addEventListener("mousemove", (e) => {
    if (g_winActive) return;
    if (document.pointerLockElement !== canvas) return;

    yaw -= e.movementX * 0.12;
    pitch -= e.movementY * 0.12;

    if (pitch > 89) pitch = 89;
    if (pitch < -89) pitch = -89;
  });

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("mousedown", (e) => {
    if (g_winActive) return;
    if (document.pointerLockElement !== canvas) return;

    if (e.button === 0) editBlock(true);
    else if (e.button === 2) editBlock(false);
  });
}

function tick() {
  const now = performance.now();
  const dt = (now - g_lastTime) / 1000.0;
  const ms = dt * 1000.0;
  g_msSmooth = g_msSmooth * 0.97 + ms * 0.03;
  g_fpsSmooth = 1000.0 / g_msSmooth;
  g_lastTime = now;
  g_seconds = (now - g_startTime) / 1000.0;

  if (!g_winActive) updateCamera(dt);
  updatePigAnimation();

  const pick = pickBlock();
  g_target = pick ? pick.hit : null;

  if (needsRebuild) {
    rebuildWorld();
    needsRebuild = false;
  }

  checkPigWin();
  renderAll();

  requestAnimationFrame(tick);
}

function getForwardDir() {
  const yRad = (yaw * Math.PI) / 180;
  const pRad = (pitch * Math.PI) / 180;

  const x = Math.sin(yRad) * Math.cos(pRad);
  const y = Math.sin(pRad);
  const z = Math.cos(yRad) * Math.cos(pRad);

  let f = new Vector3([x, y, z]);
  f.normalize();
  return f;
}

function updateCamera(dt) {
  if (keys["q"]) yaw += turnSpeed;
  if (keys["e"]) yaw -= turnSpeed;

  const f = getForwardDir();
  const fMove = new Vector3([f.elements[0], f.elements[1], f.elements[2]]);

  let fFlat = new Vector3([f.elements[0], 0, f.elements[2]]);
  if (fFlat.magnitude() > 0) fFlat.normalize();

  let up = new Vector3([0, 1, 0]);
  let right = Vector3.cross(fFlat, up);
  right.normalize();

  let speed = moveSpeed * (dt * 60);

  if (keys["w"]) camPos.add(new Vector3(fMove.elements).mul(speed));
  if (keys["s"]) camPos.sub(new Vector3(fMove.elements).mul(speed));
  if (keys["a"]) camPos.sub(new Vector3(right.elements).mul(speed));
  if (keys["d"]) camPos.add(new Vector3(right.elements).mul(speed));

  if (keys[" "]) camPos.elements[1] += speed;
  if (keys["shift"]) camPos.elements[1] -= speed;

  camPos.elements[0] = clamp(camPos.elements[0], 1, WORLD_SIZE - 2);
  camPos.elements[2] = clamp(camPos.elements[2], 1, WORLD_SIZE - 2);
  camPos.elements[1] = clamp(camPos.elements[1], 1, 20);
}

function clamp(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

// map[x][z] = height
function buildMap32() {
  map = [];
  for (let x = 0; x < WORLD_SIZE; x++) {
    let row = [];
    for (let z = 0; z < WORLD_SIZE; z++) row.push(0);
    map.push(row);
  }

  const H = 4;

  for (let x = 0; x < WORLD_SIZE; x++) {
    map[x][0] = H;
    map[x][WORLD_SIZE - 1] = H;
  }
  for (let z = 0; z < WORLD_SIZE; z++) {
    map[0][z] = H;
    map[WORLD_SIZE - 1][z] = H;
  }

  function rect(x1, z1, x2, z2) {
    for (let x = x1; x <= x2; x++) {
      for (let z = z1; z <= z2; z++) {
        if (x > 0 && z > 0 && x < WORLD_SIZE - 1 && z < WORLD_SIZE - 1) {
          let randH = 3 + Math.floor(Math.random() * 3);
          map[x][z] = randH;
        }
      }
    }
  }

  function carve(x1, z1, x2, z2) {
    for (let x = x1; x <= x2; x++) {
      for (let z = z1; z <= z2; z++) {
        if (x > 0 && z > 0 && x < WORLD_SIZE - 1 && z < WORLD_SIZE - 1) {
          map[x][z] = 0;
        }
      }
    }
  }

  rect(6, 6, 6, 25);
  rect(12, 4, 12, 20);
  rect(18, 8, 18, 27);

  rect(6, 12, 20, 12);
  rect(10, 18, 28, 18);
  rect(4, 24, 24, 24);

  carve(6, 10, 6, 11);
  carve(12, 9, 12, 10);
  carve(18, 15, 18, 16);

  carve(14, 12, 15, 12);
  carve(22, 18, 23, 18);
  carve(9, 24, 10, 24);

  rect(22, 6, 26, 10);
  carve(23, 7, 25, 9);

  rect(4, 16, 8, 20);
  carve(5, 17, 7, 19);

  carve(22, 22, 30, 30);
}

function rebuildWorld() {
  walls = [];
  for (let x = 0; x < WORLD_SIZE; x++) {
    for (let z = 0; z < WORLD_SIZE; z++) {
      let h = map[x][z];
      for (let y = 0; y < h; y++) {
        let c = new Cube();
        c.textureUnit = 0;
        c.texColorWeight = texturesReady ? 1.0 : 0.0;
        c.matrix.setIdentity();
        c.matrix.translate(x, y, z);
        walls.push(c);
      }
    }
  }
}

function inBoundsXZ(x, z) {
  return x >= 1 && z >= 1 && x < WORLD_SIZE - 1 && z < WORLD_SIZE - 1;
}

function heightAt(x, z) {
  if (!inBoundsXZ(x, z)) return 0;
  return map[x][z] | 0;
}

function hasBlock(x, y, z) {
  if (!inBoundsXZ(x, z)) return false;
  const h = heightAt(x, z);
  return y >= 0 && y < h;
}

function pickBlock() {
  const f = getForwardDir();
  let prevX = null, prevY = null, prevZ = null;

  for (let t = 0.2; t <= MAX_REACH; t += 0.1) {
    const px = camPos.elements[0] + f.elements[0] * t;
    const py = camPos.elements[1] + f.elements[1] * t;
    const pz = camPos.elements[2] + f.elements[2] * t;

    const x = Math.floor(px);
    const y = Math.floor(py);
    const z = Math.floor(pz);

    if (x === prevX && y === prevY && z === prevZ) continue;

    if (hasBlock(x, y, z)) {
      return { hit: { x, y, z } };
    }

    prevX = x; prevY = y; prevZ = z;
  }

  return null;
}

// stack add/remove (top only)
function editBlock(add) {
  const f = getForwardDir();

  for (let t = 0.2; t <= MAX_REACH; t += 0.1) {
    const px = camPos.elements[0] + f.elements[0] * t;
    const py = camPos.elements[1] + f.elements[1] * t;
    const pz = camPos.elements[2] + f.elements[2] * t;

    const x = Math.floor(px);
    const y = Math.floor(py);
    const z = Math.floor(pz);

    if (!inBoundsXZ(x, z)) continue;

    const h = heightAt(x, z);

    if (add) {
      if (y === h && h < WORLD_H) {
        map[x][z] = h + 1;
        needsRebuild = true;
        return;
      }
    } else {
      if (y === h - 1 && h > 0) {
        map[x][z] = h - 1;
        needsRebuild = true;
        return;
      }
    }
  }
}

function updatePigAnimation() {
  if (g_headAnimation) g_headAngle = 12 * Math.sin(g_seconds);
  if (g_tailAnimation) g_tailAngle = 25 * Math.sin(2 * g_seconds);
}

function renderAll() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const forward = getForwardDir();
  const at = new Vector3([
    camPos.elements[0] + forward.elements[0],
    camPos.elements[1] + forward.elements[1],
    camPos.elements[2] + forward.elements[2],
  ]);

  const view = new Matrix4();
  view.setLookAt(
    camPos.elements[0], camPos.elements[1], camPos.elements[2],
    at.elements[0], at.elements[1], at.elements[2],
    0, 1, 0
  );

  const proj = new Matrix4();
  proj.setPerspective(60, canvas.width / canvas.height, 0.1, 1000);

  gl.uniformMatrix4fv(u_ViewMatrix, false, view.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, proj.elements);

  // sky
  if (texturesReady) {
    gl.disable(gl.CULL_FACE);

    let sky = new Cube();
    sky.textureUnit = 2;
    sky.texColorWeight = 1.0;
    sky.color = [0.4, 0.6, 1.0, 1.0];
    sky.matrix.setIdentity();
    sky.matrix.translate(WORLD_SIZE / 2, 10, WORLD_SIZE / 2);
    sky.matrix.scale(200, 200, 200);
    sky.matrix.translate(-0.5, -0.5, -0.5);
    gl.uniform1f(u_UVScale, 1.0);
    sky.render();

    gl.enable(gl.CULL_FACE);
  }

  // ground
  {
    let ground = new Cube();
    ground.textureUnit = 1;
    ground.texColorWeight = texturesReady ? 1.0 : 0.0;
    ground.color = [0.2, 0.7, 0.2, 1.0];
    ground.matrix.setIdentity();
    ground.matrix.translate(WORLD_SIZE / 2, -0.5, WORLD_SIZE / 2);
    ground.matrix.scale(WORLD_SIZE, 1.0, WORLD_SIZE);
    ground.matrix.translate(-0.5, -0.5, -0.5);
    gl.uniform1f(u_UVScale, 32.0);
    ground.render();
  }

  gl.uniform1f(u_UVScale, 1.0);
  for (let i = 0; i < walls.length; i++) walls[i].render();

  renderPig();

  if (g_target) renderWireOutline(g_target.x, g_target.y, g_target.z);

  sendTextToHTML(`ms: ${g_msSmooth.toFixed(1)} fps: ${g_fpsSmooth.toFixed(0)}`, "numdot");
}

function renderPig() {
  let bodyBob = 0;
  let legSwing = 0;
  let earBounce = 0;

  if (g_walkAnimation) {
    bodyBob = 0.02 * Math.sin(2 * g_seconds);
    legSwing = 18 * Math.sin(4 * g_seconds);
    earBounce = 6 * Math.sin(3 * g_seconds);
  }

  let headAngle = Number(g_headAngle) + (g_headAnimation ? 12 * Math.sin(g_seconds) : 0);
  let tailAngle = Number(g_tailAngle) + (g_tailAnimation ? 25 * Math.sin(2 * g_seconds) : 0);

  let pigPink = [1.0, 0.72, 0.78, 1.0];
  let snoutPink = [0.85, 0.52, 0.62, 1.0];
  let earPink = [0.98, 0.66, 0.78, 1.0];
  let legColor = [0.35, 0.20, 0.22, 1.0];
  let eyeColor = [0.05, 0.05, 0.05, 1.0];
  let tailColor = [0.95, 0.60, 0.70, 1.0];
  let nostrilColor = [0.05, 0.05, 0.05, 1.0];

  let pigBase = new Matrix4();
  pigBase.setTranslate(PIG_X, 0.3 + bodyBob, PIG_Z);

  let bodyBase = new Matrix4(pigBase);

  let body = new Cube();
  body.texColorWeight = 0.0;
  body.color = pigPink;
  body.matrix = new Matrix4(bodyBase);
  body.matrix.scale(0.70, 0.30, 0.45);
  body.matrix.translate(-0.5, 0.0, -0.5);
  body.render();

  let headBase = new Matrix4(bodyBase);
  headBase.translate(0.45, 0.18, 0.0);
  headBase.rotate(headAngle, 0, 0, 1);

  let head = new Cube();
  head.texColorWeight = 0.0;
  head.color = pigPink;
  head.matrix = new Matrix4(headBase);
  head.matrix.scale(0.26, 0.20, 0.24);
  head.matrix.translate(-0.5, -0.5, -0.5);
  head.render();

  let snoutBase = new Matrix4(headBase);
  snoutBase.translate(0.15, -0.02, 0.0);

  let snout = new Cube();
  snout.texColorWeight = 0.0;
  snout.color = snoutPink;
  snout.matrix = new Matrix4(snoutBase);
  snout.matrix.scale(0.11, 0.10, 0.14);
  snout.matrix.translate(-0.5, -0.5, -0.5);
  snout.render();

  let leftNostril = new Cube();
  leftNostril.texColorWeight = 0.0;
  leftNostril.color = nostrilColor;
  leftNostril.matrix = new Matrix4(snoutBase);
  leftNostril.matrix.translate(0.045, 0.00, 0.04);
  leftNostril.matrix.scale(0.03, 0.03, 0.02);
  leftNostril.matrix.translate(-0.5, -0.5, -0.5);
  leftNostril.render();

  let rightNostril = new Cube();
  rightNostril.texColorWeight = 0.0;
  rightNostril.color = nostrilColor;
  rightNostril.matrix = new Matrix4(snoutBase);
  rightNostril.matrix.translate(0.045, 0.00, -0.04);
  rightNostril.matrix.scale(0.03, 0.03, 0.02);
  rightNostril.matrix.translate(-0.5, -0.5, -0.5);
  rightNostril.render();

  let eyeY = 0.05;

  let leftEye = new Cube();
  leftEye.texColorWeight = 0.0;
  leftEye.color = eyeColor;
  leftEye.matrix = new Matrix4(headBase);
  leftEye.matrix.translate(0.10, 0.05, 0.11);
  leftEye.matrix.scale(0.05, eyeY, 0.05);
  leftEye.matrix.translate(-0.5, -0.5, -0.5);
  leftEye.render();

  let rightEye = new Cube();
  rightEye.texColorWeight = 0.0;
  rightEye.color = eyeColor;
  rightEye.matrix = new Matrix4(headBase);
  rightEye.matrix.translate(0.10, 0.05, -0.11);
  rightEye.matrix.scale(0.05, eyeY, 0.05);
  rightEye.matrix.translate(-0.5, -0.5, -0.5);
  rightEye.render();

  let leftEar = new Cube();
  leftEar.texColorWeight = 0.0;
  leftEar.color = earPink;
  leftEar.matrix = new Matrix4(headBase);
  leftEar.matrix.translate(-0.02, 0.14, 0.09);
  leftEar.matrix.rotate(25 + earBounce, 0, 0, 1);
  leftEar.matrix.scale(0.06, 0.14, 0.06);
  leftEar.matrix.translate(-0.5, -0.5, -0.5);
  leftEar.render();

  let rightEar = new Cube();
  rightEar.texColorWeight = 0.0;
  rightEar.color = earPink;
  rightEar.matrix = new Matrix4(headBase);
  rightEar.matrix.translate(-0.02, 0.14, -0.09);
  rightEar.matrix.rotate(25 + earBounce, 0, 0, 1);
  rightEar.matrix.scale(0.06, 0.14, 0.06);
  rightEar.matrix.translate(-0.5, -0.5, -0.5);
  rightEar.render();

  let tailBase = new Matrix4(bodyBase);
  tailBase.translate(-0.33, 0.18, 0.0);
  tailBase.rotate(tailAngle, 0, 1, 0);
  tailBase.rotate(25, 0, 0, 1);

  let tail = new Cube();
  tail.texColorWeight = 0.0;
  tail.color = tailColor;
  tail.matrix = new Matrix4(tailBase);
  tail.matrix.scale(0.22, 0.06, 0.06);
  tail.matrix.translate(-1.0, -0.5, -0.5);
  tail.render();

  function drawLeg(x, z, swingSign) {
    let leg = new Cube();
    leg.texColorWeight = 0.0;
    leg.color = legColor;
    leg.matrix = new Matrix4(bodyBase);
    leg.matrix.translate(x, 0.02, z);
    leg.matrix.rotate(swingSign * legSwing, 0, 0, 1);
    leg.matrix.scale(0.08, 0.28, 0.08);
    leg.matrix.translate(-0.5, -1.0, -0.5);
    leg.render();
  }

  drawLeg(0.25, 0.18, 1);
  drawLeg(0.25, -0.18, -1);
  drawLeg(-0.25, 0.18, -1);
  drawLeg(-0.25, -0.18, 1);
}

function renderWireOutline(x, y, z) {
  gl.disableVertexAttribArray(a_UV);

  const M = new Matrix4();
  M.setIdentity();
  M.translate(x, y, z);
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);

  gl.uniform1f(u_TexColorWeight, 0.0);
  gl.uniform4f(u_BaseColor, 1.0, 1.0, 1.0, 1.0);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_outlineBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.LINES, 0, 24);

  gl.enableVertexAttribArray(a_UV);
}

function checkPigWin() {
  const dx = camPos.elements[0] - PIG_X;
  const dz = camPos.elements[2] - PIG_Z;
  const d2 = dx * dx + dz * dz;

  const inside = (d2 <= PIG_RADIUS * PIG_RADIUS);

  // show only on entering the zone
  if (inside && !g_inPigZone) {
    showWin();
  }

  g_inPigZone = inside;
}

function showWin() {
  const el = document.getElementById("winOverlay");
  if (!el) return;

  el.style.display = "flex";
  g_winActive = true;

  if (document.pointerLockElement === canvas) {
    document.exitPointerLock?.();
  }
}

function hideWin() {
  const el = document.getElementById("winOverlay");
  if (!el) return;

  el.style.display = "none";
  g_winActive = false;
}

function sendTextToHTML(text, htmlID) {
  const el = document.getElementById(htmlID);
  if (el) el.innerHTML = text;
}

// texture helpers
function loadImageAsync(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed: " + src));
    img.src = src;
  });
}

function loadTextureToUnit(unit, image) {
  const tex = gl.createTexture();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  return tex;
}

async function initAllTextures() {
  try {
    const wall = await loadImageAsync("../textures/wall.png");
    const grass = await loadImageAsync("../textures/grass.png");
    const sky = await loadImageAsync("../textures/sky.png");

    loadTextureToUnit(0, wall);
    loadTextureToUnit(1, grass);
    loadTextureToUnit(2, sky);

    texturesReady = true;
    needsRebuild = true;
  } catch (e) {
    console.log(e);
    texturesReady = false;
  }
}
