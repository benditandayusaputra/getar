// Rasio simpangan antar lantai. Batas SNI 1726:2019 dipakai sebagai acuan edukatif, bukan desain.
export const THETA_IZIN = 0.02;

export function driftRatios(u: ArrayLike<number>, n: number, h: number): Float64Array {
	const d = new Float64Array(n);
	for (let i = 0; i < n; i++) d[i] = (u[i] - (i > 0 ? u[i - 1] : 0)) / h;
	return d;
}

export type Status = 'Aman' | 'Waspada' | 'Melebihi batas';
export function statusOf(maxDrift: number): Status {
	const r = Math.abs(maxDrift) / THETA_IZIN;
	return r < 0.5 ? 'Aman' : r <= 1 ? 'Waspada' : 'Melebihi batas';
}
