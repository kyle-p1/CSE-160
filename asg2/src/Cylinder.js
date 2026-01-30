class Cylinder {
	constructor(segments = 16) {
		this.type = 'cylinder';
		this.color = [1, 1, 1, 1];
		this.matrix = new Matrix4();
		this.segments = segments;
	}

	render() {
		const rgba = this.color;

		gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
		gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

		const n = this.segments;

		const r = 0.5;
		const cy = 0.5;
		const cz = 0.5;

		for (let i = 0; i < n; i++) {
			const a0 = (i / n) * Math.PI * 2;
			const a1 = ((i + 1) / n) * Math.PI * 2;

			const y0 = cy + r * Math.cos(a0);
			const z0 = cz + r * Math.sin(a0);
			const y1 = cy + r * Math.cos(a1);
			const z1 = cz + r * Math.sin(a1);

      //sides
			drawTriangle3D([
				0, y0, z0,
				1, y0, z0,
				1, y1, z1
			]);

			drawTriangle3D([
				0, y0, z0,
				1, y1, z1,
				0, y1, z1
			]);

      //top
			drawTriangle3D([
				1, cy, cz,
				1, y0, z0,
				1, y1, z1
			]);
      
      //bottom
			drawTriangle3D([
				0, cy, cz,
				0, y1, z1,
				0, y0, z0
			]);
		}
	}
}
