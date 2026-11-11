import { describe, it, expect } from 'vitest';
import { LEVELS, DURASI, ANGGARAN, loadoutKosong, terapkan, biaya, bintang, type Loadout } from '../src/lib/models/ayun/game';
import { simulate } from '../src/lib/models/ayun/sim';
import { THETA_IZIN } from '../src/lib/models/ayun/drift';

const uji = (i: number, ubah: (l: Loadout) => void) => {
	const L = LEVELS[i];
	const l = loadoutKosong(L.building.n);
	ubah(l);
	const d = simulate({ building: terapkan(L, l), ground: L.ground }, DURASI).maxDrift;
	return { d, bintang: bintang(d, ANGGARAN - biaya(l)), biaya: biaya(l) };
};

describe('Mini-game Selamatkan Gedung', () => {
	it('tanpa penguat, semua level gagal', () => {
		for (let i = 0; i < 3; i++) expect(uji(i, () => {}).d).toBeGreaterThan(THETA_IZIN * 1.25);
	});
	it('tiap level punya solusi bintang 3 dalam anggaran', () => {
		const solusi: ((l: Loadout) => void)[] = [
			(l) => ((l.bracing[0] = true), (l.damper = 1)),
			(l) => (l.tmd = 2),
			(l) => ((l.bracing[0] = l.bracing[1] = true), (l.damper = 1))
		];
		solusi.forEach((s, i) => {
			const r = uji(i, s);
			console.log(`level ${i + 1}: simpangan ${(r.d / THETA_IZIN * 100).toFixed(0)}% batas, biaya ${r.biaya}, bintang ${r.bintang}`);
			expect(r.bintang).toBe(3);
		});
	});
	it('TMD yang salah setel gagal di level 2', () => {
		expect(uji(1, (l) => ((l.tmd = 2), (l.setelan = 'manual'), (l.fManual = 0.8))).bintang).toBe(0);
	});
});
