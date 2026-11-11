<script lang="ts">
	import { onMount } from 'svelte';
	import Slider from '#lib/ui/Slider.svelte';
	import Stat from '#lib/ui/Stat.svelte';
	import ModeToggle from '#lib/ui/ModeToggle.svelte';
	import LineChart, { type Seri } from '#lib/ui/LineChart.svelte';
	import { f } from '#lib/ui/fmt';
	import { fftMag } from '#lib/engine/signal';
	import { beamModes, evalShape, nodalPoints } from '#lib/models/laras/beamFem';
	import { MATERIALS } from '#lib/models/laras/materials';
	import { synthStrike } from '#lib/models/laras/synth';
	import { SLENDRO, SLENDRO_NAMA, cents, nearestNote } from '#lib/models/laras/tuning';
	import { putar } from '#lib/audio/audio';
	import { createLaras2d } from '#lib/render/laras2d';
	import { type Renderer, type LarasView, WARNA } from '#lib/render/types';

	const FS = 44100;
	let tab = $state<'bebas' | 'game'>('bebas');
	let mode = $state<'2d' | '3d'>('2d');

	// Jelajah bebas
	let Lcm = $state(25);
	let bcm = $state(5);
	let hmm = $state(10);
	let bahan = $state('perunggu');
	let N = $state(20);
	let xs = $state(0.5);
	let sudahPukul = $state(false);
	const mat = $derived(MATERIALS.find((m) => m.id === bahan)!);
	const geom = $derived({ L: Lcm / 100, b: bcm / 100, h: hmm / 1000, E: mat.E, rho: mat.rho });
	const bm = $derived(beamModes(geom, N));
	const simpul = $derived(nodalPoints(bm.modes[0], bm.N, bm.L));
	const nada = $derived(nearestNote(bm.freq[0]));
	const buf = $derived(synthStrike(bm, mat.zeta, xs, FS));
	const spektrum = $derived.by(() => {
		const { f: fr, mag } = fftMag(buf.subarray(0, 32768), FS);
		const k = fr.findIndex((v) => v > 8000);
		return { x: fr.subarray(1, k), y: mag.subarray(1, k), puncak: Math.max(...mag.subarray(1, k)) };
	});
	const XI = Array.from({ length: 81 }, (_, i) => i / 80);
	const seriMode: Seri[] = $derived(
		[0, 1, 2].map((j) => {
			const y = XI.map((xi) => evalShape(bm.modes[j], bm.N, bm.L, xi));
			const skala = (y[0] < 0 ? -1 : 1) / Math.max(...y.map(Math.abs));
			return { x: XI, y: y.map((v) => v * skala), warna: [WARNA.perunggu, WARNA.baja, WARNA.aman][j], nama: `mode ${j + 1}` };
		})
	);

	// Gerak visual: diperlambat (f₁ tampil sebagai 2,2 Hz) dan diperbesar
	let tPukul = -Infinity;
	let vis: { phi: Float64Array; amp: number; rasio: number }[] = [];
	let visBm = { N: 20, L: 0.25 }; // jaring saat pukulan terakhir (N bisa berubah sesudahnya)
	let visNorm = 1;
	function pukul(xi = xs) {
		xs = xi;
		sudahPukul = true;
		const { N, L } = (visBm = bm);
		// amplitudo modal awal sebanding dengan φ(x_s)/ω
		vis = bm.modes.slice(0, 4).map((phi, j) => ({ phi, amp: evalShape(phi, N, L, xi) / bm.omega[j], rasio: bm.freq[j] / bm.freq[0] }));
		visNorm = Math.max(1e-30, ...XI.map((x) => vis.reduce((s, m) => s + Math.abs(m.amp * evalShape(m.phi, N, L, x)), 0)));
		tPukul = performance.now() / 1000;
		putar(buf, 0, FS);
	}
	function lendutan(xi: number, tau: number): number {
		if (tau > 8) return 0;
		let s = 0;
		for (const m of vis) s += m.amp * evalShape(m.phi, visBm.N, visBm.L, xi) * Math.sin(2 * Math.PI * 2.2 * m.rasio * tau) * Math.exp(-tau * (0.35 + 0.3 * m.rasio));
		return s / visNorm;
	}

	let renderer: Renderer<LarasView> | undefined;
	let canvas = $state<HTMLCanvasElement>();
	$effect(() => {
		const el = canvas;
		if (!el) return;
		let r: Renderer<LarasView> | undefined;
		let batal = false;
		// kanvas dibuat ulang tiap ganti mode ({#key mode}), jadi mode dibaca dari atributnya
		if (el.dataset.mode === '3d')
			import('#lib/render/laras3d').then((m) => {
				if (!batal) renderer = r = m.createLaras3d(el);
			});
		else renderer = r = createLaras2d(el);
		return () => {
			batal = true;
			r?.dispose();
			if (renderer === r) renderer = undefined;
		};
	});
	onMount(() => {
		let raf = 0;
		const frame = () => {
			raf = requestAnimationFrame(frame);
			if (tab !== 'bebas') return;
			const tau = performance.now() / 1000 - tPukul;
			renderer?.draw({ L: geom.L, b: geom.b, h: geom.h, w: (xi) => lendutan(xi, tau), simpul, xs, umur: tau, warna: mat.warna });
		};
		raf = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(raf);
	});
	function klikKanvas(e: MouseEvent) {
		const xi = renderer?.pick?.(e.clientX, e.clientY);
		if (xi != null) pukul(xi);
	}

	// Mini-game Setel Laras
	const GLEVEL = [
		{ nama: 'Atur panjang', bahan: 'perunggu', atur: ['L'], ket: 'Lima bilah perunggu setebal 10 mm. Atur panjangnya sampai tiap bilah tepat di nadanya.' },
		{ nama: 'Atur tebal', bahan: 'perunggu', atur: ['h'], ket: 'Panjang semua bilah dikunci 25 cm. Sekarang nada hanya bisa diubah lewat tebal bilah.' },
		{ nama: 'Bahan baru', bahan: 'aluminium', atur: ['L', 'h'], ket: 'Bilah aluminium: lebih ringan, jadi nadanya berbeda. Atur panjang dan tebal sesukamu.' }
	];
	let glv = $state(0);
	let bilah = $state(SLENDRO.map(() => ({ L: 25, h: 10 })));
	let diperiksa = $state(false);
	let grekor = $state([0, 0, 0]);
	const gmat = $derived(MATERIALS.find((m) => m.id === GLEVEL[glv].bahan)!);
	const gmodes = $derived(bilah.map((x) => beamModes({ L: x.L / 100, b: 0.05, h: x.h / 1000, E: gmat.E, rho: gmat.rho }, 12)));
	const gcents = $derived(gmodes.map((m, i) => cents(m.freq[0], SLENDRO[i])));
	const gbintang = $derived.by(() => {
		const a = gcents.map(Math.abs);
		if (a.some((c) => c > 25)) return 0;
		return a.every((c) => c <= 10) ? 3 : a.filter((c) => c <= 10).length >= 3 ? 2 : 1;
	});
	const warnaCents = (c: number) => (Math.abs(c) <= 10 ? WARNA.aman : Math.abs(c) <= 25 ? '#A07900' : WARNA.bahaya);
	function pilihGLevel(i: number) {
		glv = i;
		bilah = SLENDRO.map(() => ({ L: 25, h: 10 }));
		diperiksa = false;
	}
	const pukulBilah = (i: number, tunda = 0) => putar(synthStrike(gmodes[i], gmat.zeta, 0.5, FS, 1.4), tunda, FS);
	const mainkan = () => bilah.forEach((_, i) => pukulBilah(i, i * 0.42));
	function periksa() {
		diperiksa = true;
		grekor[glv] = Math.max(grekor[glv], gbintang);
		mainkan();
	}
	const bintangTeks = (b: number) => '★'.repeat(b) + '☆'.repeat(3 - b);
</script>

<svelte:head>
	<title>Laras: bilah gamelan | Getar</title>
	<meta name="description" content="Simulasi bilah gamelan sebagai balok Euler-Bernoulli ujung bebas: pukul, dengar nadanya, dan setel ke laras slendro." />
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-5" style="--aksen: #8A5F1A">
	<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
		<div>
			<p class="label-kecil text-perunggu-tua">Modul Laras</p>
			<h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Kenapa bilah pendek berbunyi lebih tinggi?</h1>
			<p class="mt-1 max-w-2xl text-sm text-redup">
				Bilah gamelan dimodelkan sebagai balok Euler-Bernoulli dengan kedua ujung bebas. Frekuensi dan bentuk getarnya dihitung dengan metode elemen hingga, lalu bunyinya disintesis dari mode-mode itu.
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			{#if tab === 'bebas'}<ModeToggle bind:mode />{/if}
			<div class="inline-flex gap-1" role="group" aria-label="Pilih kegiatan">
				<button class="tombol" aria-pressed={tab === 'bebas'} onclick={() => (tab = 'bebas')}>Jelajah bebas</button>
				<button class="tombol" aria-pressed={tab === 'game'} onclick={() => (tab = 'game')}>Setel Laras</button>
			</div>
		</div>
	</div>

	{#if tab === 'bebas'}
		<div class="grid gap-4 lg:grid-cols-5">
			<div class="kartu relative overflow-hidden !p-0 lg:col-span-3">
				{#key mode}
					<canvas bind:this={canvas} data-mode={mode} onclick={klikKanvas} class="block h-[280px] w-full cursor-pointer md:h-[360px]" aria-label="Bilah gamelan di atas rancakan. Klik bilah untuk memukul."></canvas>
				{/key}
				<div class="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1 text-xs">
					<span class="rounded-md bg-kartu/90 px-2 py-1 font-mono">Skala visual: lendutan diperbesar, gerak diperlambat ×{f(bm.freq[0] / 2.2, 0)}</span>
					<span class="rounded-md bg-kartu/90 px-2 py-1 font-mono">Posisi pukul: {f(xs)} L</span>
				</div>
				{#if !sudahPukul}
					<p class="pointer-events-none absolute inset-x-0 bottom-4 text-center text-sm font-semibold text-perunggu-tua">Klik bilah untuk memukul (nyalakan suara perangkat)</p>
				{/if}
			</div>

			<div class="kartu space-y-3 lg:col-span-2">
				<div class="flex flex-wrap items-center gap-2">
					<button class="tombol tombol-utama" onclick={() => pukul()}>Pukul bilah</button>
					<div class="min-w-40 flex-1"><Slider label="Posisi pukul" bind:value={xs} min={0} max={1} step={0.01} tampil="{f(xs)} L" /></div>
				</div>
				<Slider label="Panjang L" bind:value={Lcm} min={15} max={40} step={0.1} tampil="{f(Lcm, 1)} cm" />
				<Slider label="Tebal h" bind:value={hmm} min={5} max={20} step={0.1} tampil="{f(hmm, 1)} mm" />
				<Slider label="Lebar b" bind:value={bcm} min={4} max={7} step={0.1} tampil="{f(bcm, 1)} cm" />
				<div>
					<p class="label-kecil mb-1">Bahan</p>
					<div class="flex flex-wrap gap-1">
						{#each MATERIALS as m (m.id)}
							<button class="tombol !px-2.5 !py-1 !text-xs" aria-pressed={bahan === m.id} onclick={() => (bahan = m.id)}>{m.nama}</button>
						{/each}
					</div>
					<p class="mt-1 font-mono text-[0.7rem] text-redup">E = {f(mat.E / 1e9, 0)} GPa, ρ = {mat.rho} kg/m³, ζ = {f(mat.zeta, 4)}</p>
				</div>
				<div class="rounded-xl border border-perunggu/40 bg-perunggu/10 p-3 text-sm">
					<p class="font-bold text-perunggu-tua">Coba ini</p>
					<p>Ubah <strong>lebar</strong> bilah. Nadanya berubah? Kenapa tidak? Lalu pukul di tengah dan di dekat ujung: puncak spektrum mana yang hilang?</p>
				</div>
				<details class="text-sm">
					<summary class="cursor-pointer font-semibold text-redup">Mode lanjut</summary>
					<div class="mt-2"><Slider label="Jumlah elemen hingga N" bind:value={N} min={4} max={40} tampil={String(N)} /></div>
					<p class="mt-1 text-xs text-redup">Makin banyak elemen, makin dekat hasilnya ke solusi analitik (galat turun dengan orde 4).</p>
				</details>
			</div>
		</div>

		<div class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
			<Stat label="f₁ (nada dasar)" nilai={f(bm.freq[0], 1)} satuan="Hz" />
			<Stat label="f₂" nilai={f(bm.freq[1], 1)} satuan="Hz (×{f(bm.freq[1] / bm.freq[0], 3)})" />
			<Stat label="f₃" nilai={f(bm.freq[2], 1)} satuan="Hz (×{f(bm.freq[2] / bm.freq[0], 3)})" />
			<Stat label="Nada slendro terdekat" nilai={nada.nama} satuan="{nada.cents >= 0 ? '+' : '−'}{f(Math.abs(nada.cents), 0)} cents" />
		</div>

		<div class="mt-4 grid gap-3 lg:grid-cols-3">
			<LineChart
				judul="Bentuk mode 1 sampai 3 (elemen hingga)"
				seri={seriMode}
				vGaris={simpul.map((v) => ({ v, warna: '#8C7D5C', label: 'simpul' }))}
				xLabel="x / L"
				yLabel="lendutan (ternormalisasi)"
				yRange={[-1.25, 1.45]}
			/>
			<LineChart
				judul="Spektrum bunyi (FFT)"
				seri={[{ x: spektrum.x, y: spektrum.y, warna: WARNA.perunggu, tebal: 1.3 }]}
				vGaris={bm.freq.slice(0, 4).filter((v) => v < 8000).map((v, i) => ({ v, warna: '#8C7D5C', label: `f${'₁₂₃₄'[i]}` }))}
				logY
				yRange={[spektrum.puncak * 1e-5, spektrum.puncak * 3]}
				xRange={[0, 8000]}
				xLabel="frekuensi (Hz)"
				yLabel="magnitudo"
			/>
			<LineChart
				judul="Bentuk gelombang (40 ms pertama)"
				seri={[{ x: Array.from({ length: 1764 }, (_, i) => (i / FS) * 1000), y: buf.subarray(0, 1764), warna: WARNA.perunggu, tebal: 1.3 }]}
				yRange={[-1, 1]}
				xLabel="t (ms)"
				yLabel="simpangan"
			/>
		</div>
	{:else}
		<div class="grid gap-4 lg:grid-cols-5">
			<div class="kartu space-y-3 lg:col-span-3">
				{#each bilah as x, i (i)}
					{@const c = gcents[i]}
					<div class="grid items-center gap-x-3 gap-y-1 border-b border-garis pb-3 last:border-0 sm:grid-cols-[7.5rem_1fr_9.5rem]">
						<div>
							<p class="font-bold">{SLENDRO_NAMA[i]}</p>
							<p class="font-mono text-xs text-redup">target {f(SLENDRO[i], 1)} Hz</p>
						</div>
						<div>
							<button
								class="block cursor-pointer rounded-[3px] border border-black/25 shadow-[0_3px_0_rgba(0,0,0,0.25)] transition-[width,height] active:translate-y-px"
								style:width="{(x.L / 40) * 100}%"
								style:height="{10 + x.h * 1.6}px"
								style:background="linear-gradient({gmat.warna[0]}, {gmat.warna[2]})"
								aria-label="Pukul bilah {SLENDRO_NAMA[i]}"
								onclick={() => pukulBilah(i)}
							></button>
							<div class="mt-2 grid gap-x-3 {GLEVEL[glv].atur.length > 1 ? 'grid-cols-2' : ''}">
								{#if GLEVEL[glv].atur.includes('L')}
									<Slider label="Panjang" bind:value={x.L} min={15} max={40} step={0.02} tampil="{f(x.L)} cm" />
								{/if}
								{#if GLEVEL[glv].atur.includes('h')}
									<Slider label="Tebal" bind:value={x.h} min={5} max={20} step={0.02} tampil="{f(x.h)} mm" />
								{/if}
							</div>
						</div>
						<!-- jarum tuner -->
						<div aria-live="off">
							<div class="relative h-5 rounded-full bg-garis/60">
								<div class="absolute inset-y-0 rounded-full bg-waspada/40" style="left:37.5%; width:25%"></div>
								<div class="absolute inset-y-0 bg-aman/50" style="left:45%; width:10%"></div>
								<div class="absolute inset-y-[-3px] w-[3px] rounded bg-tinta transition-[left]" style:left="calc({50 + Math.max(-100, Math.min(100, c)) / 2}% - 1.5px)"></div>
							</div>
							<p class="mt-0.5 text-center font-mono text-xs font-semibold" style:color={warnaCents(c)}>
								{f(gmodes[i].freq[0], 1)} Hz, {c >= 0 ? '+' : '−'}{f(Math.abs(c), 0)} cents
							</p>
						</div>
					</div>
				{/each}
			</div>

			<div class="kartu space-y-3 lg:col-span-2">
				<div class="flex gap-1" role="group" aria-label="Pilih level">
					{#each GLEVEL as L, i (L.nama)}
						<button class="tombol flex-1 flex-col !gap-0 !px-1" aria-pressed={glv === i} onclick={() => pilihGLevel(i)}>
							<span class="text-xs">Level {i + 1}</span>
							<span class="text-[0.7rem] font-normal">{bintangTeks(grekor[i])}</span>
						</button>
					{/each}
				</div>
				<div>
					<h2 class="font-bold">{GLEVEL[glv].nama}</h2>
					<p class="text-sm text-redup">{GLEVEL[glv].ket}</p>
				</div>
				<p class="text-sm">
					Laras slendro di sini diidealkan sebagai 5 nada berjarak sama (240 cents). Geser sampai jarum tuner masuk zona hijau (selisih paling banyak 10 cents). Lolos bila semua bilah paling banyak 25 cents dari target.
				</p>
				<div class="flex flex-wrap gap-2">
					<button class="tombol tombol-utama" onclick={periksa}>Periksa laras</button>
					<button class="tombol" onclick={mainkan}>Mainkan laras</button>
				</div>
				{#if diperiksa}
					<div class="rounded-xl bg-kertas p-3" role="status">
						<p class="text-2xl tracking-widest" style:color={gbintang ? '#D9A400' : '#B8AB8F'} aria-label="{gbintang} dari 3 bintang">{bintangTeks(gbintang)}</p>
						<p class="font-bold">{gbintang ? 'Laras tersetel!' : 'Belum selaras: masih ada bilah di luar 25 cents.'}</p>
						<p class="mt-2 rounded-lg bg-kartu p-2 text-center font-mono text-sm">f ∝ h / L²</p>
						<p class="mt-2 text-sm">
							Nada naik 240 cents berarti frekuensi naik 1,149 kali. Karena f sebanding dengan h/L², cukup memendekkan bilah 6,7% atau menebalkannya 14,9%. Bandingkan dengan bilah buatanmu (nilai relatif terhadap bilah pertama):
						</p>
						<table class="mt-2 w-full text-center font-mono text-xs">
							<thead><tr class="text-redup"><th class="text-left font-normal">Bilah</th><th class="font-normal">L (cm)</th><th class="font-normal">h (mm)</th><th class="font-normal">h/L² relatif</th><th class="font-normal">f relatif</th></tr></thead>
							<tbody>
								{#each bilah as x, i (i)}
									<tr><td class="whitespace-nowrap text-left">{SLENDRO_NAMA[i]}</td><td>{f(x.L)}</td><td>{f(x.h)}</td><td>{f(x.h / x.L ** 2 / (bilah[0].h / bilah[0].L ** 2), 3)}</td><td>{f(gmodes[i].freq[0] / gmodes[0].freq[0], 3)}</td></tr>
								{/each}
							</tbody>
						</table>
						{#if gbintang && glv < 2}
							<button class="tombol tombol-utama mt-3" onclick={() => pilihGLevel(glv + 1)}>Level berikutnya</button>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
