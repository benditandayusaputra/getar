// Loop simulasi Ayun: langkah fisika tetap, akumulator waktu, riwayat untuk grafik.
import { Newmark } from '../../engine/newmark';
import { buildBuilding, type BuildingModel, type BuildingParams } from './building';
import { groundAccel, G, type GroundOpts } from './groundMotion';
import { driftRatios } from './drift';

export const DT = 0.002;
const LOOP: Partial<Record<GroundOpts['kind'], number>> = { sapuan: 32, sintetis: 22, pulsa: 5 };

export interface SimConfig {
	building: BuildingParams;
	ground: GroundOpts;
}

export class AyunSim {
	model!: BuildingModel;
	nm!: Newmark;
	cfg!: SimConfig;
	t = 0;
	ug = 0; // perpindahan tanah (hanya untuk visual, integrasi bocor dari a_g)
	drift: Float64Array = new Float64Array(0); // rasio simpangan saat ini per tingkat
	peakDrift: Float64Array = new Float64Array(0); // maksimum mutlak per tingkat
	peakRoof = 0;
	ht: number[] = []; // riwayat waktu (cuplik tiap 0,01 s)
	hr: number[] = []; // riwayat perpindahan atap
	private ag!: (t: number) => number;
	private vg = 0;
	private phase = 0;
	private acc = 0;
	private count = 0;
	private f!: Float64Array;

	constructor(cfg: SimConfig) {
		this.rebuild(cfg);
	}

	/** Rakit ulang matriks. State dipertahankan bila jumlah DOF sama. */
	rebuild(cfg: SimConfig): void {
		const old = this.nm;
		this.cfg = cfg;
		this.model = buildBuilding(cfg.building);
		this.ag = groundAccel(cfg.ground);
		this.nm = new Newmark({ M: this.model.M, C: this.model.C, K: this.model.K, dt: DT });
		this.f = new Float64Array(this.model.ndof);
		if (old && old.u.length === this.model.ndof) {
			this.nm.setInitial(old.u, old.v, this.force(this.accel()));
			this.nm.t = old.t;
		} else this.reset();
	}

	reset(): void {
		const n = this.model.n;
		this.nm.setInitial(this.f.fill(0), this.f, this.f);
		this.t = this.ug = this.vg = this.phase = this.acc = this.peakRoof = this.count = 0;
		this.drift = new Float64Array(n);
		this.peakDrift = new Float64Array(n);
		this.ht = [];
		this.hr = [];
	}

	private accel(): number {
		const g = this.cfg.ground;
		// sinus memakai akumulasi fase supaya mengubah frekuensi di tengah jalan tidak membuat loncatan
		if (g.kind === 'sinus') return g.A * G * Math.min(1, this.t / 2) * Math.sin(this.phase);
		const loop = LOOP[g.kind];
		return this.ag(loop ? this.t % loop : this.t);
	}

	private force(a: number): Float64Array {
		for (let i = 0; i < this.f.length; i++) this.f[i] = -this.model.mass[i] * a;
		return this.f;
	}

	step(): void {
		this.t += DT;
		this.phase += 2 * Math.PI * this.cfg.ground.f * DT;
		const a = this.accel();
		this.nm.step(this.force(a));
		const leak = 1 - 1.5 * DT;
		this.vg = (this.vg + a * DT) * leak;
		this.ug = (this.ug + this.vg * DT) * leak;
		const { n, h } = this.model;
		this.drift = driftRatios(this.nm.u, n, h);
		for (let i = 0; i < n; i++) this.peakDrift[i] = Math.max(this.peakDrift[i], Math.abs(this.drift[i]));
		const roof = this.nm.u[n - 1];
		this.peakRoof = Math.max(this.peakRoof, Math.abs(roof));
		if (++this.count % 5 === 0) {
			this.ht.push(this.t);
			this.hr.push(roof);
			if (this.ht.length > 3000) {
				this.ht = this.ht.slice(-2500);
				this.hr = this.hr.slice(-2500);
			}
		}
	}

	/** Majukan simulasi sebesar waktu nyata realDt × speed, maksimal 50 × speed substep per frame */
	advance(realDt: number, speed = 1): void {
		this.acc += realDt * speed;
		let k = 0;
		while (this.acc >= DT && k++ < 50 * speed) {
			this.step();
			this.acc -= DT;
		}
		if (this.acc > DT) this.acc = 0; // tab lambat: buang sisa supaya tidak mengejar
	}

	get maxDrift(): number {
		return Math.max(...this.peakDrift);
	}
	get tmdU(): number | null {
		return this.model.ndof > this.model.n ? this.nm.u[this.model.n] : null;
	}
}

/** Jalankan tanpa tampilan selama dur detik */
export function simulate(cfg: SimConfig, dur: number): { t: number[]; roof: number[]; maxDrift: number; peakDrift: Float64Array } {
	const s = new AyunSim(cfg);
	const N = Math.round(dur / DT);
	for (let i = 0; i < N; i++) s.step();
	return { t: s.ht, roof: s.hr, maxDrift: s.maxDrift, peakDrift: s.peakDrift };
}
