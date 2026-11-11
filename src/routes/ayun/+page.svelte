<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		Building2, Compass, Gamepad2, Play, Pause, RotateCcw, Zap, Waves, TrendingUp, Activity, CircleHelp, Anchor,
		Weight, MoveHorizontal, Wind, Layers, Gauge, Target, Timer, Ruler, ShieldCheck, TriangleAlert, Siren, Trophy, Wrench,
		SkipForward, Coins, Columns3, Eraser, Minus, Plus, Lightbulb, Radio, AudioWaveform
	} from '@lucide/svelte';
	import Bintang from '#lib/ui/Bintang.svelte';
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
	const IKON_TANAH = { sinus: Waves, sapuan: TrendingUp, pulsa: Zap, sintetis: Activity } as const;
	const IkonStatus = $derived(status === 'Aman' ? ShieldCheck : status === 'Waspada' ? TriangleAlert : Siren);
	const IkonLevel = $derived(IKON_TANAH[level.ground.kind]);
	/** klik kurva respons frekuensi: guncang gedung dengan sinus pada frekuensi itu */
	function pilihFrek(x: number) {
		if (tab !== 'bebas') return;
		fg = +Math.min(15, Math.max(0.2, x)).toFixed(2);
		if (kind !== 'sinus' && kind !== 'pulsa') {
			kind = 'sinus';
			sim?.reset();
		}
		jalan = true;
	}
	/** klik batang lantai di mini-game: pasang atau lepas bracing */
	function klikLantai(i: number) {
		if (tab !== 'game' || fase === 'jalan') return;
		const b = loadout.bracing[i];
		if (b || sisa >= HARGA.bracing) loadout.bracing[i] = !b;
	}
</script>

<svelte:head>
	<title>Ayun: gedung dan gempa | Getar</title>
	<meta name="description" content="Simulasi gedung bertingkat yang diguncang gempa: resonansi, simpangan antar lantai, dan tuned mass damper." />
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-5" style="--aksen: #2F5D7C">
	<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
		<div>
			<p class="label-kecil flex items-center gap-1.5" style="color: #2F5D7C"><Building2 size={14} />Modul Ayun</p>
			<h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Kenapa gedung bisa runtuh saat gempa?</h1>
			<p class="mt-1 max-w-2xl text-sm text-redup">
				Gedung dimodelkan sebagai <em>shear building</em>: tiap lantai adalah massa, tiap tingkat adalah pegas. Persamaan geraknya diselesaikan dengan metode Newmark-β.
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<ModeToggle bind:mode />
			<div class="inline-flex gap-1" role="group" aria-label="Pilih kegiatan">
				<button class="tombol" aria-pressed={tab === 'bebas'} onclick={() => gantiTab('bebas')}><Compass size={16} />Jelajah bebas</button>
				<button class="tombol" aria-pressed={tab === 'game'} onclick={() => gantiTab('game')}><Gamepad2 size={16} />Selamatkan Gedung</button>
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
				<span class="flex items-center gap-1 rounded-md bg-kartu/90 px-2 py-1 font-mono"><Layers size={12} />Skala visual ×{SKALA}</span>
				<span class="flex items-center gap-1 rounded-md bg-kartu/90 px-2 py-1 font-mono"><Timer size={12} />t = {f(t, 1)} s</span>
				{#if tab === 'bebas'}<span class="flex items-center gap-1 rounded-md bg-kartu/90 px-2 py-1 font-mono"><Radio size={12} />{GROUND_LABEL[kind]}{kind === 'sinus' || kind === 'pulsa' ? `, ${f(fg)} Hz` : ''}</span>{/if}
			</div>
			<div class="absolute right-3 top-3 flex items-center gap-2">
				<span class="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold" class:denyut={status === 'Melebihi batas'} style:background={warnaStatus} style:color={status === 'Waspada' ? '#1E1B16' : '#fff'} aria-live="polite"><IkonStatus size={13} />{status}</span>
				<button class="tombol !py-1" onclick={() => dialog.showModal()}><CircleHelp size={15} />Kenapa?</button>
			</div>
			<div class="pointer-events-none absolute bottom-3 left-3 flex gap-3 rounded-md bg-kartu/90 px-2 py-1 text-[0.7rem]">
				<span><i class="mr-1 inline-block h-2 w-2 rounded-full" style="background:#3A7D44"></i>&lt; 50% batas</span>
				<span><i class="mr-1 inline-block h-2 w-2 rounded-full" style="background:#D9A400"></i>50 sampai 100%</span>
				<span><i class="mr-1 inline-block h-2 w-2 rounded-full" style="background:#B23A2E"></i>melebihi batas</span>
			</div>

			{#if tab === 'game' && fase === 'hasil' && hasil}
				<div class="absolute inset-0 flex items-center justify-center bg-tinta/40 p-3 backdrop-blur-[2px]">
					<div class="kartu naik max-h-full w-full max-w-lg overflow-auto shadow-xl" role="status">
						<div class="flex items-center justify-between">
							<Bintang n={hasil.bintang} besar={30} animasi />
							<span class="ikon-bulat !h-10 !w-10" style:color={hasil.bintang ? '#B88A00' : WARNA.bahaya}>{#if hasil.bintang}<Trophy size={20} />{:else}<Siren size={20} />{/if}</span>
						</div>
						<h2 class="mt-1 text-xl font-extrabold">{hasil.bintang ? 'Gedung selamat!' : 'Gedung melewati batas simpangan'}</h2>
						<p class="mt-1 text-sm">
							Rasio simpangan maksimum: <span class="font-mono font-semibold">{f(hasil.awal, 4)}</span> (tanpa penguat) menjadi
							<span class="font-mono font-semibold" style:color={warnaTeks(hasil.drift, THETA_IZIN)}>{f(hasil.drift, 4)}</span>. Batas acuan 0,0200. Sisa anggaran {sisa} poin.
						</p>
						<div class="mt-2">
							<LineChart judul="Perpindahan atap: sebelum dan sesudah" seri={hasil.seri} xLabel="t (s)" yLabel="u atap (m)" simetris tinggi={150} />
						</div>
						<p class="mt-2 flex gap-2 rounded-lg bg-kertas p-2 text-sm"><Lightbulb size={18} class="mt-0.5 shrink-0 text-waspada" /><span><strong>Pelajaran:</strong> {level.pelajaran}</span></p>
						<div class="mt-3 flex flex-wrap gap-2">
							<button class="tombol" onclick={() => ((hasil = null), (fase = 'siap'), sim?.reset())}><Wrench size={15} />Ubah penguat</button>
							{#if hasil.bintang && lv < 2}
								<button class="tombol tombol-utama" onclick={() => pilihLevel(lv + 1)}>Level berikutnya<SkipForward size={15} /></button>
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
					<button class="tombol tombol-utama min-w-24" onclick={() => (jalan = !jalan)}>{#if jalan}<Pause size={16} />Jeda{:else}<Play size={16} />Mulai{/if}</button>
					<button class="tombol" onclick={() => sim?.reset()}><RotateCcw size={16} />Atur Ulang</button>
				</div>
				<div>
					<p class="label-kecil mb-1 flex items-center gap-1.5"><AudioWaveform size={13} />Gerakan tanah</p>
					<div class="flex flex-wrap gap-1">
						{#each Object.entries(GROUND_LABEL) as [k, nama] (k)}
							{@const IkonTanah = IKON_TANAH[k as GroundKind]}
							<button class="tombol !px-2.5 !py-1 !text-xs" aria-pressed={kind === k} onclick={() => ((kind = k as GroundKind), sim?.reset())}><IkonTanah size={13} />{nama}</button>
						{/each}
					</div>
				</div>
				<Slider ikon={Activity} label="Amplitudo gempa A" bind:value={A} min={0.02} max={0.5} step={0.01} tampil="{f(A)} g" />
				<div>
					<Slider ikon={Waves} label="Frekuensi gempa f_g" bind:value={fg} min={0.2} max={15} step={0.01} tampil="{f(fg)} Hz" disabled={kind === 'sapuan' || kind === 'sintetis'} />
					<button class="tombol mt-1 !px-2.5 !py-1 !text-xs" disabled={kind === 'sapuan' || kind === 'sintetis'} onclick={() => ((fg = +f1.toFixed(2)), (jalan = true))}>
						<Zap size={13} class="text-waspada" />Samakan dengan f₁ ({f(f1)} Hz) untuk resonansi
					</button>
				</div>
				<div class="gelombang"></div>
				<div class="grid grid-cols-2 gap-x-4 gap-y-2">
					<Slider ikon={Building2} label="Jumlah lantai n" bind:value={n} min={1} max={10} tampil={String(n)} />
					<Slider ikon={Wind} label="Rasio redaman ζ" bind:value={zetaPct} min={1} max={20} tampil="{zetaPct}%" />
					<Slider ikon={Weight} label="Massa lantai m" bind:value={m5} min={0.5} max={3} step={0.1} tampil="{f(m5, 1)} ×10⁵ kg" />
					<Slider ikon={MoveHorizontal} label="Kekakuan k" bind:value={k8} min={0.5} max={5} step={0.1} tampil="{f(k8, 1)} ×10⁸ N/m" />
				</div>
				<div class="gelombang"></div>
				<div class="space-y-2">
					<label class="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
						<input type="checkbox" role="switch" bind:checked={tmdOn} class="saklar" />
						<Anchor size={16} class="text-baja" />
						Pasang TMD (peredam massa tersetel) di atap
					</label>
					{#if tmdOn}
						<Slider ikon={Weight} label="Rasio massa μ" bind:value={muPct} min={1} max={10} tampil="{muPct}%" />
						<div class="flex flex-wrap gap-1">
							<button class="tombol !px-2.5 !py-1 !text-xs" onclick={() => setel('dh')}><Target size={13} />Setel: Den Hartog</button>
							<button class="tombol !px-2.5 !py-1 !text-xs" onclick={() => setel('wb')}><Target size={13} />Setel: Warburton (eksitasi tanah)</button>
						</div>
						<div class="grid grid-cols-2 gap-x-4">
							<Slider ikon={Target} label="Rasio penyetelan f_d/f₁" bind:value={fRatio} min={0.7} max={1.2} step={0.001} tampil={f(fRatio, 3)} />
							<Slider ikon={Wind} label="Redaman TMD ζ_d" bind:value={zetaD} min={0} max={30} step={0.1} tampil="{f(zetaD, 1)}%" />
						</div>
					{/if}
				</div>
			{:else}
				<div class="flex gap-1" role="group" aria-label="Pilih level">
					{#each LEVELS as L, i (L.nama)}
						<button class="tombol flex-1 flex-col !gap-0 !px-1" aria-pressed={lv === i} onclick={() => pilihLevel(i)}>
							<span class="text-xs">Level {i + 1}</span>
							<Bintang n={rekor[i]} besar={12} />
						</button>
					{/each}
				</div>
				<div>
					<h2 class="flex items-center gap-1.5 font-bold"><IkonLevel size={16} class="text-baja" />{level.nama}</h2>
					<p class="text-sm text-redup">{level.deskripsi} Jaga rasio simpangan di bawah 0,020 selama {DURASI} detik.</p>
				</div>
				<div>
					<div class="flex justify-between text-sm"><span class="label-kecil flex items-center gap-1"><Coins size={13} />Anggaran</span><span class="font-mono font-semibold">sisa {sisa} / {ANGGARAN} poin</span></div>
					<div class="mt-1 h-2 overflow-hidden rounded-full bg-garis"><div class="h-full transition-all duration-300" style:width="{sisa}%" style:background={sisa >= 30 ? WARNA.baja : sisa > 0 ? WARNA.waspada : WARNA.bahaya}></div></div>
				</div>
				<fieldset disabled={fase === 'jalan'} class="space-y-3">
					<div>
						<p class="flex flex-wrap items-center gap-1.5 text-sm font-semibold"><Columns3 size={15} class="text-baja" />Bracing: kekakuan tingkat +30% <span class="font-mono text-xs text-redup">({HARGA.bracing} poin per tingkat)</span></p>
						<div class="mt-1 flex flex-wrap gap-1">
							{#each loadout.bracing as b, i (i)}
								<button class="tombol !px-2 !py-1 !text-xs" aria-pressed={b} disabled={!b && sisa < HARGA.bracing} onclick={() => (loadout.bracing[i] = !b)}>Lt {i + 1}</button>
							{/each}
						</div>
					</div>
					<div>
						<p class="flex flex-wrap items-center gap-1.5 text-sm font-semibold"><Gauge size={15} class="text-baja" />Peredam viskos: redaman +5% <span class="font-mono text-xs text-redup">({HARGA.damper} poin per unit)</span></p>
						<div class="mt-1 flex items-center gap-2">
							<button class="tombol !px-3 !py-1" aria-label="Kurangi peredam" disabled={loadout.damper === 0} onclick={() => loadout.damper--}><Minus size={14} /></button>
							<span class="w-16 text-center font-mono text-sm">{loadout.damper} unit</span>
							<button class="tombol !px-3 !py-1" aria-label="Tambah peredam" disabled={loadout.damper >= 2 || sisa < HARGA.damper} onclick={() => loadout.damper++}><Plus size={14} /></button>
						</div>
					</div>
					<div>
						<p class="flex items-center gap-1.5 text-sm font-semibold"><Anchor size={15} class="text-baja" />TMD di atap</p>
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
								<div class="mt-1"><Slider ikon={Target} label="Rasio penyetelan f_d/f₁" bind:value={loadout.fManual} min={0.7} max={1.2} step={0.005} tampil={f(loadout.fManual, 3)} /></div>
							{/if}
						{/if}
					</div>
				</fieldset>
				<div class="flex flex-wrap items-center gap-2">
					<button class="tombol tombol-utama" disabled={fase === 'jalan'} onclick={uji}>{#if fase === 'jalan'}<Activity size={16} class="animate-pulse" />Gempa berlangsung: {f(t, 0)} / {DURASI} s{:else}<Play size={16} />Uji Gempa{/if}</button>
					<button class="tombol" disabled={fase === 'jalan'} onclick={() => (loadout = loadoutKosong(level.building.n))}><Eraser size={15} />Lepas semua</button>
				</div>
					{#if fase === 'jalan'}
						<div class="h-1.5 overflow-hidden rounded-full bg-garis"><div class="h-full bg-baja" style:width="{Math.min(100, (t / DURASI) * 100)}%"></div></div>
					{/if}
					<p class="flex items-center gap-1.5 text-xs text-redup"><Lightbulb size={13} />Tip: klik batang lantai di grafik rasio simpangan untuk memasang bracing.</p>
			{/if}
		</div>
	</div>

	<!-- Kartu angka -->
	<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
		<Stat ikon={Waves} label="f₁" nilai={f(f1, 3)} satuan="Hz" />
		<Stat ikon={Waves} label="f₂" nilai={model.n > 1 ? f(model.eig.freq[1], 3) : 'tidak ada'} satuan={model.n > 1 ? 'Hz' : ''} />
		<Stat ikon={Timer} label="T₁" nilai={f(1 / f1, 3)} satuan="s" />
		<Stat ikon={Ruler} label="Simpangan atap maks" nilai={f(peakRoof * 100, 1)} satuan="cm" />
		<Stat ikon={Gauge} label="Rasio simpangan maks" nilai={f(maxDrift, 4)} satuan="({f((maxDrift / THETA_IZIN) * 100, 0)}% batas)" warna={teksStatus} />
		<Stat ikon={IkonStatus} label="Status" nilai={status} warna={teksStatus} />
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
			<figure class="kartu kartu-hidup !p-3">
				<figcaption class="mb-2 flex items-center justify-between gap-2">
					<span class="label-kecil">Rasio simpangan antar lantai (puncak)</span>
					{#if tab === 'game'}<span class="flex items-center gap-1 text-[0.65rem] text-redup"><Columns3 size={11} />klik lantai: bracing</span>{/if}
				</figcaption>
				<div class="relative flex h-[190px] flex-col-reverse justify-around">
					{#each batang as b, i (i)}
						{@const brace = tab === 'game' && loadout.bracing[i]}
						<button
							type="button"
							class="group flex items-center gap-2 rounded-md px-0.5 text-left text-[0.7rem] transition-colors hover:bg-garis/50"
							class:cursor-default={tab !== 'game'}
							title="Lantai {i + 1}: rasio sekarang {f(b.kini, 4)}, puncak {f(b.puncak, 4)} ({f((b.puncak / THETA_IZIN) * 100, 0)}% batas){brace ? ', dengan bracing' : ''}"
							aria-label="Lantai {i + 1}, rasio simpangan puncak {f(b.puncak, 4)}, {f((b.puncak / THETA_IZIN) * 100, 0)} persen batas{tab === 'game' ? (brace ? ', bracing terpasang, klik untuk melepas' : ', klik untuk memasang bracing') : ''}"
							onclick={() => klikLantai(i)}
						>
							<span class="flex w-8 items-center gap-0.5 font-mono text-redup">{#if brace}<Columns3 size={10} class="text-baja" />{/if}Lt {i + 1}</span>
							<div class="relative h-3 flex-1 rounded-sm bg-garis/50 transition-[height] group-hover:h-4">
								<div class="absolute inset-y-0 left-0 rounded-sm" style:width="{Math.min(100, (b.puncak / (1.5 * THETA_IZIN)) * 100)}%" style:background={warnaDrift(b.puncak, THETA_IZIN)} style:opacity="0.55"></div>
								<div class="absolute inset-y-0 left-0 rounded-sm" style:width="{Math.min(100, (b.kini / (1.5 * THETA_IZIN)) * 100)}%" style:background={warnaDrift(b.puncak, THETA_IZIN)}></div>
							</div>
							<span class="w-12 text-right font-mono">{f(b.puncak, 4)}</span>
						</button>
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
				onpick={tab === 'bebas' ? pilihFrek : undefined}
				petunjuk={tab === 'bebas' ? 'klik untuk mengguncang di frekuensi itu' : undefined}
		/>
	</div>
</div>

<dialog bind:this={dialog} style="--aksen:#2F5D7C" class="kartu m-auto max-w-lg backdrop:bg-tinta/40" aria-labelledby="kenapa-judul">
	<h2 id="kenapa-judul" class="flex items-center gap-2 text-lg font-extrabold"><span class="ikon-bulat"><Lightbulb size={18} /></span>Kenapa gedung bergoyang hebat?</h2>
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
	<form method="dialog" class="mt-3 text-right"><button class="tombol tombol-utama" style="--aksen:#2F5D7C"><ShieldCheck size={15} />Mengerti</button></form>
</dialog>
