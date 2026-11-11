// Tampilan 2.5D gedung (Canvas 2D, proyeksi miring: goyangan terlihat mendatar di layar).
import { type AyunView, type Renderer, WARNA, warnaDrift, siapkan } from './types';
import { THETA_IZIN } from '../models/ayun/drift';

const BW = 9; // lebar gedung (m), arah goyangan
const BD = 6; // kedalaman (m)
const SLAB = 0.4;

export function createAyun2d(canvas: HTMLCanvasElement): Renderer<AyunView> {
	let env = new Float64Array(0); // selubung simpangan per tingkat supaya warna tidak berkedip

	function draw(v: AyunView) {
		const { c, w, h } = siapkan(canvas);
		if (!w || !h) return;
		if (env.length !== v.n) env = new Float64Array(v.n);
		const tinggi = v.n * v.h + 4;
		const s = Math.min((h * 0.8) / tinggi, (w * 0.62) / (BW + BD * 0.45));
		const cx = w / 2 - BD * 0.22 * s;
		const base = h - Math.max(34, h * 0.09);
		const P = (x: number, y: number, z: number): [number, number] => [cx + (x + y * 0.45) * s, base - (z + y * 0.28) * s];
		const quad = (pts: [number, number][], fill?: string, stroke?: string) => {
			c.beginPath();
			pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
			c.closePath();
			if (fill) {
				c.fillStyle = fill;
				c.fill();
			}
			if (stroke) {
				c.strokeStyle = stroke;
				c.stroke();
			}
		};
		const line = (a: [number, number], b: [number, number]) => {
			c.beginPath();
			c.moveTo(a[0], a[1]);
			c.lineTo(b[0], b[1]);
			c.stroke();
		};

		// tanah: pelat yang bergeser bersama u_g, di atas batuan dasar yang diam
		const g = v.ug * v.skala;
		const GW = BW * 1.25;
		c.lineWidth = 1;
		quad([P(-GW + g, -2, 0), P(GW + g, -2, 0), P(GW + g, BD + 2, 0), P(-GW + g, BD + 2, 0)], '#DDD0B3', '#B8A77F');
		quad([P(-GW + g, -2, 0), P(GW + g, -2, 0), P(GW + g, -2, -0.9), P(-GW + g, -2, -0.9)], '#C4B48D', '#B8A77F');
		c.strokeStyle = '#A8976E';
		for (let x = -GW + 0.6; x < GW; x += 1.2) line(P(x + g, -2, -0.1), P(x + g - 0.4, -2, -0.8));
		c.strokeStyle = '#8C7D5C';
		c.setLineDash([3, 4]);
		line(P(-GW * 1.1, -2, -1.15), P(GW * 1.1, -2, -1.15));
		c.setLineDash([]);
		// penanda diam di tengah supaya gerakan tanah terlihat
		c.fillStyle = '#8C7D5C';
		const [mx, my] = P(0, -2, -1.15);
		c.beginPath();
		c.moveTo(mx, my);
		c.lineTo(mx - 5, my + 8);
		c.lineTo(mx + 5, my + 8);
		c.fill();

		// bayangan
		const [sx, sy] = P(g, BD / 2, 0);
		c.fillStyle = 'rgba(30,27,22,0.13)';
		c.beginPath();
		c.ellipse(sx + BD * 0.1 * s, sy, (BW * 0.72 + BD * 0.2) * s, BD * 0.3 * s, 0, 0, 7);
		c.fill();

		const off = (i: number) => g + (i > 0 ? v.u[i - 1] * v.skala : 0); // offset lantai ke-i (0 = tanah)
		const x0 = -BW / 2;
		const x1 = BW / 2;
		for (let i = 0; i < v.n; i++) {
			const zb = i * v.h;
			const zt = (i + 1) * v.h - SLAB;
			const ob = off(i);
			const ot = off(i + 1);
			env[i] = Math.max(Math.abs(v.drift[i]), env[i] * 0.985);
			const warna = warnaDrift(env[i], THETA_IZIN);

			// kolom belakang
			c.strokeStyle = '#4A4438';
			c.lineWidth = Math.max(2, s * 0.22);
			line(P(x0 + ob, BD, zb), P(x0 + ot, BD, zt));
			// dinding samping dan depan (kaca berwarna sesuai rasio simpangan)
			c.lineWidth = 1;
			quad([P(x1 + ob, 0, zb), P(x1 + ob, BD, zb), P(x1 + ot, BD, zt), P(x1 + ot, 0, zt)], '#D5DDE0');
			c.globalAlpha = 0.5;
			quad([P(x1 + ob, 0, zb), P(x1 + ob, BD, zb), P(x1 + ot, BD, zt), P(x1 + ot, 0, zt)], warna);
			c.globalAlpha = 1;
			const depan: [number, number][] = [P(x0 + ob, 0, zb), P(x1 + ob, 0, zb), P(x1 + ot, 0, zt), P(x0 + ot, 0, zt)];
			quad(depan, '#E9EEF0');
			c.globalAlpha = 0.38;
			quad(depan, warna);
			c.globalAlpha = 1;
			// kisi jendela
			c.strokeStyle = 'rgba(30,27,22,0.22)';
			for (let k = 1; k < 4; k++) line(P(x0 + (BW * k) / 4 + ob, 0, zb), P(x0 + (BW * k) / 4 + ot, 0, zt));
			line(P(x0 + (ob + ot) / 2, 0, (zb + zt) / 2), P(x1 + (ob + ot) / 2, 0, (zb + zt) / 2));
			// bracing
			if (v.bracing?.[i]) {
				c.strokeStyle = WARNA.baja;
				c.lineWidth = Math.max(2, s * 0.16);
				line(P(x0 + ob, 0, zb), P(x1 + ot, 0, zt));
				line(P(x1 + ob, 0, zb), P(x0 + ot, 0, zt));
			}
			// retakan: muncul kalau simpangan puncak tingkat ini pernah melewati batas
			if (v.retak[i] > THETA_IZIN) {
				c.strokeStyle = WARNA.bahaya;
				c.lineWidth = 1.6;
				for (const fx of [0.22, 0.68]) {
					c.beginPath();
					for (let k = 0; k <= 5; k++) {
						const fz = k / 5;
						const zig = ((k * 7 + i * 3) % 3) - 1;
						const [px, py] = P(x0 + BW * (fx + zig * 0.035) + ob + (ot - ob) * fz, 0, zb + (zt - zb) * fz);
						if (k) c.lineTo(px, py);
						else c.moveTo(px, py);
					}
					c.stroke();
				}
			}
			// kolom depan
			c.strokeStyle = '#2B2720';
			c.lineWidth = Math.max(2, s * 0.24);
			line(P(x0 + ob, 0, zb), P(x0 + ot, 0, zt));
			line(P(x1 + ob, 0, zb), P(x1 + ot, 0, zt));
			line(P(x1 + ob, BD, zb), P(x1 + ot, BD, zt));
			// pelat lantai
			c.lineWidth = 1;
			const za = zt + SLAB;
			quad([P(x0 + ot, 0, za), P(x1 + ot, 0, za), P(x1 + ot, BD, za), P(x0 + ot, BD, za)], '#F3EEE2', '#8C8573');
			quad([P(x1 + ot, 0, zt), P(x1 + ot, BD, zt), P(x1 + ot, BD, za), P(x1 + ot, 0, za)], '#B9B19E', '#8C8573');
			quad([P(x0 + ot, 0, zt), P(x1 + ot, 0, zt), P(x1 + ot, 0, za), P(x0 + ot, 0, za)], '#D2CBB9', '#8C8573');
		}

		// TMD: bandul di atap
		if (v.tmd !== null) {
			const zr = v.n * v.h;
			const or = off(v.n);
			const rel = Math.max(-BW * 0.42, Math.min(BW * 0.42, (v.tmd - v.u[v.n - 1]) * v.skala));
			const top = P(or, BD / 2, zr + 2.6);
			c.strokeStyle = '#4A4438';
			c.lineWidth = Math.max(2, s * 0.14);
			line(P(or - 2.2, BD / 2, zr), top);
			line(P(or + 2.2, BD / 2, zr), top);
			const bola = P(or + rel, BD / 2, zr + 0.8);
			c.lineWidth = 1.5;
			line(top, bola);
			c.fillStyle = WARNA.perunggu;
			c.strokeStyle = '#6B4A12';
			c.beginPath();
			c.arc(bola[0], bola[1], Math.max(5, s * 0.6), 0, 7);
			c.fill();
			c.stroke();
		}
	}

	return { draw, dispose() {} };
}
