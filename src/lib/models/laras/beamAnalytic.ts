// Balok Euler-Bernoulli ujung bebas: solusi analitik.

/** Akar ke-n dari cos(x) cosh(x) = 1 (n = 1, 2, ...), dicari dengan Newton */
export function betaL(n: number): number {
	let x = (n + 0.5) * Math.PI;
	for (let i = 0; i < 20; i++) {
		const f = Math.cos(x) * Math.cosh(x) - 1;
		const df = -Math.sin(x) * Math.cosh(x) + Math.cos(x) * Math.sinh(x);
		x -= f / df;
	}
	return x;
}

export interface BeamGeom {
	L: number;
	b: number;
	h: number;
	E: number;
	rho: number;
}

/** f_n = (β_n L)² / (2π L²) · √(EI / ρA), dengan √(EI/ρA) = h √(E / 12ρ) */
export function freqAnalytic(g: BeamGeom, n: number): number {
	const bl = betaL(n);
	return ((bl * bl) / (2 * Math.PI * g.L * g.L)) * g.h * Math.sqrt(g.E / (12 * g.rho));
}

/** Bentuk mode analitik ke-n pada ξ = x/L (belum dinormalisasi) */
export function modeShapeAnalytic(n: number, xi: number): number {
	const bl = betaL(n);
	const s = (Math.cosh(bl) - Math.cos(bl)) / (Math.sinh(bl) - Math.sin(bl));
	const x = bl * xi;
	return Math.cosh(x) + Math.cos(x) - s * (Math.sinh(x) + Math.sin(x));
}

/** Akar fungsi pada [a, b] dengan bagi dua */
export function bisect(fn: (x: number) => number, a: number, b: number): number {
	let fa = fn(a);
	for (let i = 0; i < 60; i++) {
		const m = 0.5 * (a + b);
		const fm = fn(m);
		if (fa * fm <= 0) b = m;
		else {
			a = m;
			fa = fm;
		}
	}
	return 0.5 * (a + b);
}

/** Titik simpul mode 1 (ξ), analitik: 0,2242 dan 0,7758 */
export const NODE1 = bisect((x) => modeShapeAnalytic(1, x), 0.1, 0.4);
