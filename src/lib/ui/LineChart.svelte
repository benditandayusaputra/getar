<script lang="ts" module>
	export interface Seri {
		x: ArrayLike<number>;
		y: ArrayLike<number>;
		warna: string;
		nama?: string;
		putus?: boolean;
		tebal?: number;
		titik?: boolean;
	}
	export interface Garis {
		v: number;
		warna: string;
		label?: string;
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { MousePointerClick, Pin } from '@lucide/svelte';

	let {
		judul,
		seri,
		hGaris = [],
		vGaris = [],
		xLabel = '',
		yLabel = '',
		xRange,
		yRange,
		logX = false,
		logY = false,
		simetris = false,
		tick = 0,
		tinggi = 190,
		onpick,
		petunjuk
	}: {
		judul: string;
		seri: Seri[];
		hGaris?: Garis[];
		vGaris?: Garis[];
		xLabel?: string;
		yLabel?: string;
		xRange?: [number, number];
		yRange?: [number, number];
		logX?: boolean;
		logY?: boolean;
		simetris?: boolean;
		tick?: number;
		tinggi?: number;
		/** kalau diisi, klik pada grafik memanggil fungsi ini dengan nilai x (bukan mengunci tooltip) */
		onpick?: (x: number) => void;
		petunjuk?: string;
	} = $props();

	let canvas: HTMLCanvasElement;
	// posisi kursor dalam piksel CSS kanvas; null = tidak ada
	let hoverPx = $state<number | null>(null);
	let kunci = $state(false);
	let tip = $state.raw<{ left: number; kiri: boolean; x: string; items: { nama: string; nilai: string; warna: string }[] } | null>(null);
	let peta: { L: number; R: number; w: number; inv: (px: number) => number } | null = null;

	const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
	const pangkat = (k: number) => '10' + (k < 0 ? '⁻' : '') + String(Math.abs(k)).replace(/\d/g, (d) => SUP[+d]);
	const angka = (v: number) => {
		const a = Math.abs(v);
		if (a !== 0 && (a < 1e-3 || a >= 1e5)) return v.toExponential(0).replace('e', 'e');
		return String(+v.toPrecision(3)).replace('.', ',');
	};
	/** angka untuk tooltip: 4 angka penting, notasi ilmiah kalau sangat kecil atau besar */
	const nilai = (v: number) => {
		const a = Math.abs(v);
		if (!Number.isFinite(v)) return '...';
		if (a !== 0 && (a < 1e-3 || a >= 1e5)) {
			const [m, p] = v.toExponential(2).split('e');
			return `${m.replace('.', ',')} × ${pangkat(+p)}`;
		}
		return String(+v.toPrecision(4)).replace('.', ',');
	};

	function ticks(a: number, b: number, n: number): number[] {
		const raw = (b - a) / n;
		let step = 10 ** Math.floor(Math.log10(raw));
		const e = raw / step;
		step *= e >= 7.07 ? 10 : e >= 3.16 ? 5 : e >= 1.41 ? 2 : 1;
		const out: number[] = [];
		for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
		return out;
	}

	function draw() {
		if (!canvas) return;
		const dpr = window.devicePixelRatio || 1;
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		if (!w || !h) return;
		if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
			canvas.width = Math.round(w * dpr);
			canvas.height = Math.round(h * dpr);
		}
		const c = canvas.getContext('2d')!;
		c.setTransform(dpr, 0, 0, dpr, 0, 0);
		c.clearRect(0, 0, w, h);
		const L = 48;
		const R = 12;
		const T = 16;
		const B = 30;

		let [x0, x1] = xRange ?? [Infinity, -Infinity];
		let [y0, y1] = yRange ?? [Infinity, -Infinity];
		for (const s of seri)
			for (let i = 0; i < s.x.length; i++) {
				if (!xRange) {
					x0 = Math.min(x0, s.x[i]);
					x1 = Math.max(x1, s.x[i]);
				}
				if (!yRange && (!logY || s.y[i] > 0)) {
					y0 = Math.min(y0, s.y[i]);
					y1 = Math.max(y1, s.y[i]);
				}
			}
		if (!yRange) {
			for (const g of hGaris) {
				y0 = Math.min(y0, g.v);
				y1 = Math.max(y1, g.v);
			}
			if (simetris) {
				const m = Math.max(Math.abs(y0), Math.abs(y1));
				y0 = -m;
				y1 = m;
			}
			if (logY) {
				y0 /= 2;
				y1 *= 2;
			} else {
				const pad = (y1 - y0) * 0.08 || 1;
				y0 -= simetris || y0 < 0 ? pad : 0;
				y1 += pad;
			}
		}
		if (!Number.isFinite(x0) || x0 === x1) [x0, x1] = [logX ? 0.1 : 0, 1];
		if (!Number.isFinite(y0) || y0 === y1) [y0, y1] = [logY ? 0.1 : 0, 1];

		const tx = (v: number) => (logX ? Math.log10(v) : v);
		const ty = (v: number) => (logY ? Math.log10(Math.max(v, 1e-300)) : v);
		const X = (v: number) => L + ((tx(v) - tx(x0)) / (tx(x1) - tx(x0))) * (w - L - R);
		const Y = (v: number) => h - B - ((ty(v) - ty(y0)) / (ty(y1) - ty(y0))) * (h - T - B);
		const invX = (px: number) => {
			const u = tx(x0) + ((px - L) / (w - L - R)) * (tx(x1) - tx(x0));
			return logX ? 10 ** u : u;
		};
		peta = { L, R, w, inv: invX };

		c.font = '11px "JetBrains Mono", monospace';
		c.lineWidth = 1;
		const dekade = (a: number, b: number) => {
			const out: number[] = [];
			for (let k = Math.ceil(Math.log10(a) - 1e-9); k <= Math.floor(Math.log10(b) + 1e-9); k++) out.push(k);
			return out;
		};
		// sumbu y
		c.textAlign = 'right';
		c.textBaseline = 'middle';
		for (const v of logY ? dekade(y0, y1).map((k) => 10 ** k) : ticks(y0, y1, 4)) {
			c.strokeStyle = v === 0 ? '#b8ab8f' : '#ebe3d1';
			c.beginPath();
			c.moveTo(L, Y(v));
			c.lineTo(w - R, Y(v));
			c.stroke();
			c.fillStyle = '#5f574a';
			c.fillText(logY ? pangkat(Math.round(Math.log10(v))) : angka(v), L - 6, Y(v));
		}
		// sumbu x
		c.textAlign = 'center';
		c.textBaseline = 'top';
		const xt = logX
			? dekade(x0, x1).flatMap((k) => [1, 2, 5].map((m) => m * 10 ** k)).filter((v) => v >= x0 && v <= x1)
			: ticks(x0, x1, Math.max(3, Math.floor(w / 90)));
		for (const v of xt) {
			c.strokeStyle = '#ebe3d1';
			c.beginPath();
			c.moveTo(X(v), T);
			c.lineTo(X(v), h - B);
			c.stroke();
			c.fillStyle = '#5f574a';
			c.fillText(angka(v), X(v), h - B + 5);
		}
		c.fillStyle = '#5f574a';
		c.font = '11px "Plus Jakarta Sans Variable", sans-serif';
		if (xLabel) {
			c.textAlign = 'right';
			c.fillText(xLabel, w - R, h - 13);
		}
		if (yLabel) {
			c.textAlign = 'left';
			c.fillText(yLabel, 4, 1);
		}

		c.save();
		c.beginPath();
		c.rect(L, T - 2, w - L - R, h - T - B + 4);
		c.clip();
		for (const g of hGaris) {
			c.strokeStyle = g.warna;
			c.setLineDash([5, 4]);
			c.beginPath();
			c.moveTo(L, Y(g.v));
			c.lineTo(w - R, Y(g.v));
			c.stroke();
			if (g.label) {
				c.fillStyle = g.warna;
				c.textAlign = 'right';
				c.textBaseline = 'bottom';
				c.fillText(g.label, w - R - 3, Y(g.v) - 2);
			}
		}
		for (const g of vGaris) {
			if (g.v < x0 || g.v > x1) continue;
			c.strokeStyle = g.warna;
			c.setLineDash([5, 4]);
			c.beginPath();
			c.moveTo(X(g.v), T);
			c.lineTo(X(g.v), h - B);
			c.stroke();
			if (g.label) {
				c.fillStyle = g.warna;
				c.textAlign = 'left';
				c.textBaseline = 'top';
				c.fillText(g.label, X(g.v) + 3, T + (seri.some((z) => z.nama) ? 14 : 0));
			}
		}
		c.setLineDash([]);
		for (const s of seri) {
			c.strokeStyle = c.fillStyle = s.warna;
			c.lineWidth = s.tebal ?? 1.8;
			c.setLineDash(s.putus ? [4, 3] : []);
			c.lineJoin = 'round';
			c.beginPath();
			let pen = false;
			for (let i = 0; i < s.x.length; i++) {
				if ((logY && s.y[i] <= 0) || (logX && s.x[i] <= 0)) continue;
				if (pen) c.lineTo(X(s.x[i]), Y(s.y[i]));
				else c.moveTo(X(s.x[i]), Y(s.y[i]));
				pen = true;
			}
			c.stroke();
			if (s.titik)
				for (let i = 0; i < s.x.length; i++) {
					c.beginPath();
					c.arc(X(s.x[i]), Y(s.y[i]), 3, 0, 7);
					c.fill();
				}
		}
		c.setLineDash([]);

		// garis bidik dan titik terdekat tiap seri
		const px = hoverPx;
		if (px !== null && px >= L && px <= w - R) {
			const xd = invX(px);
			c.strokeStyle = 'rgba(30,27,22,0.45)';
			c.lineWidth = 1;
			c.beginPath();
			c.moveTo(px, T);
			c.lineTo(px, h - B);
			c.stroke();
			const items: { nama: string; nilai: string; warna: string }[] = [];
			let xTerdekat = xd;
			seri.forEach((s, si) => {
				let best = -1;
				let d = Infinity;
				for (let i = 0; i < s.x.length; i++) {
					const di = Math.abs(tx(s.x[i]) - tx(xd));
					if (di < d && !(logY && s.y[i] <= 0)) {
						d = di;
						best = i;
					}
				}
				if (best < 0) return;
				if (si === 0) xTerdekat = s.x[best];
				c.fillStyle = '#fff';
				c.strokeStyle = s.warna;
				c.lineWidth = 2;
				c.beginPath();
				c.arc(X(s.x[best]), Y(s.y[best]), 4, 0, 7);
				c.fill();
				c.stroke();
				items.push({ nama: s.nama ?? yLabel ?? 'nilai', nilai: nilai(s.y[best]), warna: s.warna });
			});
			tip = { left: px, kiri: px > w / 2, x: `${xLabel || 'x'} = ${nilai(onpick ? xd : xTerdekat)}`, items };
		} else tip = null;
		c.restore();

		// legenda
		let lx = L + 8;
		c.textAlign = 'left';
		c.textBaseline = 'middle';
		c.font = '11px "Plus Jakarta Sans Variable", sans-serif';
		for (const s of seri) {
			if (!s.nama) continue;
			c.fillStyle = s.warna;
			c.fillRect(lx, T + 3, 12, 3);
			c.fillStyle = '#1e1b16';
			c.fillText(s.nama, lx + 16, T + 5);
			lx += 26 + c.measureText(s.nama).width;
		}
	}

	$effect(() => {
		void [tick, seri, hGaris, vGaris, xRange, yRange, logX, logY, hoverPx];
		draw();
	});
	onMount(() => {
		const ro = new ResizeObserver(draw);
		ro.observe(canvas);
		document.fonts?.ready.then(draw);
		return () => ro.disconnect();
	});

	const posisi = (e: PointerEvent) => e.clientX - canvas.getBoundingClientRect().left;
	function gerak(e: PointerEvent) {
		if (!kunci) hoverPx = posisi(e);
	}
	function klik(e: MouseEvent) {
		const px = e.clientX - canvas.getBoundingClientRect().left;
		if (onpick && peta) {
			if (px >= peta.L && px <= peta.w - peta.R) onpick(peta.inv(px));
			return;
		}
		kunci = !kunci;
		hoverPx = px;
	}
	function tombol(e: KeyboardEvent) {
		if (!peta) return;
		const langkah = (peta.w - peta.L - peta.R) / 50;
		const kini = hoverPx ?? (peta.L + peta.w - peta.R) / 2;
		if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
			e.preventDefault();
			hoverPx = Math.min(peta.w - peta.R, Math.max(peta.L, kini + (e.key === 'ArrowLeft' ? -langkah : langkah)));
		} else if ((e.key === 'Enter' || e.key === ' ') && onpick && hoverPx !== null) {
			e.preventDefault();
			onpick(peta.inv(hoverPx));
		} else if (e.key === 'Escape') {
			hoverPx = null;
			kunci = false;
		}
	}
</script>

<figure class="kartu kartu-hidup !p-3">
	<figcaption class="label-kecil mb-1">{judul}</figcaption>
	<div class="relative">
		<canvas
			bind:this={canvas}
			class="block w-full touch-pan-y"
			class:cursor-crosshair={!onpick}
			class:cursor-pointer={!!onpick}
			style:height="{tinggi}px"
			tabindex="0"
			aria-label="{judul}. Gunakan panah kiri dan kanan untuk membaca nilai{onpick ? ', Enter untuk memilih' : ''}."
			onpointermove={gerak}
			onpointerdown={gerak}
			onpointerleave={() => !kunci && (hoverPx = null)}
			onblur={() => !kunci && (hoverPx = null)}
			onclick={klik}
			onkeydown={tombol}
		></canvas>
		{#if tip && tip.items.length}
			<div
				class="pointer-events-none absolute top-1 z-10 min-w-32 rounded-lg border border-garis bg-kartu/95 px-2 py-1.5 text-[0.7rem] shadow-lg backdrop-blur"
				style:left="{tip.left}px"
				style:transform="translateX({tip.kiri ? 'calc(-100% - 10px)' : '10px'})"
				aria-live="polite"
			>
				<div class="mb-0.5 font-mono font-semibold">{tip.x}</div>
				{#each tip.items as it, i (i)}
					<div class="flex items-center gap-1.5 whitespace-nowrap">
						<i class="inline-block h-2 w-2 shrink-0 rounded-full" style:background={it.warna}></i>
						<span class="text-redup">{it.nama}</span>
						<span class="ml-auto pl-2 font-mono font-semibold">{it.nilai}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
	<p class="mt-1 flex items-center gap-1 text-[0.65rem] text-redup" aria-hidden="true">
		{#if kunci}<Pin size={11} />terkunci, klik lagi untuk melepas{:else}<MousePointerClick size={11} />{petunjuk ?? 'arahkan atau klik untuk membaca nilai'}{/if}
	</p>
</figure>
