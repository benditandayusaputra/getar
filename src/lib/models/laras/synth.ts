// Sintesis bunyi pukulan bilah lewat superposisi modal.
import { type BeamModes, evalShape } from './beamFem';

export interface StrikeMode {
	f: number;
	omega: number;
	amp: number; // φ(x_s) φ(x_o) / ω_d
}

/**
 * Mode elastis dengan f < 12 kHz dan bobotnya untuk pukulan di xs, didengar di xo (ξ = x/L).
 * Titik dengar default di ujung bilah (ξ = 0), yang merupakan perut semua mode ujung bebas.
 * Kalau didengar di tengah (ξ = 0,5), semua mode antisimetris (2, 4, ...) selalu hilang di mana pun bilah dipukul.
 */
export function strikeModes(bm: BeamModes, zeta: number, xs: number, xo = 0): StrikeMode[] {
	const out: StrikeMode[] = [];
	for (let i = 0; i < bm.freq.length && bm.freq[i] < 12000; i++) {
		const wd = bm.omega[i] * Math.sqrt(1 - zeta * zeta);
		out.push({
			f: bm.freq[i],
			omega: bm.omega[i],
			amp: (evalShape(bm.modes[i], bm.N, bm.L, xs) * evalShape(bm.modes[i], bm.N, bm.L, xo)) / wd
		});
	}
	return out;
}

/** q(t) = Σ amp_n e^{−ζ ω_n t} sin(ω_d,n t). Puncak dinormalisasi ke 0,8, attack 2 ms, fade-out 50 ms. */
export function synthStrike(bm: BeamModes, zeta: number, xs: number, fs = 44100, dur = 2.5): Float32Array {
	const modes = strikeModes(bm, zeta, xs);
	const n = Math.round(fs * dur);
	const out = new Float32Array(n);
	for (const m of modes) {
		const wd = m.omega * Math.sqrt(1 - zeta * zeta);
		const dec = zeta * m.omega;
		for (let i = 0; i < n; i++) {
			const t = i / fs;
			out[i] += m.amp * Math.exp(-dec * t) * Math.sin(wd * t);
		}
	}
	let peak = 1e-30;
	for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
	const att = Math.round(0.002 * fs);
	const fade = Math.round(0.05 * fs);
	for (let i = 0; i < n; i++) {
		const env = Math.min(1, i / att, (n - 1 - i) / fade);
		out[i] *= (0.8 / peak) * env;
	}
	return out;
}
