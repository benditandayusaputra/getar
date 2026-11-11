// Kasus verifikasi modul Ayun (PLAN Bagian 9). Dipakai halaman /verifikasi dan scripts/verify.ts.
import { type Mat } from '../engine/linalg';
import { Newmark } from '../engine/newmark';
import { zeroCrossPeriod } from '../engine/signal';
import { buildBuilding, shearFreqAnalytic } from '../models/ayun/building';
import { warburton, denHartog, numericOptimalTuning } from '../models/ayun/tmd';
import { type VerifyResult, type VerifyRow, orde, fmt, fmtE } from './types';

const one = (x: number): Mat => ({ n: 1, d: new Float64Array([x]) });

// Sistem SDOF A1
const m = 1.0e5;
const k = 4.0e6;
const zeta = 0.05;
const u0 = 0.05;
const w = Math.sqrt(k / m);
const wd = w * Math.sqrt(1 - zeta * zeta);
const c = 2 * zeta * Math.sqrt(k * m);
const exactA1 = (t: number) =>
	Math.exp(-zeta * w * t) * (u0 * Math.cos(wd * t) + ((zeta * w * u0) / wd) * Math.sin(wd * t));

function runA1(dt: number, dur = 10) {
	const nm = new Newmark({ M: one(m), C: one(c), K: one(k), dt });
	nm.setInitial([u0], [0], [0]);
	const N = Math.round(dur / dt);
	const t = new Float64Array(N + 1);
	const u = new Float64Array(N + 1);
	u[0] = u0;
	let maxErr = 0;
	for (let i = 1; i <= N; i++) {
		nm.step([0]);
		t[i] = i * dt;
		u[i] = nm.u[0];
		maxErr = Math.max(maxErr, Math.abs(u[i] - exactA1(t[i])));
	}
	return { t, u, maxErr };
}

/** Puncak lokal positif ke-idx (idx = 0 adalah t = 0), diperhalus dengan parabola */
function peakValue(u: Float64Array, idx: number): number {
	if (idx === 0) return u[0];
	let count = 0;
	for (let i = 1; i < u.length - 1; i++) {
		if (u[i] > u[i - 1] && u[i] >= u[i + 1] && u[i] > 0) {
			count++;
			if (count === idx) {
				const d = u[i - 1] - 2 * u[i] + u[i + 1];
				const p = d === 0 ? 0 : (0.5 * (u[i - 1] - u[i + 1])) / d;
				return u[i] - 0.25 * (u[i - 1] - u[i + 1]) * p;
			}
		}
	}
	return NaN;
}

export function runAyun(): VerifyResult {
	const rows: VerifyRow[] = [];
	const pct = (a: number, b: number) => (Math.abs(a - b) / Math.abs(b)) * 100;

	// A1: getaran bebas teredam SDOF
	{
		const { t, u, maxErr } = runA1(0.01);
		const Td = (2 * Math.PI) / wd;
		const T = zeroCrossPeriod(t, u);
		rows.push({
			id: 'A1a', skenario: 'SDOF getaran bebas teredam: periode teredam T_d (Δt = 0,01 s)',
			hasil: fmt(T, 5) + ' s', acuan: fmt(Td, 5) + ' s', galat: pct(T, Td), satuanGalat: '%', target: '< 0,5%', lolos: pct(T, Td) < 0.5
		});
		const e = (maxErr / u0) * 100;
		rows.push({
			id: 'A1b', skenario: 'SDOF getaran bebas teredam: galat maksimum u(t) selama 10 s',
			hasil: fmtE(maxErr) + ' m', acuan: 'solusi analitik', galat: e, satuanGalat: '% u₀', target: '< 1% u₀', lolos: e < 1
		});
		const ratio = peakValue(u, 5) / u0;
		const ref = Math.exp((-5 * 2 * Math.PI * zeta) / Math.sqrt(1 - zeta * zeta));
		rows.push({
			id: 'A1c', skenario: 'SDOF getaran bebas teredam: rasio amplitudo setelah 5 siklus',
			hasil: fmt(ratio, 5), acuan: fmt(ref, 5), galat: pct(ratio, ref), satuanGalat: '%', target: '< 1%', lolos: pct(ratio, ref) < 1
		});
	}

	// A2: konvergensi Δt
	const dts = [0.05, 0.02, 0.01, 0.005, 0.001];
	const errs = dts.map((dt) => runA1(dt).maxErr);
	const ordeA2 = orde(dts, errs);
	rows.push({
		id: 'A2', skenario: 'Konvergensi Newmark terhadap Δt (0,05 sampai 0,001 s): orde galat',
		hasil: fmt(ordeA2, 3), acuan: '2 (teori)', galat: Math.abs(ordeA2 - 2), satuanGalat: 'selisih orde', target: 'orde ≈ 2 (± 0,2)', lolos: Math.abs(ordeA2 - 2) < 0.2
	});

	// A3: frekuensi alami gedung 5 lantai
	const P5 = { n: 5, m: 1.0e5, k: 2.0e8, zeta: 0, h: 3.5 };
	const b5 = buildBuilding(P5);
	{
		let worst = 0;
		const num: string[] = [];
		const ref: string[] = [];
		for (let j = 1; j <= 5; j++) {
			const fa = shearFreqAnalytic(5, P5.m, P5.k, j);
			worst = Math.max(worst, pct(b5.eig.freq[j - 1], fa));
			num.push(fmt(b5.eig.freq[j - 1], 4));
			ref.push(fmt(fa, 4));
		}
		rows.push({
			id: 'A3', skenario: 'Frekuensi alami gedung 5 lantai (default) dari symGenEig',
			hasil: num.join('; ') + ' Hz', acuan: ref.join('; ') + ' Hz', galat: worst, satuanGalat: '% (maks)', target: '< 0,01%', lolos: worst < 0.01
		});
	}

	// A4: pemanjangan periode Newmark pada mode 1 (tanpa redaman)
	{
		const dt = 0.01;
		const nm = new Newmark({ M: b5.M, C: b5.C, K: b5.K, dt });
		const phi = b5.eig.modes[0];
		nm.setInitial(phi.map((x) => (0.01 * x) / phi[4]), new Float64Array(5), new Float64Array(5));
		const N = Math.round(30 / dt);
		const t = new Float64Array(N + 1);
		const u = new Float64Array(N + 1);
		u[0] = nm.u[4];
		const f0 = new Float64Array(5);
		for (let i = 1; i <= N; i++) {
			nm.step(f0);
			t[i] = i * dt;
			u[i] = nm.u[4];
		}
		const T1 = 1 / b5.eig.freq[0];
		const T = zeroCrossPeriod(t, u);
		const elong = (T / T1 - 1) * 100;
		const teori = ((b5.eig.omega[0] * dt) ** 2 / 12) * 100;
		rows.push({
			id: 'A4', skenario: 'Pemanjangan periode mode 1 oleh Newmark (Δt = 0,01 s, tanpa redaman)',
			hasil: `T = ${fmt(T, 5)} s (+${fmt(elong, 4)}%)`, acuan: `T₁ = ${fmt(T1, 5)} s, teori (ωΔt)²/12 = +${fmt(teori, 4)}%`,
			galat: Math.abs(elong - teori), satuanGalat: 'poin %', target: 'selisih < 0,01 poin %', lolos: Math.abs(elong - teori) < 0.01
		});
	}

	// A5: respons tunak SDOF terhadap percepatan tanah sinus
	{
		const A = 0.1 * 9.81;
		const dt = 0.002;
		for (const r of [0.5, 0.9, 1.0, 1.1, 2.0]) {
			const W = r * w;
			const nm = new Newmark({ M: one(m), C: one(c), K: one(k), dt });
			const N = Math.round(80 / dt);
			let U = 0;
			for (let i = 1; i <= N; i++) {
				nm.step([-m * A * Math.sin(W * i * dt)]);
				if (i * dt > 70) U = Math.max(U, Math.abs(nm.u[0]));
			}
			const D = U / (A / (w * w));
			const ref = 1 / Math.sqrt((1 - r * r) ** 2 + (2 * zeta * r) ** 2);
			rows.push({
				id: `A5 (r = ${fmt(r, 1)})`, skenario: 'Faktor pembesaran tunak SDOF terhadap percepatan tanah sinus',
				hasil: fmt(D, 4), acuan: fmt(ref, 4), galat: pct(D, ref), satuanGalat: '%', target: '< 1%', lolos: pct(D, ref) < 1
			});
		}
	}

	// A6: kekekalan energi tanpa redaman, 5 lantai, 100 s
	{
		const dt = 0.01;
		const nm = new Newmark({ M: b5.M, C: b5.C, K: b5.K, dt });
		nm.setInitial([0.01, 0.025, 0.02, 0.04, 0.05], new Float64Array(5), new Float64Array(5));
		const E = () => {
			const e = nm.energy();
			return e.kinetic + e.potential;
		};
		const E0 = E();
		let dev = 0;
		const f0 = new Float64Array(5);
		for (let i = 0; i < 10000; i++) {
			nm.step(f0);
			dev = Math.max(dev, Math.abs(E() - E0) / E0);
		}
		rows.push({
			id: 'A6', skenario: 'Kekekalan energi tanpa redaman, 5 lantai, 100 s (10.000 langkah)',
			hasil: fmtE(dev), acuan: '0 (energi konstan)', galat: dev, satuanGalat: 'relatif', target: '< 1×10⁻⁶', lolos: dev < 1e-6
		});
	}

	// A7: rasio penyetelan optimum TMD μ = 2%
	{
		const mu = 0.02;
		const wb = warburton(mu);
		const best = numericOptimalTuning(mu, wb.zeta);
		rows.push({
			id: 'A7', skenario: 'TMD μ = 2%: rasio penyetelan optimum dari sapuan numerik respons frekuensi 2 DOF',
			hasil: fmt(best.fRatio, 4), acuan: `Warburton ${fmt(wb.fRatio, 4)} (Den Hartog ${fmt(denHartog(mu).fRatio, 4)})`,
			galat: pct(best.fRatio, wb.fRatio), satuanGalat: '%', target: '< 1%', lolos: pct(best.fRatio, wb.fRatio) < 1
		});
	}

	return {
		rows,
		konvergensi: [{ id: 'A2', judul: 'A2: galat maksimum Newmark terhadap Δt', xLabel: 'Δt (s)', x: dts, seri: [{ nama: 'galat maks u (m)', err: errs, orde: ordeA2 }] }]
	};
}
