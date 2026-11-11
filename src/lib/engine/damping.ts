import { type Mat, lincomb } from './linalg';

/** Redaman Rayleigh C = a0 M + a1 K dengan rasio ζ yang sama pada ωi dan ωj */
export function rayleigh(M: Mat, K: Mat, wi: number, wj: number, zeta: number): { a0: number; a1: number; C: Mat } {
	const a0 = (zeta * 2 * wi * wj) / (wi + wj);
	const a1 = (zeta * 2) / (wi + wj);
	return { a0, a1, C: lincomb(a0, M, a1, K) };
}
