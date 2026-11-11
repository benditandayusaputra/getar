// Sifat bahan tipikal (nilai buku teks, lihat Daftar Pustaka laporan). ζ diasumsikan sama untuk semua mode.
export interface Material {
	id: string;
	nama: string;
	E: number; // Pa
	rho: number; // kg/m³
	zeta: number;
	warna: [string, string, string]; // atas, depan, samping
}

export const MATERIALS: Material[] = [
	{ id: 'perunggu', nama: 'Perunggu', E: 100e9, rho: 8700, zeta: 0.0003, warna: ['#C9973F', '#8E6520', '#A77A2B'] },
	{ id: 'kuningan', nama: 'Kuningan', E: 100e9, rho: 8500, zeta: 0.0005, warna: ['#D8B64A', '#9A7E26', '#B89632'] },
	{ id: 'baja', nama: 'Baja', E: 200e9, rho: 7850, zeta: 0.0002, warna: ['#A9B4BD', '#6C7781', '#87929B'] },
	{ id: 'aluminium', nama: 'Aluminium', E: 69e9, rho: 2700, zeta: 0.0004, warna: ['#D5DADF', '#9AA2AA', '#B5BCC3'] }
];
