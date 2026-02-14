// Cube.js
class Cube {
  constructor() {
    this.type = "cube";
    this.color = [1, 1, 1, 1];
    this.matrix = new Matrix4();

    this.textureUnit = 0;
    this.texColorWeight = 1.0;
  }

  render() {
    // model matrix
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // base color
    const c = this.color || [1, 1, 1, 1];
    gl.uniform4f(u_BaseColor, c[0], c[1], c[2], c[3]);

    // texture controls
    gl.uniform1f(u_TexColorWeight, (this.texColorWeight ?? 1.0));
    gl.uniform1i(u_TextureUnit, (this.textureUnit ?? 0));

    // draw cube geometry
    if (!Cube._inited) Cube._initBuffers();
    Cube._bindAndDraw();
  }

  // init shared buffers once
  static _initBuffers() {
    Cube._inited = true;

    // 36 vertices (6 faces * 2 tris * 3 verts)
    // each vertex: x y z u v
    const V = new Float32Array([
      // front (z=0)
      0,0,0,  0,0,  1,1,0,  1,1,  1,0,0,  1,0,
      0,0,0,  0,0,  0,1,0,  0,1,  1,1,0,  1,1,

      // top (y=1)
      0,1,0,  0,0,  0,1,1,  0,1,  1,1,1,  1,1,
      0,1,0,  0,0,  1,1,1,  1,1,  1,1,0,  1,0,

      // back (z=1)
      0,0,1,  0,0,  1,0,1,  1,0,  1,1,1,  1,1,
      0,0,1,  0,0,  1,1,1,  1,1,  0,1,1,  0,1,

      // left (x=0)
      0,0,0,  0,0,  0,0,1,  1,0,  0,1,1,  1,1,
      0,0,0,  0,0,  0,1,1,  1,1,  0,1,0,  0,1,

      // right (x=1)
      1,0,0,  0,0,  1,1,1,  1,1,  1,0,1,  1,0,
      1,0,0,  0,0,  1,1,0,  0,1,  1,1,1,  1,1,

      // bottom (y=0)
      0,0,0,  0,0,  1,0,1,  1,1,  0,0,1,  0,1,
      0,0,0,  0,0,  1,0,0,  1,0,  1,0,1,  1,1,
    ]);

    Cube._vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube._vbo);
    gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW);

    Cube._stride = 5 * 4; // xyzuv floats
  }

  static _bindAndDraw() {
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube._vbo);

    // position
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, Cube._stride, 0);
    gl.enableVertexAttribArray(a_Position);

    // uv
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, Cube._stride, 3 * 4);
    gl.enableVertexAttribArray(a_UV);

    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}
