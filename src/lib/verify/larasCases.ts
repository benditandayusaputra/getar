// Kasus verifikasi modul Laras (PLAN Bagian 9). Dipakai halaman /verifikasi dan scripts/verify.ts.
import { peakFreq } from '../engine/signal';
import { type BeamGeom, freqAnalytic, NODE1 } from '../models/laras/beamAnalytic';
import { beamModes, nodalPoints } from '../models/laras/beamFem';
import { synthStrike } from '../models/laras/synth';
import { type VerifyResult, type VerifyRow, orde, fmt } from './types';

const G: BeamGeom = { L: 0.25, b: 0.05, h: 0.01, E: 100e9, rho: 8700 };
const pct = (a: number, b: number) => (Math.abs(a - b) / Math.abs(b)) * 100;

export function runLaras(): VerifyResult {
	const rows: VerifyRow[] = [];
	const fa = [1, 2, 3].map((n) => freqAnalytic(G, n));
	const bm = beamModes(G, 20);

	// L1
	{
		const worst = Math.max(...fa.map((f, i) => pct(bm.freq[i], f)));
		rows.push({
			id: 'L1', skenario: 'f₁, f₂, f₃ FEM N = 20 (perunggu, L = 0,25 m, h = 0,010 m)',
			hasil: bm.freq.slice(0, 3).map((f) => fmt(f, 2)).join('; ') + ' Hz', acuan: fa.map((f) => fmt(f, 2)).join('; ') + ' Hz',
			galat: worst, satuanGalat: '% (maks)', target: '< 0,1%', lolos: worst < 0.1
		});
	}

	// L2: konvergensi terhadap N
	const Ns = [2, 4, 8, 16, 32];
	const e1: number[] = [];
	const e3: number[] = [];
	for (const N of Ns) {
		const b = beamModes(G, N);
		e1.push(pct(b.freq[0], fa[0]) / 100);
		e3.push(pct(b.freq[2], fa[2]) / 100);
	}
	// Orde dihitung terhadap ukuran elemen l = L/N pada rentang asimtotik (N = 8, 16, 32).
	// Jaring N = 2 dan 4 masih pra-asimtotik (elemen terlalu besar dibanding panjang gelombang mode), jadi hanya ditampilkan.
	const hs = Ns.map((N) => G.L / N);
	const o1 = orde(hs.slice(2), e1.slice(2));
	const o3 = orde(hs.slice(2), e3.slice(2));
	rows.push({
		id: 'L2a', skenario: 'Konvergensi FEM terhadap ukuran elemen: orde galat f₁ (rentang asimtotik N = 8, 16, 32)',
		hasil: fmt(o1, 3), acuan: '4 (teori)', galat: Math.abs(o1 - 4), satuanGalat: 'selisih orde', target: 'orde ≈ 4 (± 0,5)', lolos: Math.abs(o1 - 4) < 0.5
	});
	rows.push({
		id: 'L2b', skenario: 'Konvergensi FEM terhadap ukuran elemen: orde galat f₃ (rentang asimtotik N = 8, 16, 32)',
		hasil: fmt(o3, 3), acuan: '4 (teori)', galat: Math.abs(o3 - 4), satuanGalat: 'selisih orde', target: 'orde ≈ 4 (± 0,5)', lolos: Math.abs(o3 - 4) < 0.5
	});

	// L3: rasio frekuensi
	[1, 2].forEach((i) => {
		const r = bm.freq[i] / bm.freq[0];
		const ref = fa[i] / fa[0];
		rows.push({
			id: `L3 (f${i === 1 ? '₂' : '₃'}/f₁)`, skenario: 'Rasio frekuensi mode (tidak harmonik, ciri khas bilah)',
			hasil: fmt(r, 4), acuan: fmt(ref, 4), galat: pct(r, ref), satuanGalat: '%', target: '< 0,1%', lolos: pct(r, ref) < 0.1
		});
	});

	// L4: hukum skala
	{
		const f0 = bm.freq[0];
		const kasus: [string, BeamGeom, number][] = [
			['L × 2 → f / 4', { ...G, L: 2 * G.L }, 0.25],
			['h × 2 → f × 2', { ...G, h: 2 * G.h }, 2],
			['b × 2 → f tetap', { ...G, b: 2 * G.b }, 1]
		];
		for (const [nama, g, ref] of kasus) {
			const r = beamModes(g, 20).freq[0] / f0;
			rows.push({
				id: 'L4', skenario: `Hukum skala f ∝ h/L²: ${nama}`,
				hasil: fmt(r, 5), acuan: fmt(ref, 5), galat: pct(r, ref), satuanGalat: '%', target: '< 0,1%', lolos: pct(r, ref) < 0.1
			});
		}
	}

	// L5: titik simpul mode 1
	{
		const nodes = nodalPoints(bm.modes[0], bm.N, bm.L);
		const ref = [NODE1, 1 - NODE1];
		const worst = Math.max(...ref.map((r, i) => Math.abs((nodes[i] ?? NaN) - r))) * 100;
		rows.push({
			id: 'L5', skenario: 'Titik simpul mode 1 dari FEM (interpolasi Hermite)',
			hasil: nodes.map((x) => fmt(x, 4) + ' L').join('; '), acuan: ref.map((x) => fmt(x, 4) + ' L').join('; '),
			galat: worst, satuanGalat: '% L', target: '< 0,5% L', lolos: nodes.length === 2 && worst < 0.5
		});
	}

	// L6: nada bunyi sintesis
	{
		const fp = peakFreq(synthStrike(bm, 0.0003, 0.5), 44100);
		rows.push({
			id: 'L6', skenario: 'Puncak FFT bunyi sintesis (pukul di tengah, 44,1 kHz, 2,5 s)',
			hasil: fmt(fp, 2) + ' Hz', acuan: fmt(bm.freq[0], 2) + ' Hz (f₁ FEM)', galat: pct(fp, bm.freq[0]), satuanGalat: '%', target: '< 0,2%', lolos: pct(fp, bm.freq[0]) < 0.2
		});
	}

	return {
		rows,
		konvergensi: [{
			id: 'L2', judul: 'L2: galat relatif frekuensi FEM terhadap ukuran elemen', xLabel: 'l = L/N (m)', x: hs,
			seri: [{ nama: 'galat f₁', err: e1, orde: o1 }, { nama: 'galat f₃', err: e3, orde: o3 }]
		}]
	};
}
