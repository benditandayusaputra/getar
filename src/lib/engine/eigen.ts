// Masalah eigen umum simetris (K − ω² M) φ = 0: Cholesky pada M, lalu Jacobi siklik.
import { type Mat, zeros, cholesky, forwardSub, backSubT } from './linalg';

export interface EigenResult {
	omega: Float64Array; // rad/s, urut naik
	freq: Float64Array; // Hz
	modes: Float64Array[]; // ternormalisasi massa: φᵀ M φ = 1
}

export function symGenEig(K: Mat, M: Mat, opts: { tol?: number; maxSweeps?: number } = {}): EigenResult {
	const n = K.n;
	const tol = opts.tol ?? 1e-12;
	const maxSweeps = opts.maxSweeps ?? 60;
	const L = cholesky(M);

	// A = L⁻¹ K L⁻ᵀ
	const X = zeros(n); // X = L⁻¹ K
	const col = new Float64Array(n);
	for (let j = 0; j < n; j++) {
		for (let i = 0; i < n; i++) col[i] = K.d[i * n + j];
		const y = forwardSub(L, col);
		for (let i = 0; i < n; i++) X.d[i * n + j] = y[i];
	}
	const a = new Float64Array(n * n);
	for (let i = 0; i < n; i++) a.set(forwardSub(L, X.d.subarray(i * n, i * n + n)), i * n);
	for (let i = 0; i < n; i++)
		for (let j = 0; j < i; j++) a[i * n + j] = a[j * n + i] = 0.5 * (a[i * n + j] + a[j * n + i]);

	// Jacobi siklik: A ← Jᵀ A J sampai off-diagonal relatif < tol
	const v = new Float64Array(n * n);
	for (let i = 0; i < n; i++) v[i * n + i] = 1;
	for (let sweep = 0; sweep < maxSweeps; sweep++) {
		let off = 0;
		let diag = 0;
		for (let i = 0; i < n; i++) {
			diag += a[i * n + i] ** 2;
			for (let j = i + 1; j < n; j++) off += a[i * n + j] ** 2;
		}
		if (off <= tol * tol * diag) break;
		for (let p = 0; p < n - 1; p++) {
			for (let q = p + 1; q < n; q++) {
				const apq = a[p * n + q];
				if (apq === 0) continue;
				const theta = (a[q * n + q] - a[p * n + p]) / (2 * apq);
				const t = (theta < 0 ? -1 : 1) / (Math.abs(theta) + Math.hypot(theta, 1));
				const c = 1 / Math.hypot(t, 1);
				const s = t * c;
				for (let k = 0; k < n; k++) {
					const akp = a[k * n + p];
					const akq = a[k * n + q];
					a[k * n + p] = c * akp - s * akq;
					a[k * n + q] = s * akp + c * akq;
				}
				for (let k = 0; k < n; k++) {
					const apk = a[p * n + k];
					const aqk = a[q * n + k];
					a[p * n + k] = c * apk - s * aqk;
					a[q * n + k] = s * apk + c * aqk;
				}
				for (let k = 0; k < n; k++) {
					const vkp = v[k * n + p];
					const vkq = v[k * n + q];
					v[k * n + p] = c * vkp - s * vkq;
					v[k * n + q] = s * vkp + c * vkq;
				}
			}
		}
	}

	const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => a[i * n + i] - a[j * n + j]);
	const omega = new Float64Array(n);
	const freq = new Float64Array(n);
	const modes: Float64Array[] = [];
	const y = new Float64Array(n);
	order.forEach((idx, r) => {
		// ω² negatif kecil (mode benda kaku, galat pembulatan) dipotong ke 0
		omega[r] = Math.sqrt(Math.max(0, a[idx * n + idx]));
		freq[r] = omega[r] / (2 * Math.PI);
		for (let k = 0; k < n; k++) y[k] = v[k * n + idx];
		modes.push(backSubT(L, y)); // φ = L⁻ᵀ y
	});
	return { omega, freq, modes };
}
