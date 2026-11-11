import { describe, it, expect } from 'vitest';
import { symGenEig } from '../src/lib/engine/eigen';
import { dot, matVec } from '../src/lib/engine/linalg';
import { buildBuilding, shearFreqAnalytic } from '../src/lib/models/ayun/building';

const mat = (n: number, a: number[]) => ({ n, d: new Float64Array(a) });

describe('symGenEig', () => {
	it('matriks diagonal', () => {
		const e = symGenEig(mat(3, [9, 0, 0, 0, 4, 0, 0, 0, 16]), mat(3, [1, 0, 0, 0, 1, 0, 0, 0, 4]));
		expect(Array.from(e.omega)).toEqual([2, 2, 3]);
	});
	it('2 DOF dengan solusi tangan: k = m = 1, ω² = (3 ∓ √5)/2', () => {
		const M = mat(2, [1, 0, 0, 1]);
		const e = symGenEig(mat(2, [2, -1, -1, 1]), M);
		expect(e.omega[0] ** 2).toBeCloseTo((3 - Math.sqrt(5)) / 2, 12);
		expect(e.omega[1] ** 2).toBeCloseTo((3 + Math.sqrt(5)) / 2, 12);
		expect(dot(e.modes[0], matVec(M, e.modes[0]))).toBeCloseTo(1, 12);
		expect(dot(e.modes[0], matVec(M, e.modes[1]))).toBeCloseTo(0, 12);
	});
	it('A3: frekuensi alami gedung 5 lantai', () => {
		const b = buildBuilding({ n: 5, m: 1e5, k: 2e8, zeta: 0.05, h: 3.5 });
		const ref = [2.0259, 5.9135, 9.3221, 11.9755, 13.6586];
		for (let j = 0; j < 5; j++) {
			expect(b.eig.freq[j]).toBeCloseTo(ref[j], 3);
			expect(Math.abs(b.eig.freq[j] / shearFreqAnalytic(5, 1e5, 2e8, j + 1) - 1)).toBeLessThan(1e-6);
		}
	});
});
