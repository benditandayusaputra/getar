// Menjalankan semua kasus verifikasi dan menulis tabel ke verify-output/ (dipakai untuk laporan).
import { mkdirSync, writeFileSync } from 'node:fs';
import { runAyun } from '../src/lib/verify/ayunCases';
import { runLaras } from '../src/lib/verify/larasCases';
import { type VerifyResult, fmtE, fmtGalat as g, toCsv } from '../src/lib/verify/types';
import { buildBuilding, shearFreqAnalytic } from '../src/lib/models/ayun/building';
import { simulate } from '../src/lib/models/ayun/sim';
import { warburton, denHartog } from '../src/lib/models/ayun/tmd';
import { beamModes } from '../src/lib/models/laras/beamFem';
import { freqAnalytic } from '../src/lib/models/laras/beamAnalytic';

function md(judul: string, r: VerifyResult): string {
	let s = `# ${judul}\n\n| ID | Skenario | Hasil simulasi | Nilai acuan | Galat | Target | Status |\n|---|---|---|---|---|---|---|\n`;
	for (const x of r.rows)
		s += `| ${x.id} | ${x.skenario} | ${x.hasil} | ${x.acuan} | ${g(x.galat)} ${x.satuanGalat} | ${x.target} | ${x.lolos ? 'Lolos' : 'TIDAK LOLOS'} |\n`;
	for (const k of r.konvergensi) {
		s += `\n## ${k.judul}\n\n| ${k.xLabel} | ${k.seri.map((z) => z.nama).join(' | ')} |\n|---|${k.seri.map(() => '---').join('|')}|\n`;
		k.x.forEach((x, i) => (s += `| ${g(x)} | ${k.seri.map((z) => fmtE(z.err[i])).join(' | ')} |\n`));
		s += `\nOrde konvergensi (kemiringan log-log): ${k.seri.map((z) => `${z.nama} = ${z.orde.toFixed(3).replace('.', ',')}`).join('; ')}\n`;
	}
	return s;
}

const ayun = runAyun();
const laras = runLaras();
mkdirSync('verify-output', { recursive: true });
writeFileSync('verify-output/ayun.md', md('Verifikasi modul Ayun', ayun));
writeFileSync('verify-output/laras.md', md('Verifikasi modul Laras', laras));
const all = [...ayun.rows, ...laras.rows];
writeFileSync('verify-output/semua.csv', toCsv(all));
for (const x of all) console.log(`${x.lolos ? 'LOLOS' : 'GAGAL'}  ${x.id.padEnd(14)} ${x.hasil}  |  acuan ${x.acuan}  |  galat ${g(x.galat)} ${x.satuanGalat}`);
const gagal = all.filter((x) => !x.lolos).length;
console.log(`\n${all.length - gagal}/${all.length} kasus lolos. Keluaran: verify-output/ayun.md, laras.md, semua.csv`);

// ---------------------------------------------------------------------------
// Angka untuk laporan teknis: verify-output/laporan.json (kunci = nomor urut placeholder [ISI] di templat laporan)
// dan verify-output/laporan.md (versi terbaca). Dipakai oleh 03_Laporan/isi_laporan.py.
// ---------------------------------------------------------------------------

{
	const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
	const n = (x: number, d: number) => x.toFixed(d).replace('.', ',');
	/** Galat: 4 desimal, atau notasi ilmiah a,b × 10ⁿ kalau sangat kecil */
	const e = (x: number) => {
		if (x === 0) return '0';
		if (Math.abs(x) >= 1e-3) return n(x, 4);
		const [m, p] = x.toExponential(1).split('e');
		return `${m.replace('.', ',')} × 10${String(+p).replace(/./g, (c) => SUP[c])}`;
	};
	const batas = (x: number) => e(10 ** Math.ceil(Math.log10(x))).replace(/,?0+$/, ''); // "di bawah ..."
	const row = (id: string) => all.find((r) => r.id === id)!;
	const pct = (a: number, b: number) => (Math.abs(a - b) / Math.abs(b)) * 100;
	const isi: string[] = [];

	// Tabel 7.1 (hasil, galat %) : A1 periode, A1 rasio, A3 × 5, A4, A5 × 5, A6, A7
	const P5 = { n: 5, m: 1e5, k: 2e8, zeta: 0.05, h: 3.5 };
	const b5 = buildBuilding(P5);
	const t71: string[] = [row('A1a').hasil, e(row('A1a').galat), row('A1c').hasil, e(row('A1c').galat)];
	let galatA3 = 0;
	for (let j = 1; j <= 5; j++) {
		const g = pct(b5.eig.freq[j - 1], shearFreqAnalytic(5, P5.m, P5.k, j));
		galatA3 = Math.max(galatA3, g);
		t71.push(n(b5.eig.freq[j - 1], 4) + ' Hz', e(g));
	}
	const elong = +row('A4').hasil.match(/\+([\d,]+)%/)![1].replace(',', '.');
	t71.push(row('A4').hasil, n(elong, 4));
	const a5 = all.filter((r) => r.id.startsWith('A5'));
	for (const r of a5) t71.push(r.hasil, e(r.galat));
	t71.push(e(row('A6').galat), e(row('A6').galat * 100), row('A7').hasil, e(row('A7').galat));

	// Tabel A2: Δt, galat maks (% u₀), rasio galat, orde lokal
	const k2 = ayun.konvergensi[0];
	const g2 = k2.seri[0].err.map((x) => (x / 0.05) * 100);
	const tA2: string[] = [n(g2[0], 4)];
	for (let i = 1; i < g2.length; i++) tA2.push(e(g2[i]), n(g2[i - 1] / g2[i], 2), n(Math.log(g2[i - 1] / g2[i]) / Math.log(k2.x[i - 1] / k2.x[i]), 3));

	// Tabel 7.2: L1 × 3, L3 × 2, L4 × 3, L5, L6
	const G = { L: 0.25, b: 0.05, h: 0.01, E: 100e9, rho: 8700 };
	const fa = [1, 2, 3].map((j) => freqAnalytic(G, j));
	const bm = beamModes(G, 20);
	const t72: string[] = [];
	fa.forEach((f, i) => t72.push(n(bm.freq[i], 2) + ' Hz', e(pct(bm.freq[i], f))));
	for (const r of laras.rows.filter((r) => /^L[34]/.test(r.id))) t72.push(r.hasil, e(r.galat));
	t72.push(row('L5').hasil.replace(/ L/g, '').replace(';', ' dan'), e(row('L5').galat), row('L6').hasil, e(row('L6').galat));

	// Tabel L2: N, f₁, galat f₁ (%), f₃, galat f₃ (%)
	const tL2: string[] = [];
	const galatL2: number[][] = [];
	for (const N of [2, 4, 8, 16, 32]) {
		const b = beamModes(G, N);
		galatL2.push([pct(b.freq[0], fa[0]), pct(b.freq[2], fa[2])]);
		tL2.push(n(b.freq[0], 2), e(pct(b.freq[0], fa[0])), n(b.freq[2], 2), e(pct(b.freq[2], fa[2])));
	}

	// Fenomena: gedung default, sinus 0,15 g selama 30 s
	const atap = (f: number, tmd = false) =>
		simulate({ building: { ...P5, tmd: tmd ? { mu: 0.02, ...warburton(0.02) } : null }, ground: { kind: 'sinus', A: 0.15, f } }, 30);
	const f1 = b5.eig.freq[0];
	const maxAbs = (a: number[]) => a.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
	const [u15, uRes, uTmd] = [atap(1.5), atap(f1), atap(f1, true)].map((r) => maxAbs(r.roof));

	const galatL1 = Math.max(...fa.map((f, i) => pct(bm.freq[i], f)));
	const galatA5 = Math.max(...a5.map((r) => r.galat));
	const galatL34 = Math.max(...laras.rows.filter((r) => /^L[34]/.test(r.id)).map((r) => r.galat));
	const oL2 = laras.konvergensi[0].seri;
	const selisihDH = pct(denHartog(0.02).fRatio, +row('A7').hasil.replace(',', '.'));

	const j: Record<number, string> = {
		3: e(galatL1), 4: e(galatA3), 5: e(galatA5),
		94: e(galatA3), 95: n(row('A1b').galat, 2), 96: n(k2.seri[0].orde, 2), 97: '+' + n(elong, 3),
		98: n(bm.freq[0], 2), 99: e(pct(bm.freq[0], fa[0])), 100: `${n(oL2[0].orde, 2)} untuk f₁ dan ${n(oL2[1].orde, 2)} untuk f₃ (pada rentang N = 8 sampai 32)`,
		101: batas(galatL34), 102: n(u15, 4), 103: n(uRes, 4), 104: n((1 - uTmd / uRes) * 100, 1),
		105: row('L5').hasil.replace(';', ' dan'), 107: batas(Math.max(galatL1, galatA3)),
		106:
			`Empat hal perlu dicatat. Pertama, pada uji konvergensi elemen hingga (L2), jaring N = 2 dan N = 4 belum mengikuti garis orde empat: galat f₃ pada N = 2 mencapai ${n(galatL2[0][1], 1)}% karena dua elemen tidak cukup untuk mewakili bentuk mode ketiga. Orde konvergensi karena itu dihitung pada rentang asimtotik N = 8 sampai 32, sedangkan seluruh titik tetap ditampilkan pada tabel dan Gambar 2. ` +
			`Kedua, galat riwayat waktu Newmark (A1) didominasi galat fase akibat pemanjangan periode, bukan galat amplitudo, sehingga galat tumbuh bersama lama simulasi. Dengan Δt = 0,002 s yang dipakai aplikasi, pemanjangan periode mode pertama gedung default hanya ${e(((b5.eig.omega[0] * 0.002) ** 2 / 12) * 100)}%. ` +
			`Ketiga, rasio penyetelan optimum TMD hasil sapuan numerik (A7) berimpit dengan rumus Warburton dan berbeda ${n(selisihDH, 2)}% dari rumus Den Hartog. Perbedaan ini wajar karena rumus Den Hartog diturunkan untuk gaya harmonik pada massa utama, sedangkan gempa bekerja sebagai percepatan tanah. ` +
			`Keempat, resolusi FFT pada uji L6 adalah ${n(44100 / 131072, 2)} Hz per bin; interpolasi parabola di sekitar puncak menurunkan galat frekuensi menjadi ${e(row('L6').galat)}%. ` +
			`Di luar verifikasi numerik, hasil tetap dibatasi oleh asumsi model: gedung linear elastis tanpa kerusakan, bilah seragam tanpa cekungan penyetel, redaman modal bilah yang sama untuk semua mode, dan laras slendro yang diidealkan berjarak sama.`
	};
	[t71, tA2, t72, tL2].reduce((mulai, t) => (t.forEach((v, i) => (j[mulai + i] = v)), mulai + t.length), 7);
	writeFileSync('verify-output/laporan.json', JSON.stringify(j, null, '\t') + '\n');
	writeFileSync(
		'verify-output/laporan.md',
		'# Angka untuk laporan teknis\n\nKunci = nomor urut placeholder [ISI] pada templat laporan (lihat 03_Laporan/isi_laporan.py).\n\n| No. | Nilai |\n|---|---|\n' +
			Object.entries(j).map(([k, v]) => `| ${k} | ${v} |`).join('\n') +
			`\n\nSimpangan atap maksimum gedung default (sinus 0,15 g, 30 s): ${n(u15, 4)} m pada 1,5 Hz; ${n(uRes, 4)} m pada f₁ = ${n(f1, 4)} Hz; ${n(uTmd, 4)} m pada f₁ dengan TMD μ = 2% (Warburton).\n`
	);
}

process.exit(gagal ? 1 : 0);
