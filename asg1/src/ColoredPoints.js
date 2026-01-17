// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =`
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
  gl_Position = a_Position;
  gl_PointSize = u_Size;
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
let g_selectedColor = [1.0, 0.0, 0.0, 1.0]; 
let g_selectedSize = 5.0;
let g_selectedSegments = 10;
let u_Size;
const POINT =0;
const TRIANGLE =1;
const CIRCLE =2;
let g_SelectedType = POINT;

function setUpWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

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

  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }

}
function addActionsforHtmlUI() {
  document.getElementById('green').onclick = function() {g_selectedColor = [0.0, 1.0, 0.0, 1.0];};
  document.getElementById('red').onclick = function() {g_selectedColor = [1.0, 0.0, 0.0, 1.0];};
  document.getElementById('clearButton').onclick = function() {g_shapesList = []; renderAllShapes();};

  document.getElementById('pointButton').onclick = function() {g_SelectedType = POINT;};
  document.getElementById('triangleButton').onclick = function() {g_SelectedType = TRIANGLE;};
  document.getElementById('circleButton').onclick = function() {g_SelectedType = CIRCLE;};

  document.getElementById('redSlider').addEventListener('mouseup', function() {g_selectedColor[0] = this.value/100;});
  document.getElementById('greenSlider').addEventListener('mouseup', function() {g_selectedColor[1] = this.value/100;});
  document.getElementById('blueSlider').addEventListener('mouseup', function() {g_selectedColor[2] = this.value/100;});

  document.getElementById('sizeSlider').addEventListener('mouseup', function() {g_selectedSize = this.value;});
  document.getElementById('segmentSlider').addEventListener('mouseup', function() {g_selectedSegments = this.value;});

  document.getElementById('pictureButton').onclick = function() {drawPicture();};
  document.getElementById('alphaSlider').addEventListener('mouseup', function () {g_selectedColor[3] = this.value / 100;});

}

function main() {

  setUpWebGL();
  connectFunctionsToGLSL();
  addActionsforHtmlUI();
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  canvas.onmousemove = function(ev) { if(ev.buttons==1) click(ev); };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}


//var g_points = [];  // The array for the position of a mouse press
//var g_colors = [];  // The array to store the color of a point
//var g_sizes = [];   // The array to store the size of a point

var g_shapesList =[];

function click(ev) {

  let [x,y] = convertCoordinatesEventToGL(ev);
  
  let shape;
  if(g_SelectedType == POINT){
    shape = new Point();
  } else if(g_SelectedType == TRIANGLE){
    shape = new Triangle();
  } else if(g_SelectedType == CIRCLE){
    shape = new Circle();
    shape.segments = g_selectedSegments;
  }
  shape.position = [x, y];
  shape.color = g_selectedColor.slice();
  shape.size = g_selectedSize;

  g_shapesList.push(shape);
  renderAllShapes();
}

function convertCoordinatesEventToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
  return [x, y];
}

function renderAllShapes() {
  var startTime = performance.now();
  gl.clear(gl.COLOR_BUFFER_BIT);
  var len = g_shapesList.length;
  for(var i = 0; i < len; i++) {
    g_shapesList[i].render();
}
  var duration = performance.now() - startTime;
  sendTextToHTML("numdot: " + len + " ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration)/10, "numdot");
}

function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if(!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}

function drawPicture() {
  g_shapesList = [];
  gl.clear(gl.COLOR_BUFFER_BIT);
  const SIZE = 25;          // 400 / 16
  const CELL = 0.125;       // 2 / 16
  const STEP = 2 / 16;   // grid cell size in clip space
  
  function gridToClip(gx, gy) {
    let x = -1 + gx * STEP;
    let y = -1 + gy * STEP;
    return [x, y];
  }

  
  function addTri(gx, gy, color) {
    let t = new Triangle();
    t.size = SIZE;
    t.color = color;
    t.position = [
      -1 + gx * CELL,
      -1 + gy * CELL
    ];
    g_shapesList.push(t);
  }

function addMirroredTri(gx, gy, color) {
  let [x, y] = gridToClip(gx + 1, gy);

  let t = new Triangle();
  t.color = color;
  t.size = 25;

  let d = STEP;

  t.vertices = [
    x,     y,
    x - d, y,     // mirrored horizontally
    x,     y + d
  ];

  g_shapesList.push(t);
}



  function addSquare(gx, gy, color) {
  // normal triangle
  let t1 = new Triangle();
  t1.size = 25;
  t1.color = color;
  t1.position = [
    -1 + gx * 0.125,
    -1 + gy * 0.125
  ];
  g_shapesList.push(t1);

  // flipped triangle
  let t2 = new Triangle();
  t2.size = -25; // ⭐ flip
  t2.color = color;
  t2.position = [
    -1 + (gx + 1) * 0.125,
    -1 + (gy + 1) * 0.125
  ];
  g_shapesList.push(t2);
}

function addEquilateralTri(gx, gy, color) {
  let [x, y] = gridToClip(gx, gy);

  let t = new Triangle();
  t.color = color;
  t.size = 25;

  let h = STEP * 0.866; // √3 / 2

  t.vertices = [
    x + STEP / 2, y + h,   // top
    x,            y,       // bottom-left
    x + STEP,     y        // bottom-right
  ];

  g_shapesList.push(t);
}



  // Colors
  const GREEN = [0.1, 0.7, 0.2, 1.0];
  const BROWN = [0.5, 0.3, 0.1, 1.0];
  const CLOUD = [0.9, 0.9, 0.9, 1.0];

  // ---- Ground (row 0) ----
for (let x = 0; x < 16; x++) {
  addSquare(x, 0, [0.1, 0.7, 0.2, 1.0]);
}


  // **left tree
  let baseX = 3;

  // trunk
  for (let y = 1; y <= 3; y++) {
    for (let x = 0; x <=1; x++) {
        addSquare(baseX + x, y, BROWN);
    }
  }

  // leaves squares
  for (let y = 4; y <=9; y++) {
    if (y % 2 == 0) {
      for (let x = -1; x <=2; x++) {
          addSquare(baseX + x, y, GREEN);
      }
    } else {
        for (let x = 0; x <=1; x++) {
          addSquare(baseX + x, y, GREEN);
        }
      }
    }

    // leaf edges
    for (let y = 4; y <= 9; y++) {
      if (y % 2 == 0) {
        addMirroredTri(baseX -2, y, GREEN);
        addTri(baseX +3, y, GREEN);
      }
      else {
        addMirroredTri(baseX -1, y, GREEN);
        addTri(baseX +2, y, GREEN);
      }
    }
  addMirroredTri(baseX + 0, 10, GREEN);
  addTri(baseX + 1, 10, GREEN);

  // **middle tree
  baseX = 9;
  // trunk
  for (let y = 1; y <= 2; y++) {
    addSquare(baseX, y, BROWN);
  }
  // leaves
  for (let y = 3; y <= 5; y++){
    addSquare(baseX, y, GREEN);
    addTri(baseX + 1, y, GREEN);
    addMirroredTri(baseX - 1, y, GREEN);
  }
  addEquilateralTri(baseX, 6, GREEN);

  // **right tree
  baseX = 13;
  // trunk
  for (let y = 1; y <= 3; y++) {
    addSquare(baseX, y, BROWN);
  }

  // leaves + right edges
  for (let y = 4; y <= 7; y++){
    addSquare(baseX, y, GREEN);
    addTri(baseX + 1, y, GREEN);
    addMirroredTri(baseX - 1, y, GREEN);
  }
  addEquilateralTri(baseX, 8, GREEN);

  // clouds
  addMirroredTri(1, 14, CLOUD);
  addSquare(2, 14, CLOUD);
  addSquare(3, 14, CLOUD);
  addTri(4, 14, CLOUD);

  addMirroredTri(6, 13, CLOUD);
  addSquare(7, 13, CLOUD);
  addTri(8, 13, CLOUD);

  addMirroredTri(10, 14, CLOUD);
  addSquare(11, 14, CLOUD);
  addSquare(12, 14, CLOUD);
  addSquare(13, 14, CLOUD);
  addTri(14, 14, CLOUD);

  renderAllShapes();
}


