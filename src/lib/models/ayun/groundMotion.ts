// Gerakan tanah a_g(t) dalam m/s².
import { Newmark } from '../../engine/newmark';

export const G = 9.81;
export type GroundKind = 'sinus' | 'sapuan' | 'pulsa' | 'sintetis';
export const GROUND_LABEL: Record<GroundKind, string> = {
	sinus: 'Sinus',
	sapuan: 'Sapuan frekuensi',
	pulsa: 'Pulsa',
	sintetis: 'Gempa sintetis'
};

export interface GroundOpts {
	kind: GroundKind;
	A: number; // amplitudo puncak dalam g
	f: number; // Hz (sinus dan pulsa)
	seed?: number;
}

function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const SYN_DT = 0.005;
const SYN_DUR = 20;
const synCache = new Map<number, Float64Array>();

/** Derau putih ber-seed, disaring Kanai-Tajimi (ω_g = 15 rad/s, ζ_g = 0,6), selubung trapesium, puncak dinormalisasi ke 1 */
function synthetic(seed: number): Float64Array {
	const hit = synCache.get(seed);
	if (hit) return hit;
	const wg = 15;
	const zg = 0.6;
	const one = (x: number) => ({ n: 1, d: new Float64Array([x]) });
	const nm = new Newmark({ M: one(1), C: one(2 * zg * wg), K: one(wg * wg), dt: SYN_DT });
	const rnd = mulberry32(seed);
	const N = Math.round(SYN_DUR / SYN_DT) + 1;
	const out = new Float64Array(N);
	let peak = 0;
	for (let i = 0; i < N; i++) {
		const t = i * SYN_DT;
		// derau Gauss dari jumlah 4 seragam (cukup untuk tujuan visual)
		const w = rnd() + rnd() + rnd() + rnd() - 2;
		nm.step([-w]);
		const env = t < 2 ? t / 2 : t < 10 ? 1 : Math.max(0, (20 - t) / 10);
		out[i] = env * (2 * zg * wg * nm.v[0] + wg * wg * nm.u[0]);
		peak = Math.max(peak, Math.abs(out[i]));
	}
	for (let i = 0; i < N; i++) out[i] /= peak;
	synCache.set(seed, out);
	return out;
}

export function groundAccel(o: GroundOpts): (t: number) => number {
	const A = o.A * G;
	switch (o.kind) {
		case 'sinus':
			// ramp 2 detik supaya tidak ada kejutan awal
			return (t) => A * Math.min(1, t / 2) * Math.sin(2 * Math.PI * o.f * t);
		case 'sapuan': {
			const f0 = 0.5;
			const rate = (15 - 0.5) / 30;
			return (t) => (t > 30 ? 0 : A * Math.min(1, t / 1) * Math.sin(2 * Math.PI * (f0 * t + 0.5 * rate * t * t)));
		}
		case 'pulsa':
			return (t) => (t < 1 / o.f ? A * Math.sin(2 * Math.PI * o.f * t) : 0);
		case 'sintetis': {
			const data = synthetic(o.seed ?? 2026);
			return (t) => {
				const x = t / SYN_DT;
				const i = Math.floor(x);
				if (i < 0 || i >= data.length - 1) return 0;
				return A * (data[i] + (data[i + 1] - data[i]) * (x - i));
			};
		}
	}
}

/** Frekuensi sesaat sapuan (Hz), untuk penanda di grafik */
export function chirpFreq(t: number): number {
	return Math.min(15, 0.5 + ((15 - 0.5) / 30) * t);
}
