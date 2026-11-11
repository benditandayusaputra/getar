// Pengolahan sinyal: FFT radix-2, deteksi puncak, periode dari zero-crossing.

/** Spektrum magnitudo satu sisi. Sinyal diberi jendela Hann lalu di-zero-pad ke pangkat dua. */
export function fftMag(x: ArrayLike<number>, fs: number): { f: Float64Array; mag: Float64Array } {
	let n = 1;
	while (n < x.length) n <<= 1;
	const re = new Float64Array(n);
	const im = new Float64Array(n);
	const N = x.length;
	for (let i = 0; i < N; i++) re[i] = x[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
	// pembalikan bit
	for (let i = 1, j = 0; i < n; i++) {
		let bit = n >> 1;
		for (; j & bit; bit >>= 1) j ^= bit;
		j ^= bit;
		if (i < j) {
			const t = re[i];
			re[i] = re[j];
			re[j] = t;
		}
	}
	for (let len = 2; len <= n; len <<= 1) {
		const ang = (-2 * Math.PI) / len;
		const wr = Math.cos(ang);
		const wi = Math.sin(ang);
		for (let i = 0; i < n; i += len) {
			let cr = 1;
			let ci = 0;
			for (let k = 0; k < len / 2; k++) {
				const a = i + k;
				const b = a + len / 2;
				const tr = re[b] * cr - im[b] * ci;
				const ti = re[b] * ci + im[b] * cr;
				re[b] = re[a] - tr;
				im[b] = im[a] - ti;
				re[a] += tr;
				im[a] += ti;
				const ncr = cr * wr - ci * wi;
				ci = cr * wi + ci * wr;
				cr = ncr;
			}
		}
	}
	const half = n / 2;
	const f = new Float64Array(half);
	const mag = new Float64Array(half);
	for (let i = 0; i < half; i++) {
		f[i] = (i * fs) / n;
		mag[i] = Math.hypot(re[i], im[i]) / N;
	}
	return { f, mag };
}

/** Frekuensi puncak spektrum, dihaluskan dengan interpolasi parabola pada log magnitudo */
export function peakFreq(x: ArrayLike<number>, fs: number): number {
	const { f, mag } = fftMag(x, fs);
	let k = 1;
	for (let i = 2; i < mag.length - 1; i++) if (mag[i] > mag[k]) k = i;
	const a = Math.log(mag[k - 1] + 1e-300);
	const b = Math.log(mag[k]);
	const c = Math.log(mag[k + 1] + 1e-300);
	const den = a - 2 * b + c;
	const delta = den === 0 ? 0 : (0.5 * (a - c)) / den;
	return f[k] + delta * (f[1] - f[0]);
}

/** Periode rata-rata dari perpotongan nol naik (interpolasi linear) */
export function zeroCrossPeriod(t: ArrayLike<number>, x: ArrayLike<number>): number {
	let first = NaN;
	let last = NaN;
	let count = 0;
	for (let i = 1; i < x.length; i++) {
		if (x[i - 1] < 0 && x[i] >= 0) {
			const tc = t[i - 1] + ((t[i] - t[i - 1]) * -x[i - 1]) / (x[i] - x[i - 1]);
			if (count === 0) first = tc;
			last = tc;
			count++;
		}
	}
	return count > 1 ? (last - first) / (count - 1) : NaN;
}
