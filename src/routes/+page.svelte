<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import {
		Music, Building2, ArrowRight, Volume2, Gamepad2, Grid3x3, Activity, Anchor, ShieldCheck, CircleCheck,
		Weight, Wind, MoveHorizontal, Hammer, MoveVertical, Sigma, Timer, Atom, MousePointerClick
	} from '@lucide/svelte';
	import Mini from '#lib/ui/Mini.svelte';
	import Latar from '#lib/ui/Latar.svelte';
	import { runAyun } from '#lib/verify/ayunCases';
	import { runLaras } from '#lib/verify/larasCases';
	import { type VerifyRow, fmtGalat } from '#lib/verify/types';

	// Angka galat dihitung langsung di browser, bukan ditulis tangan
	let rows = $state.raw<VerifyRow[] | null>(null);
	onMount(() => {
		const id = setTimeout(() => (rows = [...runAyun().rows, ...runLaras().rows]), 400);
		return () => clearTimeout(id);
	});
	const sorot = [
		{ id: 'L1', judul: 'Frekuensi bilah', ket: 'Elemen hingga 20 elemen dibanding rumus analitik balok ujung bebas.', ikon: Music },
		{ id: 'A3', judul: 'Frekuensi alami gedung', ket: 'Pemecah nilai eigen (Cholesky + Jacobi) dibanding rumus tertutup gedung 5 lantai.', ikon: Building2 },
		{ id: 'A6', judul: 'Kekekalan energi', ket: 'Penyimpangan energi total Newmark-β selama 100 detik tanpa redaman.', ikon: Activity }
	];
	const suku = [
		{ s: 'M ü', arti: 'Inersia', ikon: Weight, bilah: 'Massa tiap potongan bilah (ρA per elemen)', gedung: 'Massa tiap lantai' },
		{ s: 'C u̇', arti: 'Redaman', ikon: Wind, bilah: 'Gesekan dalam logam, membuat bunyi meluruh', gedung: 'Redaman struktur, peredam viskos, dan TMD' },
		{ s: 'K u', arti: 'Gaya pemulih', ikon: MoveHorizontal, bilah: 'Kekakuan lentur bilah (EI)', gedung: 'Kekakuan kolom tiap tingkat' },
		{ s: 'F(t)', arti: 'Gaya luar', ikon: Hammer, bilah: 'Pukulan tabuh', gedung: 'Gaya inersia akibat percepatan tanah, −M ι a_g(t)' },
		{ s: 'u', arti: 'Yang dicari', ikon: MoveVertical, bilah: 'Lendutan bilah di tiap titik', gedung: 'Simpangan tiap lantai' }
	];
	let sukuAktif = $state(0);
	const modul = [
		{
			href: '/laras' as const, nama: 'Laras', no: 'Modul 1', bentuk: 'bilah' as const, aksen: '#8A5F1A', ikon: Music,
			teks: 'Kenapa bilah yang lebih pendek atau lebih tebal berbunyi lebih tinggi? Pukul bilah gamelan, dengar nadanya, lalu setel lima bilah ke laras slendro.',
			label: [{ t: 'Elemen hingga', i: Grid3x3 }, { t: 'Suara', i: Volume2 }, { t: 'Mini-game', i: Gamepad2 }]
		},
		{
			href: '/ayun' as const, nama: 'Ayun', no: 'Modul 2', bentuk: 'gedung' as const, aksen: '#2F5D7C', ikon: Building2,
			teks: 'Kenapa gedung bisa runtuh saat frekuensi gempa cocok dengan frekuensi alaminya? Guncang gedung bertingkat, lalu selamatkan dengan bracing, peredam, atau TMD.',
			label: [{ t: 'Newmark-β', i: Timer }, { t: 'Resonansi', i: Activity }, { t: 'TMD', i: Anchor }, { t: 'Mini-game', i: Gamepad2 }]
		}
	];
</script>

<svelte:head>
	<title>Getar: simulasi getaran dan resonansi</title>
	<meta name="description" content="Getar: simulasi interaktif getaran dan resonansi, dari bilah gamelan hingga gedung tahan gempa." />
</svelte:head>

<section class="relative isolate overflow-hidden">
	<Latar />
	<div class="mx-auto grid max-w-7xl items-center gap-6 px-4 pb-8 pt-10 md:grid-cols-2 md:pt-16">
		<div class="naik">
			<p class="chip bg-kartu/80 text-redup ring-1 ring-garis"><Atom size={13} class="text-perunggu" />Simulasi interaktif getaran dan resonansi</p>
			<h1 class="mt-3 bg-gradient-to-r from-tinta via-perunggu-tua to-baja bg-clip-text text-6xl font-extrabold tracking-tighter text-transparent md:text-8xl">Getar</h1>
			<p class="mt-4 max-w-xl text-xl font-semibold leading-snug md:text-2xl">Satu persamaan getaran, dari bilah gamelan sampai gedung tahan gempa.</p>
			<p class="mt-3 max-w-xl text-redup">
				Pukul bilah dan dengar nadanya. Guncang gedung dan lihat resonansinya. Keduanya dihitung langsung di browser dengan mesin numerik yang sama, dan hasilnya bisa kamu periksa sendiri.
			</p>
			<div class="mt-5 flex flex-wrap gap-2">
				<a class="tombol tombol-utama group" style="--aksen:#8A5F1A" href={resolve('/laras')}><Music size={16} />Mulai Laras<ArrowRight size={15} class="transition-transform group-hover:translate-x-0.5" /></a>
				<a class="tombol tombol-utama group" style="--aksen:#2F5D7C" href={resolve('/ayun')}><Building2 size={16} />Mulai Ayun<ArrowRight size={15} class="transition-transform group-hover:translate-x-0.5" /></a>
			</div>
			<p class="mt-3 flex items-center gap-1.5 text-xs text-redup"><MousePointerClick size={13} />Gerakkan kursor: sumber gelombang kedua mengikuti tanganmu.</p>
		</div>
		<div class="kartu naik relative bg-kartu/85 backdrop-blur-sm" style="animation-delay: 0.1s">
			<Mini bentuk="morf" tinggi={280} />
			<p class="absolute bottom-3 left-0 right-0 text-center font-mono text-xs text-redup">bilah bergetar ↔ gedung bergoyang: mode pertama yang sama</p>
		</div>
	</div>
</section>

<div class="gelombang mx-auto max-w-7xl"></div>

<section class="mx-auto grid max-w-7xl gap-4 px-4 py-8 md:grid-cols-2" aria-label="Pilih modul">
	{#each modul as m, i (m.href)}
		<a href={resolve(m.href)} class="kartu kartu-hidup naik group flex flex-col" style="--aksen:{m.aksen}; animation-delay:{0.1 * i}s">
			<div class="rounded-xl bg-kertas/70"><Mini bentuk={m.bentuk} /></div>
			<div class="mt-3 flex items-center gap-2.5">
				<span class="ikon-bulat"><m.ikon size={18} /></span>
				<div>
					<p class="label-kecil" style:color={m.aksen}>{m.no}</p>
					<h2 class="text-2xl font-extrabold leading-tight">{m.nama}</h2>
				</div>
			</div>
			<p class="mt-2 flex-1 text-redup">{m.teks}</p>
			<ul class="mt-3 flex flex-wrap gap-1.5">
				{#each m.label as l (l.t)}<li class="chip" style:background="{m.aksen}1f" style:color={m.aksen}><l.i size={12} />{l.t}</li>{/each}
			</ul>
			<span class="tombol tombol-utama mt-4 self-start">Mulai {m.nama}<ArrowRight size={15} class="transition-transform group-hover:translate-x-1" /></span>
		</a>
	{/each}
</section>

<div class="gelombang mx-auto max-w-7xl"></div>

<section class="mx-auto max-w-7xl px-4 py-8">
	<h2 class="flex items-center gap-2 text-2xl font-extrabold md:text-3xl"><Sigma class="text-perunggu" />Satu persamaan, dua dunia</h2>
	<p class="mt-1 max-w-3xl text-redup">Bilah perunggu sepanjang 25 cm dan gedung setinggi 30 m tampak tidak berhubungan. Setelah dipotong menjadi bagian-bagian kecil, keduanya tunduk pada persamaan gerak yang sama. Pilih satu suku untuk melihat artinya:</p>
	<div class="kartu mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 py-5 font-mono text-2xl font-semibold md:text-4xl" role="group" aria-label="Suku persamaan gerak">
		{#each suku.slice(0, 4) as k, i (k.s)}
			{#if i && i < 3}<span class="text-redup">+</span>{/if}
			{#if i === 3}<span class="text-redup">=</span>{/if}
			<button
				class="rounded-lg px-2 py-0.5 transition-all hover:bg-garis/60"
				class:!bg-tinta={sukuAktif === i}
				class:text-white={sukuAktif === i}
				aria-pressed={sukuAktif === i}
				onclick={() => (sukuAktif = i)}
				onmouseenter={() => (sukuAktif = i)}>{k.s}</button>
		{/each}
	</div>
	<div class="mt-3 grid gap-3 md:grid-cols-[14rem_1fr_1fr]" aria-live="polite">
		{#key sukuAktif}
			{@const k = suku[sukuAktif]}
			<div class="kartu naik flex items-center gap-3"><span class="ikon-bulat"><k.ikon size={18} /></span><div><p class="font-mono text-lg font-semibold">{k.s}</p><p class="font-bold">{k.arti}</p></div></div>
			<div class="kartu naik flex items-center gap-3" style="--aksen:#8A5F1A; animation-delay:.05s"><span class="ikon-bulat"><Music size={18} /></span><div><p class="label-kecil text-perunggu-tua">Pada bilah (Laras)</p><p>{k.bilah}</p></div></div>
			<div class="kartu naik flex items-center gap-3" style="--aksen:#2F5D7C; animation-delay:.1s"><span class="ikon-bulat"><Building2 size={18} /></span><div><p class="label-kecil text-baja">Pada gedung (Ayun)</p><p>{k.gedung}</p></div></div>
		{/key}
	</div>
	<div class="mt-4 grid gap-4 md:grid-cols-2">
		<div class="kartu kartu-hidup flex gap-3">
			<span class="ikon-bulat"><Activity size={18} /></span>
			<div>
				<p class="label-kecil">Frekuensi alami</p>
				<p class="my-1 font-mono text-lg font-semibold">(K − ω² M) φ = 0</p>
				<p class="text-sm text-redup">Masalah nilai eigen: ω memberi nada bilah dan frekuensi goyang gedung, φ memberi bentuk getarnya. Diselesaikan dengan faktorisasi Cholesky dan iterasi Jacobi.</p>
			</div>
		</div>
		<div class="kartu kartu-hidup flex gap-3">
			<span class="ikon-bulat"><Timer size={18} /></span>
			<div>
				<p class="label-kecil">Respons terhadap waktu</p>
				<p class="my-1 font-mono text-lg font-semibold">Newmark-β (β = 1/4, γ = 1/2)</p>
				<p class="text-sm text-redup">Integrasi langkah demi langkah yang stabil tanpa syarat dan tidak menambah redaman buatan. Dipakai untuk gedung; bunyi bilah disusun dari superposisi mode.</p>
			</div>
		</div>
	</div>
</section>

<div class="gelombang mx-auto max-w-7xl"></div>

<section class="mx-auto max-w-7xl px-4 py-8">
	<h2 class="flex items-center gap-2 text-2xl font-extrabold md:text-3xl"><ShieldCheck class="text-aman" />Bisa dipercaya?</h2>
	<p class="mt-1 max-w-3xl text-redup">Setiap hasil numerik dibandingkan dengan solusi analitik. Tiga angka di bawah ini baru saja dihitung di perangkatmu.</p>
	<div class="mt-4 grid gap-4 md:grid-cols-3">
		{#each sorot as s (s.id)}
			{@const r = rows?.find((x) => x.id === s.id)}
			<div class="kartu kartu-hidup" style="--aksen:#3A7D44">
				<div class="flex items-center justify-between">
					<span class="ikon-bulat"><s.ikon size={18} /></span>
					{#if r?.lolos}<span class="chip bg-aman/15 text-aman"><CircleCheck size={13} />Lolos</span>{/if}
				</div>
				<p class="label-kecil mt-2">{s.judul} ({s.id})</p>
				<p class="mt-1 font-mono text-2xl font-semibold" aria-live="polite">{r ? `${fmtGalat(r.galat)} ${r.satuanGalat.replace(' (maks)', '')}` : 'menghitung...'}</p>
				<p class="mt-1 text-sm text-redup">{s.ket}</p>
			</div>
		{/each}
	</div>
	<p class="mt-4 flex flex-wrap items-center gap-3">
		<a class="tombol tombol-utama group" href={resolve('/verifikasi')}><ShieldCheck size={16} />Buka Panel Verifikasi<ArrowRight size={15} class="transition-transform group-hover:translate-x-0.5" /></a>
		{#if rows}<span class="chip bg-aman/15 text-aman"><CircleCheck size={13} />{rows.filter((r) => r.lolos).length} dari {rows.length} kasus uji lolos</span>{/if}
	</p>
</section>
