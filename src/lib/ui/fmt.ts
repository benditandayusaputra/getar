/** Format angka gaya Indonesia (koma desimal) */
export const f = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d).replace('.', ',') : '...');
