<script lang="ts">
	// Animasi kecil: bilah bergetar (mode 1 ujung bebas), gedung bergoyang, atau peralihan keduanya (loop 6 detik).
	import { onMount } from 'svelte';
	import { modeShapeAnalytic, NODE1 } from '#lib/models/laras/beamAnalytic';

	let { bentuk = 'morf', tinggi = 160 }: { bentuk?: 'bilah' | 'gedung' | 'morf'; tinggi?: number } = $props();
	let canvas: HTMLCanvasElement;
	const K = 40;
	const PHI = Array.from({ length: K + 1 }, (_, i) => modeShapeAnalytic(1, i / K) / 2);
	const campur = (a: string, b: string, m: number) => {
		const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
		const [x, y] = [p(a), p(b)];
		return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * m)).join(',')})`;
	};

	onMount(() => {
		let raf = 0;
		const frame = (now: number) => {
			raf = requestAnimationFrame(frame);
			const dpr = window.devicePixelRatio || 1;
			const w = canvas.clientWidth;
			const h = canvas.clientHeight;
			if (!w) return;
			if (canvas.width !== Math.round(w * dpr)) {
				canvas.width = Math.round(w * dpr);
				canvas.height = Math.round(h * dpr);
			}
			const c = canvas.getContext('2d')!;
			c.setTransform(dpr, 0, 0, dpr, 0, 0);
			c.clearRect(0, 0, w, h);
			const t = now / 1000;
			// m: 0 = bilah, 1 = gedung
			const fasa = (t % 6) / 6;
			const q = 0.5 - 0.5 * Math.cos(2 * Math.PI * fasa);
			const m = bentuk === 'bilah' ? 0 : bentuk === 'gedung' ? 1 : Math.min(1, Math.max(0, (q - 0.35) / 0.3));
			const S = Math.min(w * 0.42, h * 0.85);
			const osc = Math.sin(2 * Math.PI * 1.1 * t);
			const titik = (s: number, i: number): [number, number] => {
				const bx = (s - 0.5) * 2 * S * 0.95;
				const by = -PHI[i] * osc * S * 0.2;
				const gx = Math.sin((Math.PI * s) / 2) * osc * S * 0.22;
				const gy = (0.5 - s) * S * 1.05;
				return [w / 2 + bx + (gx - bx) * m, h / 2 + by + (gy - by) * m];
			};
			const warna = campur('#B07D2B', '#2F5D7C', m);
			// tanah (gedung) dan penyangga di titik simpul (bilah)
			c.globalAlpha = m;
			c.strokeStyle = '#B8A77F';
			c.lineWidth = 2;
			const [gx0, gy0] = titik(0, 0);
			c.beginPath();
			c.moveTo(gx0 - S * 0.5, gy0 + 4);
			c.lineTo(gx0 + S * 0.5, gy0 + 4);
			c.stroke();
			c.globalAlpha = 1 - m;
			c.fillStyle = '#6E4424';
			for (const xi of [NODE1, 1 - NODE1]) {
				const [px, py] = titik(xi, Math.round(xi * K));
				c.beginPath();
				c.moveTo(px, py + 5);
				c.lineTo(px - 7, py + 18);
				c.lineTo(px + 7, py + 18);
				c.fill();
			}
			c.globalAlpha = 1;
			c.strokeStyle = warna;
			c.lineWidth = 7 - 2 * m;
			c.lineCap = 'round';
			c.lineJoin = 'round';
			c.beginPath();
			for (let i = 0; i <= K; i++) {
				const [x, y] = titik(i / K, i);
				if (i) c.lineTo(x, y);
				else c.moveTo(x, y);
			}
			c.stroke();
			// pelat lantai
			c.globalAlpha = m;
			c.lineWidth = 5;
			for (let j = 1; j <= 5; j++) {
				const [x, y] = titik(j / 5, Math.round((j / 5) * K));
				c.beginPath();
				c.moveTo(x - S * 0.24, y);
				c.lineTo(x + S * 0.24, y);
				c.stroke();
			}
			c.globalAlpha = 1;
		};
		raf = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(raf);
	});
</script>

<canvas bind:this={canvas} class="block w-full" style:height="{tinggi}px" aria-hidden="true"></canvas>
