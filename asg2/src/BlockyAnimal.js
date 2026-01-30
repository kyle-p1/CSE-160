// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =`
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() {
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  }`

// Fragment shader program
var FSHADER_SOURCE =`
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`


let canvas;
let gl;
let a_Position;
let u_FragColor;

let g_globalAngleX = 0;
let g_globalAngleY = 0;
let g_headAngle = 0;
let g_tailAngle = 0;

let g_isDrag = false;
let g_xPrev = 0;
let g_yPrev = 0;

let g_walkAnimation = false;
let g_headAnimation = false;
let g_tailAnimation = false;

let g_pokeActive = false;
let g_pokeStartTime = 0;
let g_pokeAmount = 0;
let g_pokeBlink = false;

let u_ModelMatrix;
let u_GlobalRotateMatrix;


function setUpWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  gl.enable(gl.DEPTH_TEST);
}

function startPoke() {
	g_pokeActive = true;
	g_pokeStartTime = g_seconds;
}


function addMouseControls() {
	canvas.oncontextmenu = () => false;

	canvas.addEventListener('mousedown', function(ev) {
		if (ev.shiftKey) {
			startPoke();
			renderAllShapes();
			return;
		}
		g_isDrag = true;
		g_xPrev = ev.clientX;
		g_yPrev = ev.clientY;
	});

	window.addEventListener('mouseup', function() {
		g_isDrag = false;
	});

	window.addEventListener('mousemove', function(ev) {
		if (!g_isDrag) return;

		var dx = ev.clientX - g_xPrev;
		var dy = ev.clientY - g_yPrev;

		g_globalAngleY -= dx * .3;
		g_globalAngleX -= dy * .3;

		if (g_globalAngleX > 89) g_globalAngleX = 89;
		if (g_globalAngleX < -89) g_globalAngleX = -89;

		g_xPrev = ev.clientX;
		g_yPrev = ev.clientY;

		renderAllShapes();
	});
}

function connectFunctionsToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_ModelMatrix
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if(!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  // Get the storage location of u_GlobalRotateMatrix
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if(!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }

  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);

}


function addActionsforHtmlUI() {
  document.getElementById('walkAnimationOffButton').addEventListener('click', function() {g_walkAnimation = false;});
  document.getElementById('walkAnimationOnButton').addEventListener('click', function() {g_walkAnimation = true;});

  document.getElementById('headSlider').addEventListener('mousemove', function() {g_headAngle = this.value; renderAllShapes();});
  document.getElementById('tailSlider').addEventListener('mousemove', function() {g_tailAngle = this.value; renderAllShapes();});
  document.getElementById('headAnimationOffButton').addEventListener('click', function() {g_headAnimation = false;});
  document.getElementById('headAnimationOnButton').addEventListener('click', function() {g_headAnimation = true;});
  document.getElementById('tailAnimationOffButton').addEventListener('click', function() {g_tailAnimation = false;});
  document.getElementById('tailAnimationOnButton').addEventListener('click', function() {g_tailAnimation = true;});

  document.getElementById('xSlider').addEventListener('mousemove', function() {g_globalAngleX = this.value; renderAllShapes();});
  document.getElementById('ySlider').addEventListener('mousemove', function() {g_globalAngleY = this.value; renderAllShapes();});

}

function main() {
  setUpWebGL();
  connectFunctionsToGLSL();
  addActionsforHtmlUI();
  addMouseControls();
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  requestAnimationFrame(tick);
}

var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now()/1000.0 - g_startTime;

function tick() { 
  g_seconds = performance.now()/1000.0 - g_startTime;
  updateAnimationAngles();
  renderAllShapes();
  requestAnimationFrame(tick);
}

function updateAnimationAngles() {
	g_pokeAmount = 0;
	g_pokeBlink = false;

	if (g_pokeActive) {
		let t = g_seconds - g_pokeStartTime;
		let duration = 0.65;

		if (t >= duration) {
			g_pokeActive = false;
		} else {
			let u = t / duration;
			g_pokeAmount = Math.sin(u * Math.PI); 
			if (t > 0.08 && t < 0.18) g_pokeBlink = true;
		}
	}

	if (g_headAnimation) {
		g_headAngle = 12 * Math.sin(g_seconds);
	}

	if (g_tailAnimation) {
		g_tailAngle = 25 * Math.sin(2 * g_seconds);
	}
}

function renderAllShapes() {
	let startTime = performance.now();

	// animation values
	let bodyBob = 0;
	let legSwing = 0;
	let earBounce = 0;

	if (g_walkAnimation) {
		bodyBob = 0.02 * Math.sin(2 * g_seconds);
		legSwing = 18 * Math.sin(4 * g_seconds);
		earBounce = 6 * Math.sin(3 * g_seconds);
	}

	// poke modifiers
	let pokeHead = -35 * g_pokeAmount;
	let pokeEar = -30 * g_pokeAmount;
	let pokeTail = 40 * g_pokeAmount;
	let pokeSquashX = 1.0 + 0.10 * g_pokeAmount;
	let pokeSquashY = 1.0 - 0.18 * g_pokeAmount;

	let headWiggle = g_headAnimation ? 12 * Math.sin(g_seconds) : 0;
	let tailWiggle = g_tailAnimation ? 25 * Math.sin(2 * g_seconds) : 0;

	let headAngle = Number(g_headAngle) + headWiggle + pokeHead;
	let tailAngle = Number(g_tailAngle) + tailWiggle + pokeTail;

	// camera rotation
	let globalRotMat = new Matrix4()
		.rotate(g_globalAngleX, 1, 0, 0)
		.rotate(g_globalAngleY, 0, 1, 0);

	gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// colors
	let pigPink = [1.0, 0.72, 0.78, 1.0];
	let snoutPink = [0.85, 0.52, 0.62, 1.0];
	let earPink = [0.98, 0.66, 0.78, 1.0];
	let legColor = [0.35, 0.20, 0.22, 1.0];
	let eyeColor = [0.05, 0.05, 0.05, 1.0];
	let tailColor = [0.95, 0.60, 0.70, 1.0];
	let nostrilColor = [0.05, 0.05, 0.05, 1.0];

	// pig base
	let pigBase = new Matrix4();
	pigBase.setTranslate(-0.10, -0.35 + bodyBob, 0.0);
	pigBase.rotate(-5, 1, 0, 0);

	let bodyBase = new Matrix4(pigBase);

	// body
	let body = new Cube();
	body.color = pigPink;
	body.matrix = new Matrix4(bodyBase);
	body.matrix.scale(0.70 * pokeSquashX, 0.30 * pokeSquashY, 0.45);
	body.matrix.translate(-0.5, -0.5, -0.5);
	body.render();

	// head
	let headBase = new Matrix4(bodyBase);
	headBase.translate(0.45, 0.05, 0.0);
	headBase.rotate(headAngle, 0, 0, 1);

	let head = new Cube();
	head.color = pigPink;
	head.matrix = new Matrix4(headBase);
	head.matrix.scale(0.26, 0.20, 0.24);
	head.matrix.translate(-0.5, -0.5, -0.5);
	head.render();

	// snout (cylinder)
	let snoutBase = new Matrix4(headBase);
	snoutBase.translate(0.15, -0.02, 0.0);

	let snout = new Cylinder(18);
	snout.color = snoutPink;
	snout.matrix = new Matrix4(snoutBase);
	snout.matrix.scale(0.11, 0.10, 0.14);
	snout.matrix.translate(-0.5, -0.5, -0.5);
	snout.render();

	// nostrils
	let leftNostril = new Cube();
	leftNostril.color = nostrilColor;
	leftNostril.matrix = new Matrix4(snoutBase);
	leftNostril.matrix.translate(0.045, 0.00, 0.04);
	leftNostril.matrix.scale(0.03, 0.03, 0.02);
	leftNostril.matrix.translate(-0.5, -0.5, -0.5);
	leftNostril.render();

	let rightNostril = new Cube();
	rightNostril.color = nostrilColor;
	rightNostril.matrix = new Matrix4(snoutBase);
	rightNostril.matrix.translate(0.045, 0.00, -0.04);
	rightNostril.matrix.scale(0.03, 0.03, 0.02);
	rightNostril.matrix.translate(-0.5, -0.5, -0.5);
	rightNostril.render();

	// eyes (blink on poke)
	let eyeY = g_pokeBlink ? 0.01 : 0.05;

	let leftEye = new Cube();
	leftEye.color = eyeColor;
	leftEye.matrix = new Matrix4(headBase);
	leftEye.matrix.translate(0.10, 0.05, 0.11);
	leftEye.matrix.scale(0.05, eyeY, 0.05);
	leftEye.matrix.translate(-0.5, -0.5, -0.5);
	leftEye.render();

	let rightEye = new Cube();
	rightEye.color = eyeColor;
	rightEye.matrix = new Matrix4(headBase);
	rightEye.matrix.translate(0.10, 0.05, -0.11);
	rightEye.matrix.scale(0.05, eyeY, 0.05);
	rightEye.matrix.translate(-0.5, -0.5, -0.5);
	rightEye.render();

	// ears (droop on poke)
	let leftEar = new Cube();
	leftEar.color = earPink;
	leftEar.matrix = new Matrix4(headBase);
	leftEar.matrix.translate(-0.02, 0.14, 0.09);
	leftEar.matrix.rotate(25 + earBounce + pokeEar, 0, 0, 1);
	leftEar.matrix.scale(0.06, 0.14, 0.06);
	leftEar.matrix.translate(-0.5, -0.5, -0.5);
	leftEar.render();

	let rightEar = new Cube();
	rightEar.color = earPink;
	rightEar.matrix = new Matrix4(headBase);
	rightEar.matrix.translate(-0.02, 0.14, -0.09);
	rightEar.matrix.rotate(25 + earBounce + pokeEar, 0, 0, 1);
	rightEar.matrix.scale(0.06, 0.14, 0.06);
	rightEar.matrix.translate(-0.5, -0.5, -0.5);
	rightEar.render();

	// tail
	let tailBase = new Matrix4(bodyBase);
	tailBase.translate(-0.33, 0.10, 0.0);
	tailBase.rotate(tailAngle, 0, 1, 0);
	tailBase.rotate(25, 0, 0, 1);

	let tail = new Cube();
	tail.color = tailColor;
	tail.matrix = new Matrix4(tailBase);
	tail.matrix.scale(0.22, 0.06, 0.06);
	tail.matrix.translate(-1.0, -0.5, -0.5);
	tail.render();

	// legs
	function drawLeg(x, z, swingSign) {
		let leg = new Cube();
		leg.color = legColor;
		leg.matrix = new Matrix4(bodyBase);
		leg.matrix.translate(x, -0.14, z);
		leg.matrix.rotate(swingSign * legSwing, 0, 0, 1);
		leg.matrix.scale(0.08, 0.28, 0.08);
		leg.matrix.translate(-0.5, -1.0, -0.5);
		leg.render();
	}

	drawLeg(0.25, 0.18, 1);
	drawLeg(0.25, -0.18, -1);
	drawLeg(-0.25, 0.18, -1);
	drawLeg(-0.25, -0.18, 1);

	// performance
	let duration = performance.now() - startTime;
sendTextToHTML("ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration)/10, "numdot");
}



function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if(!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}



