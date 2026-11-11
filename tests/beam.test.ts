import { describe, it, expect } from 'vitest';
import { runLaras } from '../src/lib/verify/larasCases';
import { freqAnalytic, betaL, NODE1 } from '../src/lib/models/laras/beamAnalytic';
import { SLENDRO } from '../src/lib/models/laras/tuning';

describe('Balok (kasus verifikasi Laras)', () => {
	it('nilai analitik sesuai PLAN', () => {
		expect(betaL(1)).toBeCloseTo(4.730041, 6);
		expect(betaL(2)).toBeCloseTo(7.853205, 6);
		expect(betaL(3)).toBeCloseTo(10.995608, 6);
		const g = { L: 0.25, b: 0.05, h: 0.01, E: 100e9, rho: 8700 };
		expect(freqAnalytic(g, 1)).toBeCloseTo(557.6, 1);
		expect(freqAnalytic(g, 2)).toBeCloseTo(1537.03, 1);
		expect(freqAnalytic(g, 3)).toBeCloseTo(3013.2, 1);
		expect(NODE1).toBeCloseTo(0.2242, 4);
		expect(SLENDRO.map((f) => f.toFixed(2))).toEqual(['500.00', '574.35', '659.75', '757.86', '870.55']);
	});
	const rows = runLaras().rows;
	for (const r of rows) it(`${r.id}: ${r.skenario}`, () => expect(r.lolos).toBe(true));
});
