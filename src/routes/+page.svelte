<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import Mini from '#lib/ui/Mini.svelte';
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
		{ id: 'L1', judul: 'Frekuensi bilah', ket: 'Elemen hingga 20 elemen dibanding rumus analitik balok ujung bebas.' },
		{ id: 'A3', judul: 'Frekuensi alami gedung', ket: 'Pemecah nilai eigen (Cholesky + Jacobi) dibanding rumus tertutup gedung 5 lantai.' },
		{ id: 'A6', judul: 'Kekekalan energi', ket: 'Penyimpangan energi total Newmark-β selama 100 detik tanpa redaman.' }
	];
	const suku = [
		['M ü', 'Inersia', 'Massa tiap potongan bilah (ρA per elemen)', 'Massa tiap lantai'],
		['C u̇', 'Redaman', 'Gesekan dalam logam, membuat bunyi meluruh', 'Redaman struktur, peredam viskos, dan TMD'],
		['K u', 'Gaya pemulih', 'Kekakuan lentur bilah (EI)', 'Kekakuan kolom tiap tingkat'],
		['F(t)', 'Gaya luar', 'Pukulan tabuh', 'Gaya inersia akibat percepatan tanah, −M ι a_g(t)'],
		['u', 'Yang dicari', 'Lendutan bilah di tiap titik', 'Simpangan tiap lantai']
	];
</script>

<svelte:head>
	<title>Getar: simulasi getaran dan resonansi</title>
	<meta name="description" content="Getar: simulasi interaktif getaran dan resonansi, dari bilah gamelan hingga gedung tahan gempa." />
</svelte:head>

<section class="mx-auto grid max-w-7xl items-center gap-6 px-4 pb-6 pt-10 md:grid-cols-2 md:pt-16">
	<div>
		<p class="label-kecil">Simulasi interaktif getaran dan resonansi</p>
		<h1 class="mt-2 text-6xl font-extrabold tracking-tighter md:text-8xl">Getar</h1>
		<p class="mt-4 max-w-xl text-xl font-semibold leading-snug md:text-2xl">Satu persamaan getaran, dari bilah gamelan sampai gedung tahan gempa.</p>
		<p class="mt-3 max-w-xl text-redup">
			Pukul bilah dan dengar nadanya. Guncang gedung dan lihat resonansinya. Keduanya dihitung langsung di browser dengan mesin numerik yang sama, dan hasilnya bisa kamu periksa sendiri.
		</p>
		<div class="mt-5 flex flex-wrap gap-2">
			<a class="tombol tombol-utama" style="--aksen:#8A5F1A" href={resolve('/laras')}>Mulai Laras</a>
			<a class="tombol tombol-utama" style="--aksen:#2F5D7C" href={resolve('/ayun')}>Mulai Ayun</a>
		</div>
	</div>
	<div class="kartu"><Mini bentuk="morf" tinggi={280} /></div>
</section>

<div class="gelombang mx-auto max-w-7xl"></div>

<section class="mx-auto grid max-w-7xl gap-4 px-4 py-8 md:grid-cols-2" aria-label="Pilih modul">
	<article class="kartu flex flex-col">
		<Mini bentuk="bilah" />
		<p class="label-kecil mt-2 text-perunggu-tua">Modul 1</p>
		<h2 class="text-2xl font-extrabold">Laras</h2>
		<p class="mt-1 flex-1 text-redup">Kenapa bilah yang lebih pendek atau lebih tebal berbunyi lebih tinggi? Pukul bilah gamelan, dengar nadanya, lalu setel lima bilah ke laras slendro.</p>
		<ul class="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold">
			{#each ['Elemen hingga', 'Suara', 'Mini-game'] as l (l)}<li class="rounded-full bg-perunggu/15 px-2.5 py-1 text-perunggu-tua">{l}</li>{/each}
		</ul>
		<a class="tombol tombol-utama mt-4 self-start" style="--aksen:#8A5F1A" href={resolve('/laras')}>Mulai Laras</a>
	</article>
	<article class="kartu flex flex-col">
		<Mini bentuk="gedung" />
		<p class="label-kecil mt-2 text-baja">Modul 2</p>
		<h2 class="text-2xl font-extrabold">Ayun</h2>
		<p class="mt-1 flex-1 text-redup">Kenapa gedung bisa runtuh saat frekuensi gempa cocok dengan frekuensi alaminya? Guncang gedung bertingkat, lalu selamatkan dengan bracing, peredam, atau TMD.</p>
		<ul class="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold">
			{#each ['Newmark-β', 'Resonansi', 'Mini-game'] as l (l)}<li class="rounded-full bg-baja/15 px-2.5 py-1 text-baja">{l}</li>{/each}
		</ul>
		<a class="tombol tombol-utama mt-4 self-start" style="--aksen:#2F5D7C" href={resolve('/ayun')}>Mulai Ayun</a>
	</article>
</section>

<div class="gelombang mx-auto max-w-7xl"></div>

<section class="mx-auto max-w-7xl px-4 py-8">
	<h2 class="text-2xl font-extrabold md:text-3xl">Satu persamaan, dua dunia</h2>
	<p class="mt-1 max-w-3xl text-redup">Bilah perunggu sepanjang 25 cm dan gedung setinggi 30 m tampak tidak berhubungan. Setelah dipotong menjadi bagian-bagian kecil, keduanya tunduk pada persamaan gerak yang sama:</p>
	<p class="kartu mt-4 text-center font-mono text-2xl font-semibold md:text-4xl">M ü + C u̇ + K u = F(t)</p>
	<div class="kartu mt-4 overflow-x-auto !p-0">
		<table class="w-full min-w-[36rem] text-left text-sm">
			<thead>
				<tr class="border-b border-garis">
					<th class="p-3 font-mono">Suku</th>
					<th class="p-3">Arti</th>
					<th class="p-3 text-perunggu-tua">Pada bilah (Laras)</th>
					<th class="p-3 text-baja">Pada gedung (Ayun)</th>
				</tr>
			</thead>
			<tbody>
				{#each suku as [s, arti, bilah, gedung] (s)}
					<tr class="border-b border-garis last:border-0"><td class="p-3 font-mono font-semibold">{s}</td><td class="p-3 font-semibold">{arti}</td><td class="p-3">{bilah}</td><td class="p-3">{gedung}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	<div class="mt-4 grid gap-4 md:grid-cols-2">
		<div class="kartu">
			<p class="label-kecil">Frekuensi alami</p>
			<p class="my-1 font-mono text-lg font-semibold">(K − ω² M) φ = 0</p>
			<p class="text-sm text-redup">Masalah nilai eigen: ω memberi nada bilah dan frekuensi goyang gedung, φ memberi bentuk getarnya. Diselesaikan dengan faktorisasi Cholesky dan iterasi Jacobi.</p>
		</div>
		<div class="kartu">
			<p class="label-kecil">Respons terhadap waktu</p>
			<p class="my-1 font-mono text-lg font-semibold">Newmark-β (β = 1/4, γ = 1/2)</p>
			<p class="text-sm text-redup">Integrasi langkah demi langkah yang stabil tanpa syarat dan tidak menambah redaman buatan. Dipakai untuk gedung; bunyi bilah disusun dari superposisi mode.</p>
		</div>
	</div>
</section>

<div class="gelombang mx-auto max-w-7xl"></div>

<section class="mx-auto max-w-7xl px-4 py-8">
	<h2 class="text-2xl font-extrabold md:text-3xl">Bisa dipercaya?</h2>
	<p class="mt-1 max-w-3xl text-redup">Setiap hasil numerik dibandingkan dengan solusi analitik. Tiga angka di bawah ini baru saja dihitung di perangkatmu.</p>
	<div class="mt-4 grid gap-4 md:grid-cols-3">
		{#each sorot as s (s.id)}
			{@const r = rows?.find((x) => x.id === s.id)}
			<div class="kartu">
				<p class="label-kecil">{s.judul} ({s.id})</p>
				<p class="mt-1 font-mono text-2xl font-semibold" aria-live="polite">{r ? `${fmtGalat(r.galat)} ${r.satuanGalat.replace(' (maks)', '')}` : 'menghitung...'}</p>
				<p class="mt-1 text-sm text-redup">{s.ket}</p>
			</div>
		{/each}
	</div>
	<p class="mt-4 flex flex-wrap items-center gap-3">
		<a class="tombol tombol-utama" href={resolve('/verifikasi')}>Buka Panel Verifikasi</a>
		{#if rows}<span class="text-sm text-redup">{rows.filter((r) => r.lolos).length} dari {rows.length} kasus uji lolos.</span>{/if}
	</p>
</section>
