/** Antarmuka bersama renderer 2.5D (Canvas 2D) dan 3D (Three.js). Keduanya membaca state simulasi yang sama. */
export interface Renderer<S> {
	draw(state: S): void;
	/** Laras: posisi pukul ξ dari koordinat klik (clientX, clientY), null kalau di luar bilah */
	pick?(clientX: number, clientY: number, klik?: boolean): number | null;
	dispose(): void;
}

export interface AyunView {
	n: number;
	h: number; // tinggi tingkat (m)
	u: ArrayLike<number>; // perpindahan lantai relatif tanah (m)
	tmd: number | null; // perpindahan TMD relatif tanah (m)
	ug: number; // perpindahan tanah (m)
	drift: ArrayLike<number>; // rasio simpangan saat ini per tingkat
	retak: ArrayLike<number>; // rasio simpangan puncak per tingkat (retakan muncul kalau > batas)
	bracing?: boolean[];
	skala: number; // pembesaran visual simpangan
}

export interface LarasView {
	L: number;
	b: number;
	h: number;
	w: (xi: number) => number; // lendutan visual ternormalisasi (−1..1) pada ξ = x/L
	simpul: number[]; // titik simpul mode 1 (ξ)
	xs: number; // posisi pukul saat ini (ξ)
	umur: number; // detik sejak pukulan terakhir (Infinity kalau belum pernah)
	hover?: number | null; // posisi kursor di atas bilah (ξ), untuk penanda bayangan
	warna: [string, string, string];
}

export const WARNA = { aman: '#3A7D44', waspada: '#D9A400', bahaya: '#B23A2E', baja: '#2F5D7C', perunggu: '#B07D2B', tinta: '#1E1B16' };

export function warnaDrift(rasio: number, batas: number): string {
	const r = Math.abs(rasio) / batas;
	return r < 0.5 ? WARNA.aman : r <= 1 ? WARNA.waspada : WARNA.bahaya;
}

/** Siapkan kanvas 2D untuk layar HiDPI, kembalikan konteks dan ukuran CSS */
export function siapkan(canvas: HTMLCanvasElement): { c: CanvasRenderingContext2D; w: number; h: number } {
	const dpr = window.devicePixelRatio || 1;
	const w = canvas.clientWidth;
	const h = canvas.clientHeight;
	if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
	}
	const c = canvas.getContext('2d')!;
	c.setTransform(dpr, 0, 0, dpr, 0, 0);
	c.clearRect(0, 0, w, h);
	return { c, w, h };
}

/** Versi warna status yang cukup gelap untuk teks di atas latar terang (kontras WCAG AA) */
export function warnaTeks(rasio: number, batas: number): string {
	const r = Math.abs(rasio) / batas;
	return r < 0.5 ? '#2E6B38' : r <= 1 ? '#7A5D00' : WARNA.bahaya;
}
