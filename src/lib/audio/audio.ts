// AudioContext tunggal. Baru dibuat saat dipanggil pertama kali dari interaksi pengguna (aturan autoplay browser).
let ctx: AudioContext | null = null;

/** Putar cuplikan mono, mulai `tunda` detik dari sekarang */
export function putar(data: Float32Array, tunda = 0, fs = 44100): void {
	try {
		ctx ??= new AudioContext();
		void ctx.resume();
		const buf = ctx.createBuffer(1, data.length, fs);
		buf.getChannelData(0).set(data);
		const src = ctx.createBufferSource();
		src.buffer = buf;
		src.connect(ctx.destination);
		src.start(ctx.currentTime + tunda);
	} catch {
		// perangkat tanpa audio: simulasi tetap jalan tanpa bunyi
	}
}
