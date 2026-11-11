export interface VerifyRow {
	id: string;
	skenario: string;
	hasil: string;
	acuan: string;
	galat: number; // persen, atau nilai lain sesuai satuanGalat
	satuanGalat: string;
	target: string;
	lolos: boolean;
}

export interface Konvergensi {
	id: string;
	judul: string;
	xLabel: string;
	x: number[];
	seri: { nama: string; err: number[]; orde: number }[];
}

export interface VerifyResult {
	rows: VerifyRow[];
	konvergensi: Konvergensi[];
}

/** Kemiringan regresi linear log(err) terhadap log(x) */
export function orde(x: number[], err: number[]): number {
	const lx = x.map(Math.log);
	const ly = err.map(Math.log);
	const mx = lx.reduce((a, b) => a + b) / lx.length;
	const my = ly.reduce((a, b) => a + b) / ly.length;
	let num = 0;
	let den = 0;
	for (let i = 0; i < lx.length; i++) {
		num += (lx[i] - mx) * (ly[i] - my);
		den += (lx[i] - mx) ** 2;
	}
	return num / den;
}

export const fmt = (x: number, d = 4) => x.toFixed(d).replace('.', ',');
export const fmtE = (x: number) => x.toExponential(2).replace('.', ',');

export const fmtGalat = (x: number) => (x === 0 ? '0' : Math.abs(x) < 1e-3 ? fmtE(x) : x.toFixed(4).replace('.', ','));

export function toCsv(rows: VerifyRow[]): string {
	const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
	return (
		'ID,Skenario,Hasil simulasi,Nilai acuan,Galat,Satuan galat,Target,Status\n' +
		rows.map((x) => [x.id, x.skenario, x.hasil, x.acuan, String(x.galat), x.satuanGalat, x.target, x.lolos ? 'Lolos' : 'Tidak lolos'].map(q).join(',')).join('\n') +
		'\n'
	);
}
