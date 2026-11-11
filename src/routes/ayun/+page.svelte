<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import Slider from '#lib/ui/Slider.svelte';
	import Stat from '#lib/ui/Stat.svelte';
	import ModeToggle from '#lib/ui/ModeToggle.svelte';
	import LineChart, { type Seri, type Garis } from '#lib/ui/LineChart.svelte';
	import { f } from '#lib/ui/fmt';
	import { AyunSim, simulate, type SimConfig } from '#lib/models/ayun/sim';
	import { buildBuilding, freqResponse } from '#lib/models/ayun/building';
	import { GROUND_LABEL, chirpFreq, type GroundKind } from '#lib/models/ayun/groundMotion';
	import { denHartog, warburton } from '#lib/models/ayun/tmd';
	import { THETA_IZIN, statusOf } from '#lib/models/ayun/drift';
	import { LEVELS, ANGGARAN, DURASI, HARGA, loadoutKosong, biaya, terapkan, bintang, type Loadout } from '#lib/models/ayun/game';
	import { createAyun2d } from '#lib/render/ayun2d';
	import { type Renderer, type AyunView, WARNA, warnaDrift, warnaTeks } from '#lib/render/types';

	const SKALA = 15; // pembesaran visual simpangan
	const H = 3.5;
	let tab = $state<'bebas' | 'game'>('bebas');
	let mode = $state<'2d' | '3d'>('2d');

	// Jelajah bebas
	let n = $state(5);
	let m5 = $state(1.0);
	let k8 = $state(2.0);
	let zetaPct = $state(5);
	let A = $state(0.15);
	let fg = $state(1.5);
	let kind = $state<GroundKind>('sinus');
	let tmdOn = $state(false);
	let muPct = $state(2);
	let fRatio = $state(+warburton(0.02).fRatio.toFixed(3));
	let zetaD = $state(+(warburton(0.02).zeta * 100).toFixed(1));
	let jalan = $state(true);

	// Mini-game
	let lv = $state(0);
	let loadout = $state<Loadout>(loadoutKosong(LEVELS[0].building.n));
	let fase = $state<'siap' | 'jalan' | 'hasil'>('siap');
	let rekor = $state([0, 0, 0]);
	let hasil = $state.raw<{ bintang: number; drift: number; awal: number; seri: Seri[] } | null>(null);
	const level = $derived(LEVELS[lv]);
	const sisa = $derived(ANGGARAN - biaya(loadout));

	const cfg: SimConfig = $derived(
		tab === 'bebas'
			? {
					building: { n, m: m5 * 1e5, k: k8 * 1e8, zeta: zetaPct / 100, h: H, tmd: tmdOn ? { mu: muPct / 100, fRatio, zeta: zetaD / 100 } : null },
					ground: { kind, A, f: fg }
				}
			: { building: terapkan(level, loadout), ground: level.ground }
	);
	const model = $derived(buildBuilding(cfg.building));
	const FREQS = Float64Array.from({ length: 500 }, (_, i) => 0.2 * (15 / 0.2) ** (i / 499));
	const frf = $derived(freqResponse(model, FREQS));
	const f1 = $derived(model.eig.freq[0]);

	// State per frame untuk tampilan
	let t = $state(0);
	let peakRoof = $state(0);
	let maxDrift = $state(0);
	let batang = $state.raw<{ kini: number; puncak: number }[]>([]);
	let riwayat = $state.raw<Seri[]>([]);
	const status = $derived(statusOf(maxDrift));
	const warnaStatus = $derived(warnaDrift(maxDrift, THETA_IZIN));
	const teksStatus = $derived(warnaTeks(maxDrift, THETA_IZIN));

	let sim: AyunSim | undefined;
	let renderer: Renderer<AyunView> | undefined;
	let canvas = $state<HTMLCanvasElement>();
	let dialog: HTMLDialogElement;

	$effect(() => {
		const c = cfg;
		untrack(() => {
			if (!sim) sim = new AyunSim(c);
			else sim.rebuild(c);
			if (tab === 'game') {
				sim.reset();
				fase = 'siap';
			}
		});
	});

	$effect(() => {
		const el = canvas;
		if (!el) return;
		let r: Renderer<AyunView> | undefined;
		let batal = false;
		// kanvas dibuat ulang tiap ganti mode ({#key mode}), jadi mode dibaca dari atributnya
		if (el.dataset.mode === '3d')
			import('#lib/render/ayun3d').then((m) => {
				if (!batal) renderer = r = m.createAyun3d(el);
			});
		else renderer = r = createAyun2d(el);
		return () => {
			batal = true;
			r?.dispose();
			if (renderer === r) renderer = undefined;
		};
	});

	function selesai() {
		if (!sim) return;
		const awal = simulate({ building: level.building, ground: level.ground }, DURASI);
		const b = bintang(sim.maxDrift, sisa);
		rekor[lv] = Math.max(rekor[lv], b);
		hasil = {
			bintang: b,
			drift: sim.maxDrift,
			awal: awal.maxDrift,
			seri: [
				{ x: awal.t, y: awal.roof, warna: '#B8AB8F', nama: 'Tanpa penguat', tebal: 1.3 },
				{ x: sim.ht.slice(), y: sim.hr.slice(), warna: WARNA.baja, nama: 'Dengan penguat' }
			]
		};
		fase = 'hasil';
	}

	onMount(() => {
		let last = performance.now();
		let raf = 0;
		const frame = (now: number) => {
			raf = requestAnimationFrame(frame);
			const dt = Math.min(0.1, (now - last) / 1000);
			last = now;
			if (!sim) return;
			const aktif = tab === 'bebas' ? jalan : fase === 'jalan';
			if (aktif && !document.hidden) {
				sim.advance(dt, tab === 'game' ? 2 : 1);
				if (tab === 'game' && sim.t >= DURASI) selesai();
			}
			renderer?.draw({
				n: sim.model.n,
				h: H,
				u: sim.nm.u,
				tmd: sim.tmdU,
				ug: sim.ug,
				drift: sim.drift,
				retak: sim.peakDrift,
				bracing: sim.cfg.building.kFactor?.map((x) => x > 1),
				skala: SKALA
			});
			t = sim.t;
			peakRoof = sim.peakRoof;
			maxDrift = sim.maxDrift;
			batang = Array.from(sim.drift, (d, i) => ({ kini: Math.abs(d), puncak: sim!.peakDrift[i] }));
			riwayat = [{ x: sim.ht, y: sim.hr, warna: WARNA.baja }];
		};
		raf = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(raf);
	});

	function gantiTab(x: 'bebas' | 'game') {
		tab = x;
		hasil = null;
		sim?.reset();
	}
	function pilihLevel(i: number) {
		lv = i;
		loadout = loadoutKosong(LEVELS[i].building.n);
		hasil = null;
	}
	function setel(jenis: 'dh' | 'wb') {
		const o = jenis === 'dh' ? denHartog(muPct / 100) : warburton(muPct / 100);
		fRatio = +o.fRatio.toFixed(3);
		zetaD = +(o.zeta * 100).toFixed(1);
	}
	function uji() {
		sim?.reset();
		hasil = null;
		fase = 'jalan';
	}

	const fGempa = $derived.by(() => {
		const g = cfg.ground;
		return g.kind === 'sinus' || g.kind === 'pulsa' ? g.f : g.kind === 'sapuan' ? chirpFreq(t % 32) : null;
	});
	const garisFrek: Garis[] = $derived([
		...Array.from(model.eig.freq.subarray(0, 3), (v, i) => ({ v, warna: WARNA.baja, label: `f${'₁₂₃'[i]}` })),
		...(fGempa ? [{ v: fGempa, warna: WARNA.bahaya, label: 'gempa' }] : [])
	]);
	const bintangTeks = (b: number) => '★'.repeat(b) + '☆'.repeat(3 - b);
</script>

<svelte:head>
	<title>Ayun: gedung dan gempa | Getar</title>
	<meta name="description" content="Simulasi gedung bertingkat yang diguncang gempa: resonansi, simpangan antar lantai, dan tuned mass damper." />
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-5" style="--aksen: #2F5D7C">
	<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
		<div>
			<p class="label-kecil" style="color: #2F5D7C">Modul Ayun</p>
			<h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Kenapa gedung bisa runtuh saat gempa?</h1>
			<p class="mt-1 max-w-2xl text-sm text-redup">
				Gedung dimodelkan sebagai <em>shear building</em>: tiap lantai adalah massa, tiap tingkat adalah pegas. Persamaan geraknya diselesaikan dengan metode Newmark-β.
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<ModeToggle bind:mode />
			<div class="inline-flex gap-1" role="group" aria-label="Pilih kegiatan">
				<button class="tombol" aria-pressed={tab === 'bebas'} onclick={() => gantiTab('bebas')}>Jelajah bebas</button>
				<button class="tombol" aria-pressed={tab === 'game'} onclick={() => gantiTab('game')}>Selamatkan Gedung</button>
			</div>
		</div>
	</div>

	<div class="grid gap-4 lg:grid-cols-5">
		<!-- Kanvas gedung -->
		<div class="kartu relative overflow-hidden !p-0 lg:col-span-3">
			{#key mode}
				<canvas bind:this={canvas} data-mode={mode} class="block h-[380px] w-full md:h-[520px]" aria-label="Gedung bertingkat yang bergoyang akibat gerakan tanah"></canvas>
			{/key}
			<div class="pointer-events-none absolute left-3 top-3 flex flex-col gap-1 text-xs">
				<span class="rounded-md bg-kartu/90 px-2 py-1 font-mono">Skala visual ×{SKALA}</span>
				<span class="rounded-md bg-kartu/90 px-2 py-1 font-mono">t = {f(t, 1)} s</span>
			</div>
			<div class="absolute right-3 top-3 flex items-center gap-2">
				<span class="rounded-full px-3 py-1 text-xs font-bold" style:background={warnaStatus} style:color={status === 'Waspada' ? '#1E1B16' : '#fff'} aria-live="polite">{status}</span>
				<button class="tombol !py-1" onclick={() => dialog.showModal()}>Kenapa?</button>
			</div>
			<div class="pointer-events-none absolute bottom-3 left-3 flex gap-3 rounded-md bg-kartu/90 px-2 py-1 text-[0.7rem]">
				<span><i class="mr-1 inline-block h-2 w-2 rounded-full" style="background:#3A7D44"></i>&lt; 50% batas</span>
				<span><i class="mr-1 inline-block h-2 w-2 rounded-full" style="background:#D9A400"></i>50 sampai 100%</span>
				<span><i class="mr-1 inline-block h-2 w-2 rounded-full" style="background:#B23A2E"></i>melebihi batas</span>
			</div>

			{#if tab === 'game' && fase === 'hasil' && hasil}
				<div class="absolute inset-0 flex items-center justify-center bg-tinta/40 p-3">
					<div class="kartu max-h-full w-full max-w-lg overflow-auto shadow-xl" role="status">
						<p class="text-3xl tracking-widest" style:color={hasil.bintang ? '#D9A400' : '#B8AB8F'} aria-label="{hasil.bintang} dari 3 bintang">{bintangTeks(hasil.bintang)}</p>
						<h2 class="text-xl font-extrabold">{hasil.bintang ? 'Gedung selamat!' : 'Gedung melewati batas simpangan'}</h2>
						<p class="mt-1 text-sm">
							Rasio simpangan maksimum: <span class="font-mono font-semibold">{f(hasil.awal, 4)}</span> (tanpa penguat) menjadi
							<span class="font-mono font-semibold" style:color={warnaTeks(hasil.drift, THETA_IZIN)}>{f(hasil.drift, 4)}</span>. Batas acuan 0,0200. Sisa anggaran {sisa} poin.
						</p>
						<div class="mt-2">
							<LineChart judul="Perpindahan atap: sebelum dan sesudah" seri={hasil.seri} xLabel="t (s)" yLabel="u atap (m)" simetris tinggi={150} />
						</div>
						<p class="mt-2 rounded-lg bg-kertas p-2 text-sm"><strong>Pelajaran:</strong> {level.pelajaran}</p>
						<div class="mt-3 flex flex-wrap gap-2">
							<button class="tombol" onclick={() => ((hasil = null), (fase = 'siap'), sim?.reset())}>Ubah penguat</button>
							{#if hasil.bintang && lv < 2}
								<button class="tombol tombol-utama" onclick={() => pilihLevel(lv + 1)}>Level berikutnya</button>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Panel kontrol -->
		<div class="kartu space-y-3 lg:col-span-2">
			{#if tab === 'bebas'}
				<div class="flex flex-wrap gap-2">
					<button class="tombol tombol-utama" onclick={() => (jalan = !jalan)}>{jalan ? 'Jeda' : 'Mulai'}</button>
					<button class="tombol" onclick={() => sim?.reset()}>Atur Ulang</button>
				</div>
				<div>
					<p class="label-kecil mb-1">Gerakan tanah</p>
					<div class="flex flex-wrap gap-1">
						{#each Object.entries(GROUND_LABEL) as [k, nama] (k)}
							<button class="tombol !px-2.5 !py-1 !text-xs" aria-pressed={kind === k} onclick={() => ((kind = k as GroundKind), sim?.reset())}>{nama}</button>
						{/each}
					</div>
				</div>
				<Slider label="Amplitudo gempa A" bind:value={A} min={0.02} max={0.5} step={0.01} tampil="{f(A)} g" />
				<div>
					<Slider label="Frekuensi gempa f_g" bind:value={fg} min={0.2} max={15} step={0.01} tampil="{f(fg)} Hz" disabled={kind === 'sapuan' || kind === 'sintetis'} />
					<button class="tombol mt-1 !px-2.5 !py-1 !text-xs" disabled={kind === 'sapuan' || kind === 'sintetis'} onclick={() => (fg = +f1.toFixed(2))}>
						Samakan dengan f₁ ({f(f1)} Hz) untuk resonansi
					</button>
				</div>
				<div class="gelombang"></div>
				<div class="grid grid-cols-2 gap-x-4 gap-y-2">
					<Slider label="Jumlah lantai n" bind:value={n} min={1} max={10} tampil={String(n)} />
					<Slider label="Rasio redaman ζ" bind:value={zetaPct} min={1} max={20} tampil="{zetaPct}%" />
					<Slider label="Massa lantai m" bind:value={m5} min={0.5} max={3} step={0.1} tampil="{f(m5, 1)} ×10⁵ kg" />
					<Slider label="Kekakuan k" bind:value={k8} min={0.5} max={5} step={0.1} tampil="{f(k8, 1)} ×10⁸ N/m" />
				</div>
				<div class="gelombang"></div>
				<div class="space-y-2">
					<label class="flex cursor-pointer items-center gap-2 text-sm font-semibold">
						<input type="checkbox" bind:checked={tmdOn} class="h-4 w-4" style="accent-color:#2F5D7C" />
						Pasang TMD (peredam massa tersetel) di atap
					</label>
					{#if tmdOn}
						<Slider label="Rasio massa μ" bind:value={muPct} min={1} max={10} tampil="{muPct}%" />
						<div class="flex flex-wrap gap-1">
							<button class="tombol !px-2.5 !py-1 !text-xs" onclick={() => setel('dh')}>Setel: Den Hartog</button>
							<button class="tombol !px-2.5 !py-1 !text-xs" onclick={() => setel('wb')}>Setel: Warburton (eksitasi tanah)</button>
						</div>
						<div class="grid grid-cols-2 gap-x-4">
							<Slider label="Rasio penyetelan f_d/f₁" bind:value={fRatio} min={0.7} max={1.2} step={0.001} tampil={f(fRatio, 3)} />
							<Slider label="Redaman TMD ζ_d" bind:value={zetaD} min={0} max={30} step={0.1} tampil="{f(zetaD, 1)}%" />
						</div>
					{/if}
				</div>
			{:else}
				<div class="flex gap-1" role="group" aria-label="Pilih level">
					{#each LEVELS as L, i (L.nama)}
						<button class="tombol flex-1 flex-col !gap-0 !px-1" aria-pressed={lv === i} onclick={() => pilihLevel(i)}>
							<span class="text-xs">Level {i + 1}</span>
							<span class="text-[0.7rem] font-normal">{bintangTeks(rekor[i])}</span>
						</button>
					{/each}
				</div>
				<div>
					<h2 class="font-bold">{level.nama}</h2>
					<p class="text-sm text-redup">{level.deskripsi} Jaga rasio simpangan di bawah 0,020 selama {DURASI} detik.</p>
				</div>
				<div>
					<div class="flex justify-between text-sm"><span class="label-kecil">Anggaran</span><span class="font-mono font-semibold">sisa {sisa} / {ANGGARAN} poin</span></div>
					<div class="mt-1 h-2 overflow-hidden rounded-full bg-garis"><div class="h-full bg-baja transition-all" style:width="{sisa}%"></div></div>
				</div>
				<fieldset disabled={fase === 'jalan'} class="space-y-3">
					<div>
						<p class="text-sm font-semibold">Bracing: kekakuan tingkat +30% <span class="font-mono text-xs text-redup">({HARGA.bracing} poin per tingkat)</span></p>
						<div class="mt-1 flex flex-wrap gap-1">
							{#each loadout.bracing as b, i (i)}
								<button class="tombol !px-2 !py-1 !text-xs" aria-pressed={b} disabled={!b && sisa < HARGA.bracing} onclick={() => (loadout.bracing[i] = !b)}>Lt {i + 1}</button>
							{/each}
						</div>
					</div>
					<div>
						<p class="text-sm font-semibold">Peredam viskos: redaman +5% <span class="font-mono text-xs text-redup">({HARGA.damper} poin per unit)</span></p>
						<div class="mt-1 flex items-center gap-2">
							<button class="tombol !px-3 !py-1" aria-label="Kurangi peredam" disabled={loadout.damper === 0} onclick={() => loadout.damper--}>−</button>
							<span class="w-16 text-center font-mono text-sm">{loadout.damper} unit</span>
							<button class="tombol !px-3 !py-1" aria-label="Tambah peredam" disabled={loadout.damper >= 2 || sisa < HARGA.damper} onclick={() => loadout.damper++}>+</button>
						</div>
					</div>
					<div>
						<p class="text-sm font-semibold">TMD di atap</p>
						<div class="mt-1 flex flex-wrap gap-1">
							<button class="tombol !px-2 !py-1 !text-xs" aria-pressed={loadout.tmd === 0} onclick={() => (loadout.tmd = 0)}>Tanpa</button>
							<button class="tombol !px-2 !py-1 !text-xs" aria-pressed={loadout.tmd === 2} disabled={loadout.tmd !== 2 && sisa + biaya({ ...loadout, bracing: [], damper: 0 }) < HARGA.tmd2} onclick={() => (loadout.tmd = 2)}>μ 2% ({HARGA.tmd2} poin)</button>
							<button class="tombol !px-2 !py-1 !text-xs" aria-pressed={loadout.tmd === 5} disabled={loadout.tmd !== 5 && sisa + biaya({ ...loadout, bracing: [], damper: 0 }) < HARGA.tmd5} onclick={() => (loadout.tmd = 5)}>μ 5% ({HARGA.tmd5} poin)</button>
						</div>
						{#if loadout.tmd}
							<div class="mt-2 flex flex-wrap gap-1">
								{#each [['warburton', 'Warburton'], ['denhartog', 'Den Hartog'], ['manual', 'Setel sendiri']] as [id, nama] (id)}
									<button class="tombol !px-2 !py-1 !text-xs" aria-pressed={loadout.setelan === id} onclick={() => (loadout.setelan = id as Loadout['setelan'])}>{nama}</button>
								{/each}
							</div>
							{#if loadout.setelan === 'manual'}
								<div class="mt-1"><Slider label="Rasio penyetelan f_d/f₁" bind:value={loadout.fManual} min={0.7} max={1.2} step={0.005} tampil={f(loadout.fManual, 3)} /></div>
							{/if}
						{/if}
					</div>
				</fieldset>
				<div class="flex flex-wrap items-center gap-2">
					<button class="tombol tombol-utama" disabled={fase === 'jalan'} onclick={uji}>{fase === 'jalan' ? `Gempa berlangsung: ${f(t, 0)} / ${DURASI} s` : 'Uji Gempa'}</button>
					<button class="tombol" disabled={fase === 'jalan'} onclick={() => (loadout = loadoutKosong(level.building.n))}>Lepas semua</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Kartu angka -->
	<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
		<Stat label="f₁" nilai={f(f1, 3)} satuan="Hz" />
		<Stat label="f₂" nilai={model.n > 1 ? f(model.eig.freq[1], 3) : 'tidak ada'} satuan={model.n > 1 ? 'Hz' : ''} />
		<Stat label="T₁" nilai={f(1 / f1, 3)} satuan="s" />
		<Stat label="Simpangan atap maks" nilai={f(peakRoof * 100, 1)} satuan="cm" />
		<Stat label="Rasio simpangan maks" nilai={f(maxDrift, 4)} satuan="({f((maxDrift / THETA_IZIN) * 100, 0)}% batas)" warna={teksStatus} />
		<Stat label="Status" nilai={status} warna={teksStatus} />
	</div>

	<!-- Grafik -->
	<div class="mt-4 grid gap-3 lg:grid-cols-3">
		<LineChart
			judul="Perpindahan atap terhadap waktu"
			seri={riwayat}
			xRange={[Math.max(0, t - 10), Math.max(10, t)]}
			hGaris={[
				{ v: H * THETA_IZIN, warna: WARNA.bahaya, label: '+h·θ izin' },
				{ v: -H * THETA_IZIN, warna: WARNA.bahaya, label: '−h·θ izin' }
			]}
			simetris
			xLabel="t (s)"
			yLabel="u atap (m)"
		/>
		<figure class="kartu !p-3">
			<figcaption class="label-kecil mb-2">Rasio simpangan antar lantai (puncak)</figcaption>
			<div class="relative flex h-[190px] flex-col-reverse justify-around">
				{#each batang as b, i (i)}
					<div class="flex items-center gap-2 text-[0.7rem]">
						<span class="w-8 font-mono text-redup">Lt {i + 1}</span>
						<div class="relative h-3 flex-1 rounded-sm bg-garis/50">
							<div class="absolute inset-y-0 left-0 rounded-sm" style:width="{Math.min(100, (b.puncak / (1.5 * THETA_IZIN)) * 100)}%" style:background={warnaDrift(b.puncak, THETA_IZIN)} style:opacity="0.55"></div>
							<div class="absolute inset-y-0 left-0 rounded-sm" style:width="{Math.min(100, (b.kini / (1.5 * THETA_IZIN)) * 100)}%" style:background={warnaDrift(b.puncak, THETA_IZIN)}></div>
						</div>
						<span class="w-12 text-right font-mono">{f(b.puncak, 4)}</span>
					</div>
				{/each}
				<div class="pointer-events-none absolute inset-y-0 left-10 right-14">
					<div class="absolute inset-y-0 border-l-2 border-dashed border-bahaya" style="left: 66.67%"></div>
				</div>
			</div>
			<p class="mt-1 text-[0.7rem] text-redup">Garis putus-putus: batas acuan θ = 0,020 (SNI 1726:2019, acuan edukatif, bukan desain).</p>
		</figure>
		<LineChart
			judul="Respons frekuensi atap (faktor pembesaran)"
			seri={[{ x: FREQS, y: frf, warna: WARNA.tinta }]}
			vGaris={garisFrek}
			logX
			logY
			xLabel="frekuensi gempa (Hz)"
			yLabel="|u atap| ω₁² / A"
		/>
	</div>
</div>

<dialog bind:this={dialog} class="kartu m-auto max-w-lg backdrop:bg-tinta/40" aria-labelledby="kenapa-judul">
	<h2 id="kenapa-judul" class="text-lg font-extrabold">Kenapa gedung bergoyang hebat?</h2>
	<div class="mt-2 space-y-2 text-sm">
		<p>
			Setiap gedung punya <strong>frekuensi alami</strong>, yaitu irama goyangan yang paling mudah terjadi. Saat frekuensi gempa mendekati frekuensi itu (r = f gempa / f alami ≈ 1), tiap siklus gempa mendorong gedung searah dengan geraknya, sehingga energi menumpuk dan simpangan terus membesar. Inilah <strong>resonansi</strong>.
		</p>
		<p class="rounded-lg bg-kertas p-2 text-center font-mono">D = 1 / √((1 − r²)² + (2ζr)²)</p>
		<p>
			D adalah faktor pembesaran dibanding simpangan statis. Tepat di r = 1, D = 1/(2ζ): redaman 5% memberi pembesaran 10 kali, redaman 2% memberi 25 kali. Redaman adalah satu-satunya yang membatasi resonansi.
		</p>
		<p>
			<strong>TMD</strong> adalah massa kecil di atap yang disetel ke frekuensi yang sama. Ia berayun berlawanan arah dengan gedung dan menyerap energinya, sehingga satu puncak tinggi pada kurva respons terbelah menjadi dua puncak rendah.
		</p>
	</div>
	<form method="dialog" class="mt-3 text-right"><button class="tombol tombol-utama" style="--aksen:#2F5D7C">Mengerti</button></form>
</dialog>
