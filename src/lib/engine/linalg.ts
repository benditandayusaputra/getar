// Aljabar linear padat untuk matriks kecil (n sampai sekitar 100). Semua satuan SI.
export type Mat = { n: number; d: Float64Array }; // d[i*n + j], row-major

export function zeros(n: number): Mat {
	return { n, d: new Float64Array(n * n) };
}

/** a·A + b·B */
export function lincomb(a: number, A: Mat, b: number, B: Mat): Mat {
	const R = zeros(A.n);
	for (let i = 0; i < R.d.length; i++) R.d[i] = a * A.d[i] + b * B.d[i];
	return R;
}

/** Faktorisasi Cholesky A = L Lᵀ (L segitiga bawah). Melempar error kalau A tidak SPD. */
export function cholesky(A: Mat): Mat {
	const n = A.n;
	const L = zeros(n);
	const a = A.d;
	const l = L.d;
	for (let i = 0; i < n; i++) {
		for (let j = 0; j <= i; j++) {
			let s = a[i * n + j];
			for (let k = 0; k < j; k++) s -= l[i * n + k] * l[j * n + k];
			if (i === j) {
				if (!(s > 0)) throw new Error('Matriks tidak simetris definit positif');
				l[i * n + i] = Math.sqrt(s);
			} else l[i * n + j] = s / l[j * n + j];
		}
	}
	return L;
}

/** Selesaikan L y = b */
export function forwardSub(L: Mat, b: ArrayLike<number>): Float64Array {
	const n = L.n;
	const y = new Float64Array(n);
	for (let i = 0; i < n; i++) {
		let s = b[i];
		for (let k = 0; k < i; k++) s -= L.d[i * n + k] * y[k];
		y[i] = s / L.d[i * n + i];
	}
	return y;
}

/** Selesaikan Lᵀ x = y */
export function backSubT(L: Mat, y: ArrayLike<number>): Float64Array {
	const n = L.n;
	const x = new Float64Array(n);
	for (let i = n - 1; i >= 0; i--) {
		let s = y[i];
		for (let k = i + 1; k < n; k++) s -= L.d[k * n + i] * x[k];
		x[i] = s / L.d[i * n + i];
	}
	return x;
}

/** Selesaikan A x = b dengan faktor Cholesky L dari A */
export function cholSolve(L: Mat, b: ArrayLike<number>): Float64Array {
	return backSubT(L, forwardSub(L, b));
}

export function matVec(A: Mat, x: ArrayLike<number>): Float64Array {
	const n = A.n;
	const y = new Float64Array(n);
	for (let i = 0; i < n; i++) {
		let s = 0;
		for (let j = 0; j < n; j++) s += A.d[i * n + j] * x[j];
		y[i] = s;
	}
	return y;
}

export function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
	let s = 0;
	for (let i = 0; i < a.length; i++) s += a[i] * b[i];
	return s;
}

/** Selesaikan A x = b untuk A umum (eliminasi Gauss dengan pivot parsial). A dan b ditimpa. */
export function solve(A: Mat, b: Float64Array): Float64Array {
	const n = A.n;
	const a = A.d;
	for (let c = 0; c < n; c++) {
		let p = c;
		for (let r = c + 1; r < n; r++) if (Math.abs(a[r * n + c]) > Math.abs(a[p * n + c])) p = r;
		if (a[p * n + c] === 0) throw new Error('Matriks singular');
		if (p !== c) {
			for (let j = 0; j < n; j++) [a[c * n + j], a[p * n + j]] = [a[p * n + j], a[c * n + j]];
			[b[c], b[p]] = [b[p], b[c]];
		}
		for (let r = c + 1; r < n; r++) {
			const f = a[r * n + c] / a[c * n + c];
			if (f === 0) continue;
			for (let j = c; j < n; j++) a[r * n + j] -= f * a[c * n + j];
			b[r] -= f * b[c];
		}
	}
	const x = new Float64Array(n);
	for (let i = n - 1; i >= 0; i--) {
		let s = b[i];
		for (let j = i + 1; j < n; j++) s -= a[i * n + j] * x[j];
		x[i] = s / a[i * n + i];
	}
	return x;
}
