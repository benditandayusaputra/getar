// Tampilan 2.5D bilah di atas rancakan (Canvas 2D, proyeksi miring).
import { type LarasView, type Renderer, siapkan } from './types';

const SEG = 24; // jumlah ruas bilah untuk menggambar lendutan
const AMP = 0.02; // lendutan visual maksimum (m), jauh lebih besar dari aslinya
const Z0 = 0.022; // tinggi penyangga (m)

export function createLaras2d(canvas: HTMLCanvasElement): Renderer<LarasView> {
	let geo = { s: 1, cx: 0, base: 0, L: 0.25, b: 0.05, h: 0.01 };

	function draw(v: LarasView) {
		const { c, w, h } = siapkan(canvas);
		if (!w || !h) return;
		const s = Math.min((w * 0.9) / 0.47, (h * 0.8) / 0.17);
		const cx = w / 2 - 0.225 * v.b * s;
		const base = h * 0.66;
		geo = { s, cx, base, L: v.L, b: v.b, h: v.h };
		const P = (x: number, y: number, z: number): [number, number] => [cx + (x + y * 0.45) * s, base - (z + y * 0.28) * s];
		const poly = (pts: [number, number][], fill: string, stroke = 'rgba(30,27,22,0.35)') => {
			c.beginPath();
			pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
			c.closePath();
			c.fillStyle = fill;
			c.fill();
			c.strokeStyle = stroke;
			c.lineWidth = 1;
			c.stroke();
		};
		const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, [atas, depan, samping]: string[]) => {
			poly([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], samping);
			poly([P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)], depan);
			poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], atas);
		};

		// bayangan dan rancakan kayu
		const [bx, by] = P(0, v.b / 2, -0.04);
		c.fillStyle = 'rgba(30,27,22,0.12)';
		c.beginPath();
		c.ellipse(bx, by + 6, 0.27 * s, 0.035 * s, 0, 0, 7);
		c.fill();
		box(-0.225, 0.225, -0.012, v.b + 0.012, -0.034, 0, ['#8B5A33', '#6E4424', '#5C381D']);
		c.strokeStyle = 'rgba(255,230,190,0.25)';
		c.beginPath();
		c.moveTo(...P(-0.21, -0.012, -0.017));
		c.lineTo(...P(0.21, -0.012, -0.017));
		c.stroke();

		// penyangga pada titik simpul mode 1
		const X = (xi: number) => (xi - 0.5) * v.L;
		for (const xi of v.simpul) box(X(xi) - 0.006, X(xi) + 0.006, 0, v.b, 0, Z0, ['#4A2E18', '#3B2412', '#2F1C0D']);

		// bilah: 24 ruas mengikuti lendutan w(ξ)
		const z = Array.from({ length: SEG + 1 }, (_, i) => Z0 + v.w(i / SEG) * AMP);
		const xs = Array.from({ length: SEG + 1 }, (_, i) => X(i / SEG));
		const [atas, depan, samping] = v.warna;
		poly([P(xs[SEG], 0, z[SEG]), P(xs[SEG], v.b, z[SEG]), P(xs[SEG], v.b, z[SEG] + v.h), P(xs[SEG], 0, z[SEG] + v.h)], samping);
		poly([...xs.map((x, i) => P(x, 0, z[i])), ...xs.map((x, i) => P(x, 0, z[i] + v.h)).reverse()], depan);
		poly([...xs.map((x, i) => P(x, 0, z[i] + v.h)), ...xs.map((x, i) => P(x, v.b, z[i] + v.h)).reverse()], atas);
		// kilau dan lubang paku di titik simpul
		c.strokeStyle = 'rgba(255,255,255,0.45)';
		c.lineWidth = 2;
		c.beginPath();
		xs.forEach((x, i) => {
			const [px, py] = P(x, v.b * 0.7, z[i] + v.h);
			if (i) c.lineTo(px, py);
			else c.moveTo(px, py);
		});
		c.stroke();
		const zAt = (xi: number) => Z0 + v.w(xi) * AMP + v.h;
		c.fillStyle = 'rgba(30,27,22,0.65)';
		for (const xi of v.simpul) {
			const [px, py] = P(X(xi), v.b / 2, zAt(xi));
			c.beginPath();
			c.ellipse(px, py, 0.004 * s, 0.0022 * s, 0, 0, 7);
			c.fill();
		}

		// label titik simpul
		c.font = '11px "JetBrains Mono", monospace';
		c.fillStyle = '#5f574a';
		c.textAlign = 'center';
		c.textBaseline = 'top';
		for (const xi of v.simpul) {
			const [px, py] = P(X(xi), -0.012, -0.034);
			c.fillText(`simpul ${xi.toFixed(3).replace('.', ',')} L`, px, py + 8);
		}

		// bayangan tabuh di posisi kursor
		if (v.hover != null) {
			const [hx, hy] = P(X(v.hover), v.b / 2, zAt(v.hover));
			c.globalAlpha = 0.35;
			c.fillStyle = '#C8B48A';
			c.strokeStyle = '#6E4424';
			c.lineWidth = 1;
			c.beginPath();
			c.arc(hx, hy - 0.022 * s, 0.011 * s, 0, 7);
			c.fill();
			c.stroke();
			c.globalAlpha = 1;
			c.strokeStyle = 'rgba(110,68,36,0.6)';
			c.setLineDash([2, 3]);
			c.beginPath();
			c.moveTo(hx, hy - 0.011 * s);
			c.lineTo(hx, hy);
			c.stroke();
			c.setLineDash([]);
		}

		// penanda posisi pukul dan tabuh
		const [tx, ty] = P(X(v.xs), v.b / 2, zAt(v.xs));
		c.strokeStyle = 'rgba(30,27,22,0.55)';
		c.lineWidth = 1.5;
		c.setLineDash([3, 3]);
		c.beginPath();
		c.ellipse(tx, ty, 0.009 * s, 0.005 * s, 0, 0, 7);
		c.stroke();
		c.setLineDash([]);
		if (v.umur < 0.45) {
			const angkat = Math.max(0, v.umur - 0.04) * 0.28 * s;
			const r = 0.011 * s;
			c.strokeStyle = '#6E4424';
			c.lineWidth = 0.006 * s;
			c.lineCap = 'round';
			c.beginPath();
			c.moveTo(tx, ty - r - angkat);
			c.lineTo(tx + 0.09 * s, ty - r - angkat - 0.07 * s);
			c.stroke();
			c.lineCap = 'butt';
			c.fillStyle = '#C8B48A';
			c.strokeStyle = '#6E4424';
			c.lineWidth = 1;
			c.beginPath();
			c.arc(tx, ty - r - angkat, r, 0, 7);
			c.fill();
			c.stroke();
		}
	}

	/** Klik dianggap mengenai permukaan atas bilah di tengah lebarnya */
	function pick(clientX: number, clientY: number): number | null {
		// klik dan hover memakai area yang sama
		const r = canvas.getBoundingClientRect();
		const { s, cx, base, L, b, h } = geo;
		const sx = clientX - r.left;
		const sy = clientY - r.top;
		const yAtas = base - (Z0 + h + AMP + b * 0.28) * s - 10;
		const yBawah = base - (Z0 - AMP) * s + 10;
		const xi = ((sx - cx) / s - 0.225 * b) / L + 0.5;
		return sy >= yAtas && sy <= yBawah && xi >= -0.02 && xi <= 1.02 ? Math.min(1, Math.max(0, xi)) : null;
	}

	return { draw, pick, dispose() {} };
}
