// Shear building n lantai: M ü + C u̇ + K u = −M ι a_g(t), perpindahan relatif terhadap tanah.
import { type Mat, zeros, solve } from '../../engine/linalg';
import { symGenEig, type EigenResult } from '../../engine/eigen';
import { rayleigh } from '../../engine/damping';

export interface TmdParams {
	mu: number; // rasio massa terhadap massa total gedung
	fRatio: number; // rasio penyetelan terhadap ω₁
	zeta: number; // rasio redaman TMD
}

export interface BuildingParams {
	n: number;
	m: number; // massa per lantai (kg)
	k: number; // kekakuan tingkat (N/m)
	zeta: number; // rasio redaman struktur
	h: number; // tinggi tingkat (m)
	kFactor?: number[]; // pengali kekakuan per tingkat (bracing)
	tmd?: TmdParams | null;
}

export interface BuildingModel {
	n: number; // jumlah lantai
	ndof: number; // n, atau n + 1 kalau ada TMD
	M: Mat;
	C: Mat;
	K: Mat;
	mass: Float64Array; // diagonal M, dipakai untuk gaya −m a_g
	eig: EigenResult; // mode gedung tanpa TMD
	h: number;
}

export function storeyK(p: BuildingParams): number[] {
	return Array.from({ length: p.n }, (_, i) => p.k * (p.kFactor?.[i] ?? 1));
}

export function buildBuilding(p: BuildingParams): BuildingModel {
	const n = p.n;
	const ks = storeyK(p);
	const Ks = zeros(n);
	const Ms = zeros(n);
	for (let i = 0; i < n; i++) {
		Ms.d[i * n + i] = p.m;
		Ks.d[i * n + i] = ks[i] + (i + 1 < n ? ks[i + 1] : 0);
		if (i + 1 < n) Ks.d[i * n + i + 1] = Ks.d[(i + 1) * n + i] = -ks[i + 1];
	}
	const eig = symGenEig(Ks, Ms);
	const w1 = eig.omega[0];
	// n = 1: wi = wj memberi c = 2ζ√(km)
	const Cs = rayleigh(Ms, Ks, w1, eig.omega[Math.min(1, n - 1)], p.zeta).C;

	const ndof = p.tmd ? n + 1 : n;
	const M = zeros(ndof);
	const K = zeros(ndof);
	const C = zeros(ndof);
	for (let i = 0; i < n; i++)
		for (let j = 0; j < n; j++) {
			M.d[i * ndof + j] = Ms.d[i * n + j];
			K.d[i * ndof + j] = Ks.d[i * n + j];
			C.d[i * ndof + j] = Cs.d[i * n + j];
		}
	if (p.tmd) {
		const md = p.tmd.mu * p.m * n;
		const wd = p.tmd.fRatio * w1;
		const kd = md * wd * wd;
		const cd = 2 * p.tmd.zeta * md * wd;
		const r = n - 1; // atap
		const t = n; // DOF TMD
		M.d[t * ndof + t] = md;
		for (const [A, val] of [[K, kd], [C, cd]] as [Mat, number][]) {
			A.d[r * ndof + r] += val;
			A.d[t * ndof + t] += val;
			A.d[r * ndof + t] -= val;
			A.d[t * ndof + r] -= val;
		}
	}
	const mass = new Float64Array(ndof);
	for (let i = 0; i < ndof; i++) mass[i] = M.d[i * ndof + i];
	return { n, ndof, M, C, K, mass, eig, h: p.h };
}

/** Frekuensi alami analitik shear building seragam (Hz), j = 1..n */
export function shearFreqAnalytic(n: number, m: number, k: number, j: number): number {
	return (2 * Math.sqrt(k / m) * Math.sin(((2 * j - 1) * Math.PI) / (2 * (2 * n + 1)))) / (2 * Math.PI);
}

/**
 * Respons frekuensi atap: faktor pembesaran |U_atap| ω₁² / A terhadap a_g = A sin(2π f t).
 * (K − ω² M + iω C) U = −M ι A diselesaikan sebagai sistem real 2n × 2n, jadi TMD ikut terhitung.
 */
export function freqResponse(model: BuildingModel, freqs: ArrayLike<number>): Float64Array {
	const { ndof: n, n: nf, M, C, K, mass, eig } = model;
	const out = new Float64Array(freqs.length);
	const N = 2 * n;
	const w1sq = eig.omega[0] ** 2;
	for (let q = 0; q < freqs.length; q++) {
		const w = 2 * Math.PI * freqs[q];
		const A = zeros(N);
		const b = new Float64Array(N);
		for (let i = 0; i < n; i++) {
			b[i] = -mass[i];
			for (let j = 0; j < n; j++) {
				const re = K.d[i * n + j] - w * w * M.d[i * n + j];
				const im = w * C.d[i * n + j];
				A.d[i * N + j] = re;
				A.d[i * N + n + j] = -im;
				A.d[(n + i) * N + j] = im;
				A.d[(n + i) * N + n + j] = re;
			}
		}
		const x = solve(A, b);
		out[q] = Math.hypot(x[nf - 1], x[n + nf - 1]) * w1sq;
	}
	return out;
}
