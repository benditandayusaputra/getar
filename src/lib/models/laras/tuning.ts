// Laras slendro diidealkan: 5 nada berjarak sama 240 cents, nada dasar 500 Hz.
export const SLENDRO_NAMA = ['ji (1)', 'ro (2)', 'lu (3)', 'ma (5)', 'nem (6)'];
export const SLENDRO_DASAR = 500;
export const SLENDRO = SLENDRO_NAMA.map((_, i) => SLENDRO_DASAR * 2 ** ((i * 240) / 1200));

export function cents(f: number, ref: number): number {
	return 1200 * Math.log2(f / ref);
}

/** Nada slendro terdekat (lintas oktaf) dan selisihnya dalam cents */
export function nearestNote(f: number): { nama: string; target: number; cents: number } {
	const c = cents(f, SLENDRO_DASAR);
	const step = Math.round(c / 240);
	const idx = ((step % 5) + 5) % 5;
	const okt = Math.floor(step / 5);
	return {
		nama: SLENDRO_NAMA[idx] + (okt === 0 ? '' : okt > 0 ? ` +${okt} oktaf` : ` ${okt} oktaf`),
		target: SLENDRO_DASAR * 2 ** ((step * 240) / 1200),
		cents: c - step * 240
	};
}
