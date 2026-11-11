// Elemen hingga balok Euler-Bernoulli (elemen Hermite kubik, DOF per node: w dan θ), ujung bebas.
import { type Mat, zeros } from '../../engine/linalg';
import { symGenEig } from '../../engine/eigen';
import { type BeamGeom, bisect } from './beamAnalytic';

export function assembleBeam(g: BeamGeom, N: number): { K: Mat; M: Mat } {
	const l = g.L / N;
	const EI = (g.E * g.b * g.h ** 3) / 12;
	const rhoA = g.rho * g.b * g.h;
	const ke = [
		[12, 6 * l, -12, 6 * l],
		[6 * l, 4 * l * l, -6 * l, 2 * l * l],
		[-12, -6 * l, 12, -6 * l],
		[6 * l, 2 * l * l, -6 * l, 4 * l * l]
	];
	const me = [
		[156, 22 * l, 54, -13 * l],
		[22 * l, 4 * l * l, 13 * l, -3 * l * l],
		[54, 13 * l, 156, -22 * l],
		[-13 * l, -3 * l * l, -22 * l, 4 * l * l]
	];
	const n = 2 * (N + 1);
	const K = zeros(n);
	const M = zeros(n);
	for (let e = 0; e < N; e++)
		for (let i = 0; i < 4; i++)
			for (let j = 0; j < 4; j++) {
				const idx = (2 * e + i) * n + 2 * e + j;
				K.d[idx] += (EI / l ** 3) * ke[i][j];
				M.d[idx] += ((rhoA * l) / 420) * me[i][j];
			}
	return { K, M };
}

export interface BeamModes {
	N: number;
	L: number;
	freq: number[]; // Hz, hanya mode elastis
	omega: number[];
	modes: Float64Array[]; // ternormalisasi massa
}

/** Mode elastis: dua mode pertama hasil eigen adalah mode benda kaku (ω ≈ 0) dan dibuang */
export function beamModes(g: BeamGeom, N: number): BeamModes {
	const { K, M } = assembleBeam(g, N);
	const e = symGenEig(K, M);
	return {
		N,
		L: g.L,
		freq: Array.from(e.freq.subarray(2)),
		omega: Array.from(e.omega.subarray(2)),
		modes: e.modes.slice(2)
	};
}

/** Nilai w(ξ) dari vektor mode lewat interpolasi Hermite, ξ = x/L di [0, 1] */
export function evalShape(phi: ArrayLike<number>, N: number, L: number, xi: number): number {
	const l = L / N;
	const e = Math.min(N - 1, Math.max(0, Math.floor(xi * N)));
	const s = xi * N - e;
	const s2 = s * s;
	const s3 = s2 * s;
	return (
		phi[2 * e] * (1 - 3 * s2 + 2 * s3) +
		phi[2 * e + 1] * l * (s - 2 * s2 + s3) +
		phi[2 * e + 2] * (3 * s2 - 2 * s3) +
		phi[2 * e + 3] * l * (s3 - s2)
	);
}

/** Titik simpul (ξ) sebuah mode: cari perubahan tanda lalu bagi dua */
export function nodalPoints(phi: ArrayLike<number>, N: number, L: number): number[] {
	const out: number[] = [];
	const S = 400;
	const f = (x: number) => evalShape(phi, N, L, x);
	for (let i = 0; i < S; i++) {
		const a = i / S;
		const b = (i + 1) / S;
		if (f(a) * f(b) < 0) out.push(bisect(f, a, b));
	}
	return out;
}
