import { describe, it, expect } from 'vitest';
import { zeros, cholesky, cholSolve, matVec } from '../src/lib/engine/linalg';

describe('linalg', () => {
	it('Cholesky dan solve pada matriks acak SPD', () => {
		let s = 42;
		const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) - 0.5;
		for (const n of [1, 3, 8, 20]) {
			const B = zeros(n);
			for (let i = 0; i < n * n; i++) B.d[i] = rnd();
			const A = zeros(n); // A = B Bᵀ + n I
			for (let i = 0; i < n; i++)
				for (let j = 0; j < n; j++) {
					let v = i === j ? n : 0;
					for (let k = 0; k < n; k++) v += B.d[i * n + k] * B.d[j * n + k];
					A.d[i * n + j] = v;
				}
			const x = Float64Array.from({ length: n }, rnd);
			const sol = cholSolve(cholesky(A), matVec(A, x));
			for (let i = 0; i < n; i++) expect(sol[i]).toBeCloseTo(x[i], 10);
		}
	});
	it('menolak matriks yang tidak SPD', () => {
		expect(() => cholesky({ n: 2, d: new Float64Array([1, 2, 2, 1]) })).toThrow();
	});
});
