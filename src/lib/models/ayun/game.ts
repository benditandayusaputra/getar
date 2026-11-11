// Mini-game "Selamatkan Gedung": level, harga penguat, dan penilaian.
import type { BuildingParams } from './building';
import type { GroundOpts } from './groundMotion';
import { denHartog, warburton } from './tmd';
import { THETA_IZIN } from './drift';

export const ANGGARAN = 100;
export const DURASI = 20; // detik gempa
export const HARGA = { bracing: 15, damper: 20, tmd2: 40, tmd5: 60 };

export interface Level {
	nama: string;
	deskripsi: string;
	building: BuildingParams;
	ground: GroundOpts;
	pelajaran: string;
}

// Amplitudo dikalibrasi supaya gedung tanpa penguat melewati batas 1,3 sampai 2,7 kali.
export const LEVELS: Level[] = [
	{
		nama: 'Gempa dekat',
		deskripsi: 'Gedung 3 lantai dihantam pulsa singkat 2 Hz dengan puncak 0,5 g, berulang tiap 5 detik.',
		building: { n: 3, m: 2e5, k: 1e8, zeta: 0.02, h: 3.5 },
		ground: { kind: 'pulsa', A: 0.5, f: 2 },
		pelajaran:
			'Beban kejut berlangsung terlalu singkat bagi TMD untuk ikut berayun. Yang menentukan adalah kekakuan dan redaman pada tingkat yang paling banyak bergeser, yaitu tingkat bawah.'
	},
	{
		nama: 'Gempa jauh',
		deskripsi: 'Gedung 8 lantai digoyang gelombang panjang 1,30 Hz (0,25 g), hampir sama dengan frekuensi alaminya 1,31 Hz.',
		building: { n: 8, m: 1e5, k: 2e8, zeta: 0.02, h: 3.5 },
		ground: { kind: 'sinus', A: 0.25, f: 1.3 },
		pelajaran:
			'Saat frekuensi gempa sama dengan frekuensi alami, simpangan hanya dibatasi oleh redaman. TMD menyerap energi tepat di frekuensi itu, sedangkan bracing menggeser frekuensi alami menjauhi gempa.'
	},
	{
		nama: 'Gempa sintetis',
		deskripsi: 'Gedung 6 lantai diguncang gempa acak berspektrum lebar (Kanai-Tajimi) dengan puncak 0,8 g.',
		building: { n: 6, m: 2e5, k: 1e8, zeta: 0.02, h: 3.5 },
		ground: { kind: 'sintetis', A: 0.8, f: 1, seed: 2026 },
		pelajaran:
			'Gempa nyata berisi banyak frekuensi sekaligus. Kombinasi kekakuan di tingkat bawah dan redaman tambahan bekerja di seluruh rentang frekuensi, tidak hanya di satu frekuensi seperti TMD.'
	}
];

export interface Loadout {
	bracing: boolean[]; // per tingkat
	damper: number; // jumlah peredam viskos (0 sampai 2), masing-masing +5% ζ
	tmd: 0 | 2 | 5; // rasio massa TMD dalam persen
	setelan: 'denhartog' | 'warburton' | 'manual';
	fManual: number;
}

export const loadoutKosong = (n: number): Loadout => ({ bracing: Array(n).fill(false), damper: 0, tmd: 0, setelan: 'warburton', fManual: 1 });

export function biaya(l: Loadout): number {
	return l.bracing.filter(Boolean).length * HARGA.bracing + l.damper * HARGA.damper + (l.tmd === 2 ? HARGA.tmd2 : l.tmd === 5 ? HARGA.tmd5 : 0);
}

export function terapkan(level: Level, l: Loadout): BuildingParams {
	const mu = l.tmd / 100;
	const opt = l.setelan === 'denhartog' ? denHartog(mu) : warburton(mu);
	return {
		...level.building,
		zeta: level.building.zeta + 0.05 * l.damper,
		kFactor: l.bracing.map((b) => (b ? 1.3 : 1)),
		tmd: l.tmd ? { mu, fRatio: l.setelan === 'manual' ? l.fManual : opt.fRatio, zeta: opt.zeta } : null
	};
}

/** 0 = gagal, 1 = lolos, 2 = margin > 20%, 3 = margin > 20% dan sisa anggaran ≥ 30 */
export function bintang(maxDrift: number, sisa: number): number {
	if (!(maxDrift < THETA_IZIN)) return 0;
	if (maxDrift >= 0.8 * THETA_IZIN) return 1;
	return sisa >= 30 ? 3 : 2;
}
