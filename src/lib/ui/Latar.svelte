<script lang="ts">
	// Riak interferensi dua sumber: satu diam, satu mengikuti kursor. Dekorasi hero, tidak bisa difokus.
	import { onMount } from 'svelte';
	let canvas: HTMLCanvasElement;

	onMount(() => {
		const gerak = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1;
		let raf = 0;
		let sumber = { x: 0.78, y: 0.42 };
		let target = { ...sumber };
		const ikut = (e: PointerEvent) => {
			const r = canvas.getBoundingClientRect();
			if (e.clientY > r.bottom || e.clientY < r.top) return;
			target = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
		};
		window.addEventListener('pointermove', ikut, { passive: true });
		const frame = (now: number) => {
			raf = requestAnimationFrame(frame);
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			const w = canvas.clientWidth;
			const h = canvas.clientHeight;
			if (!w || !h) return;
			if (canvas.width !== Math.round(w * dpr)) {
				canvas.width = Math.round(w * dpr);
				canvas.height = Math.round(h * dpr);
			}
			const c = canvas.getContext('2d')!;
			c.setTransform(dpr, 0, 0, dpr, 0, 0);
			c.clearRect(0, 0, w, h);
			sumber.x += (target.x - sumber.x) * 0.05;
			sumber.y += (target.y - sumber.y) * 0.05;
			const lambda = 46;
			const maks = Math.hypot(w, h) * 0.75;
			const fasa = ((now / 1000) * 34 * gerak) % lambda;
			const pusat = [
				{ x: w * 0.18, y: h * 0.78, warna: '176,125,43' },
				{ x: w * sumber.x, y: h * sumber.y, warna: '47,93,124' }
			];
			c.lineWidth = 1.4;
			for (const p of pusat) {
				for (let r = fasa; r < maks; r += lambda) {
					const a = 0.16 * (1 - r / maks);
					c.strokeStyle = `rgba(${p.warna},${a})`;
					c.beginPath();
					c.arc(p.x, p.y, r, 0, 7);
					c.stroke();
				}
				c.fillStyle = `rgba(${p.warna},0.35)`;
				c.beginPath();
				c.arc(p.x, p.y, 4, 0, 7);
				c.fill();
			}
		};
		raf = requestAnimationFrame(frame);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('pointermove', ikut);
		};
	});
</script>

<canvas bind:this={canvas} class="pointer-events-none absolute inset-0 -z-10 h-full w-full" aria-hidden="true"></canvas>
