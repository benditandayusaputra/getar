import { describe, it, expect } from 'vitest';
import { runAyun } from '../src/lib/verify/ayunCases';

describe('Newmark (kasus verifikasi Ayun)', () => {
	const rows = runAyun().rows;
	for (const id of ['A1a', 'A1b', 'A1c', 'A2', 'A4', 'A6', 'A7'])
		it(id, () => expect(rows.find((r) => r.id === id)?.lolos).toBe(true));
	it('A5', () => expect(rows.filter((r) => r.id.startsWith('A5')).every((r) => r.lolos)).toBe(true));
});
