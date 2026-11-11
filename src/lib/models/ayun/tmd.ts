// Penyetelan tuned mass damper (TMD).
export interface TmdTuning {
	fRatio: number;
	zeta: number;
}

/**
 * Den Hartog: gaya harmonik pada massa utama.
 * Bentuk klasik c/c_c = √(3μ / (8(1+μ)³)) memakai c_c = 2 m_d ω₁. Di kode ini ζ_d didefinisikan terhadap
 * frekuensi TMD sendiri (c_d = 2 ζ_d m_d f ω₁), jadi nilainya dikali (1+μ): ζ_d = √(3μ / (8(1+μ))).
 */
export function denHartog(mu: number): TmdTuning {
	return { fRatio: 1 / (1 + mu), zeta: Math.sqrt((3 * mu) / (8 * (1 + mu))) };
}

/** Warburton (1982): eksitasi percepatan tanah harmonik, meminimalkan perpindahan relatif massa utama */
export function warburton(mu: number): TmdTuning {
	return {
		fRatio: Math.sqrt(1 - mu / 2) / (1 + mu),
		zeta: Math.sqrt((3 * mu) / (8 * (1 + mu) * (1 - mu / 2)))
	};
}

/**
 * Faktor pembesaran |U₁| ω₁² / A untuk sistem 2 DOF (massa utama tanpa redaman + TMD)
 * terhadap percepatan tanah harmonik. r = ω/ω₁. Sistem linear kompleks 2×2 diselesaikan dengan aturan Cramer.
 */
export function tmdAmplification(mu: number, fRatio: number, zeta: number, r: number): number {
	// dinormalisasi: m₁ = 1, ω₁ = 1
	const k2 = mu * fRatio * fRatio;
	const c2 = 2 * zeta * mu * fRatio;
	// [a11 a12; a12 a22] U = b, dengan aij kompleks (re, im)
	const a11r = -r * r + 1 + k2;
	const a11i = r * c2;
	const a12r = -k2;
	const a12i = -r * c2;
	const a22r = -r * r * mu + k2;
	const a22i = r * c2;
	const b1 = -1;
	const b2 = -mu;
	const detr = a11r * a22r - a11i * a22i - (a12r * a12r - a12i * a12i);
	const deti = a11r * a22i + a11i * a22r - 2 * a12r * a12i;
	const numr = b1 * a22r - b2 * a12r;
	const numi = b1 * a22i - b2 * a12i;
	return Math.hypot(numr, numi) / Math.hypot(detr, deti);
}

/** Cari rasio penyetelan yang meminimalkan puncak respons (sapuan numerik) */
export function numericOptimalTuning(mu: number, zeta: number): { fRatio: number; peak: number } {
	let best = { fRatio: NaN, peak: Infinity };
	for (let f = 0.9; f <= 1.05; f += 0.0005) {
		let peak = 0;
		for (let r = 0.7; r <= 1.3; r += 0.0005) peak = Math.max(peak, tmdAmplification(mu, f, zeta, r));
		if (peak < best.peak) best = { fRatio: f, peak };
	}
	return best;
}
