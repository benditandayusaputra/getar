// Integrator Newmark-β untuk M ü + C u̇ + K u = F(t), sistem linear (Chopra, Tabel 16.2.2).
import { type Mat, cholesky, cholSolve, matVec, dot } from './linalg';

export interface NewmarkOpts {
	M: Mat;
	C: Mat;
	K: Mat;
	dt: number;
	beta?: number; // default 1/4 (percepatan rata-rata, stabil tanpa syarat)
	gamma?: number; // default 1/2
}

export class Newmark {
	u: Float64Array;
	v: Float64Array;
	a: Float64Array;
	t = 0;
	readonly dt: number;
	private M: Mat;
	private C: Mat;
	private K: Mat;
	private beta: number;
	private gamma: number;
	private Lk: Mat; // faktor Cholesky dari K̂
	private Lm: Mat;

	constructor(o: NewmarkOpts) {
		const n = o.M.n;
		this.M = o.M;
		this.C = o.C;
		this.K = o.K;
		this.dt = o.dt;
		this.beta = o.beta ?? 0.25;
		this.gamma = o.gamma ?? 0.5;
		this.u = new Float64Array(n);
		this.v = new Float64Array(n);
		this.a = new Float64Array(n);
		const { beta, gamma, dt } = this;
		// K̂ = K + γ/(βΔt) C + 1/(βΔt²) M, difaktorkan sekali
		const Kh = { n, d: new Float64Array(n * n) };
		for (let i = 0; i < n * n; i++)
			Kh.d[i] = o.K.d[i] + (gamma / (beta * dt)) * o.C.d[i] + o.M.d[i] / (beta * dt * dt);
		this.Lk = cholesky(Kh);
		this.Lm = cholesky(o.M);
	}

	/** a0 = M⁻¹ (f0 − C v0 − K u0) */
	setInitial(u0: ArrayLike<number>, v0: ArrayLike<number>, f0: ArrayLike<number>): void {
		this.u.set(u0);
		this.v.set(v0);
		const cv = matVec(this.C, this.v);
		const ku = matVec(this.K, this.u);
		const r = new Float64Array(this.u.length);
		for (let i = 0; i < r.length; i++) r[i] = f0[i] - cv[i] - ku[i];
		this.a = cholSolve(this.Lm, r);
		this.t = 0;
	}

	step(fNext: ArrayLike<number>): void {
		const { beta, gamma, dt, u, v, a } = this;
		const n = u.length;
		const xm = new Float64Array(n);
		const xc = new Float64Array(n);
		for (let i = 0; i < n; i++) {
			xm[i] = u[i] / (beta * dt * dt) + v[i] / (beta * dt) + (1 / (2 * beta) - 1) * a[i];
			xc[i] = (gamma / (beta * dt)) * u[i] + (gamma / beta - 1) * v[i] + dt * (gamma / (2 * beta) - 1) * a[i];
		}
		const pm = matVec(this.M, xm);
		const pc = matVec(this.C, xc);
		for (let i = 0; i < n; i++) pm[i] += pc[i] + fNext[i];
		const un = cholSolve(this.Lk, pm);
		for (let i = 0; i < n; i++) {
			const du = un[i] - u[i];
			const vn = (gamma / (beta * dt)) * du + (1 - gamma / beta) * v[i] + dt * (1 - gamma / (2 * beta)) * a[i];
			const an = du / (beta * dt * dt) - v[i] / (beta * dt) - (1 / (2 * beta) - 1) * a[i];
			u[i] = un[i];
			v[i] = vn;
			a[i] = an;
		}
		this.t += dt;
	}

	energy(): { kinetic: number; potential: number } {
		return {
			kinetic: 0.5 * dot(this.v, matVec(this.M, this.v)),
			potential: 0.5 * dot(this.u, matVec(this.K, this.u))
		};
	}
}
