let canvas;
let ctx;

function drawVector(v, color) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const scale = 20;
  ctx.strokeStyle = color;

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + v.elements[0] * scale, cy - v.elements[1] * scale);
  ctx.stroke();
}

function handleDrawEvent() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var xV1 = parseFloat(document.getElementById('xInputV1').value);
  var yV1 = parseFloat(document.getElementById('yInputV1').value);
  let v1 = new Vector3([xV1, yV1, 0]);

  var xV2 = parseFloat(document.getElementById('xInputV2').value);
  var yV2 = parseFloat(document.getElementById('yInputV2').value);
  let v2 = new Vector3([xV2, yV2, 0]);
  drawVector(v1, "red");
  drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var xV1 = parseFloat(document.getElementById('xInputV1').value);
  var yV1 = parseFloat(document.getElementById('yInputV1').value);
  let v1 = new Vector3([xV1, yV1, 0]);
  drawVector(v1, "red");
  
  var xV2 = parseFloat(document.getElementById('xInputV2').value);
  var yV2 = parseFloat(document.getElementById('yInputV2').value);
  let v2 = new Vector3([xV2, yV2, 0]);
  drawVector(v2, "blue");

  let operation = document.getElementById('operationSelect').value;
  let v3 = new Vector3(v1.elements);
  let v4 = new Vector3(v2.elements);
  let scalar = parseFloat(document.getElementById('scalarInput').value);

  if (operation === "add") {
    v3.add(v2);
    drawVector(v3, "green");
  } else if (operation === "subtract") {
    v3.sub(v2);
    drawVector(v3, "green");
  } else if (operation === "multiply") {
    v3.mul(scalar);
    v4.mul(scalar);
    drawVector(v3, "green");
    drawVector(v4, "green");
  } else if (operation === "divide") {
    v3.div(scalar);
    v4.div(scalar);
    drawVector(v3, "green");
    drawVector(v4, "green");
  } else if (operation === "magnitude") {
    let magV1 = v3.magnitude();
    let magV2 = v4.magnitude();
    console.log("Magnitude of V1: " + magV1);
    console.log("Magnitude of V2: " + magV2);
  } else if (operation === "normalize") {
    v3.normalize();
    v4.normalize();
    drawVector(v3, "green");
    drawVector(v4, "green");
  } else if (operation === "angle between") {
    var angle = angleBetween(v3, v4);
    console.log("Angle: " + angle);
  } else if (operation === "area") {
    var area = areaTriangle(v3, v4);
    console.log("Area: " + area);
  }
}

function angleBetween(v1,v2) {
    let angle = Math.acos(Vector3.dot(v1,v2) / (v1.magnitude() * v2.magnitude()));
    angle = angle * (180 / Math.PI);
    return angle;
}

function areaTriangle(v1,v2) {
    let area = 0.5 * Vector3.cross(v1,v2).magnitude();
    return area;
}

function main() {  
  canvas = document.getElementById('example');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  } 
  ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
