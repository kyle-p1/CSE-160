class Cube {
  constructor() {
    this.type = 'cube';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
  }
    render() {
    
    function setColor(scale) {
      gl.uniform4f(u_FragColor, rgba[0]*scale, rgba[1]*scale, rgba[2]*scale, rgba[3]);
    }

    var rgba = this.color;

    // Matrix
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    //front of cube
    setColor(1.0);
    drawTriangle3D([0,0,0,  1,1,0,  1,0,0])
    drawTriangle3D([0,0,0,  0,1,0,  1,1,0])

    // top of cube
    setColor(0.9);
    drawTriangle3D([0,1,0,  0,1,1,  1,1,1])
    drawTriangle3D([0,1,0,  1,1,1,  1,1,0])
  
    // back of cube
    setColor(0.8);
    drawTriangle3D([0,0,1,  1,0,1,  1,1,1])
    drawTriangle3D([0,0,1,  1,1,1,  0,1,1])

    // left of cube
    setColor(0.7);
    drawTriangle3D([0,0,0,  0,0,1,  0,1,1])
    drawTriangle3D([0,0,0,  0,1,1,  0,1,0])

    // right of cube
    setColor(0.6);
    drawTriangle3D([1,0,0,  1,1,1,  1,0,1])
    drawTriangle3D([1,0,0,  1,1,0,  1,1,1])

    // bottom of cube
    setColor(0.5);
    drawTriangle3D([0,0,0,  1,0,1,  0,0,1])
    drawTriangle3D([0,0,0,  1,0,0,  1,0,1])
    
  }
}