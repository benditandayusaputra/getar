<script lang="ts">
	import { onMount } from 'svelte';
	import LineChart from '#lib/ui/LineChart.svelte';
	import { runAyun } from '#lib/verify/ayunCases';
	import { runLaras } from '#lib/verify/larasCases';
	import { type VerifyResult, fmtGalat, toCsv } from '#lib/verify/types';
	import { WARNA } from '#lib/render/types';

	let hasil = $state.raw<{ nama: string; r: VerifyResult }[] | null>(null);
	let ms = $state(0);
	onMount(() => {
		// dihitung setelah halaman tampil supaya pesan "menghitung" sempat terlihat
		const id = setTimeout(() => {
			const t0 = performance.now();
			hasil = [
				{ nama: 'Ayun (gedung, Newmark-β)', r: runAyun() },
				{ nama: 'Laras (bilah, elemen hingga)', r: runLaras() }
			];
			ms = performance.now() - t0;
		}, 50);
		return () => clearTimeout(id);
	});
	const semua = $derived(hasil?.flatMap((h) => h.r.rows) ?? []);
	const konv = $derived(hasil?.flatMap((h) => h.r.konvergensi) ?? []);

	function unduh() {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob(['﻿' + toCsv(semua)], { type: 'text/csv;charset=utf-8' }));
		a.download = 'getar-verifikasi.csv';
		a.click();
		URL.revokeObjectURL(a.href);
	}
	const warnaSeri = [WARNA.baja, WARNA.perunggu];
</script>

<svelte:head>
	<title>Panel Verifikasi | Getar</title>
	<meta name="description" content="Perbandingan hasil simulasi Getar dengan solusi analitik, dihitung langsung di browser." />
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-5">
	<p class="label-kecil">Panel Verifikasi</p>
	<h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Apakah angkanya benar?</h1>
	<p class="mt-1 max-w-3xl text-sm text-redup">
		Semua kasus di bawah dijalankan di browser ini saat halaman dibuka, dengan kode yang sama persis dengan yang dipakai modul Laras dan Ayun. Tiap hasil dibandingkan dengan solusi analitik dari buku teks. Kasus yang sama dijalankan oleh perintah <code class="font-mono">npm run verify</code> untuk tabel di laporan.
	</p>

	<div class="mt-4 flex flex-wrap items-center gap-3">
		<button class="tombol tombol-utama" onclick={unduh} disabled={!hasil}>Unduh CSV</button>
		<p class="text-sm" aria-live="polite">
			{#if hasil}
				<strong style:color={semua.every((r) => r.lolos) ? WARNA.aman : WARNA.bahaya}>{semua.filter((r) => r.lolos).length} dari {semua.length} kasus lolos</strong>
				<span class="text-redup">(dihitung dalam {ms.toFixed(0)} ms)</span>
			{:else}
				Menghitung semua kasus...
			{/if}
		</p>
	</div>

	{#each hasil ?? [] as h (h.nama)}
		<h2 class="mb-2 mt-6 text-lg font-extrabold">{h.nama}</h2>
		<div class="kartu overflow-x-auto !p-0">
			<table class="w-full min-w-[60rem] text-left text-sm">
				<thead>
					<tr class="border-b border-garis text-xs text-redup">
						<th class="p-2.5">ID</th><th class="p-2.5">Skenario</th><th class="p-2.5">Hasil simulasi</th><th class="p-2.5">Nilai acuan</th><th class="p-2.5">Galat</th><th class="p-2.5">Target</th><th class="p-2.5">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each h.r.rows as r, i (i)}
						<tr class="border-b border-garis align-top last:border-0">
							<td class="whitespace-nowrap p-2.5 font-mono font-semibold">{r.id}</td>
							<td class="p-2.5">{r.skenario}</td>
							<td class="p-2.5 font-mono text-xs">{r.hasil}</td>
							<td class="p-2.5 font-mono text-xs">{r.acuan}</td>
							<td class="whitespace-nowrap p-2.5 font-mono text-xs">{fmtGalat(r.galat)} {r.satuanGalat}</td>
							<td class="whitespace-nowrap p-2.5 font-mono text-xs">{r.target}</td>
							<td class="p-2.5"><span class="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold text-white" style:background={r.lolos ? WARNA.aman : WARNA.bahaya}>{r.lolos ? 'Lolos' : 'Tidak lolos'}</span></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/each}

	{#if hasil}
		<h2 class="mb-2 mt-6 text-lg font-extrabold">Uji konvergensi</h2>
		<p class="mb-3 max-w-3xl text-sm text-redup">
			Pada sumbu log-log, galat metode berorde p membentuk garis lurus dengan kemiringan p. Newmark-β percepatan rata-rata berorde 2 terhadap Δt, sedangkan elemen balok Hermite kubik berorde 4 terhadap ukuran elemen untuk frekuensi. Garis putus-putus adalah kemiringan teori.
		</p>
		<div class="grid gap-3 lg:grid-cols-2">
			{#each konv as k (k.id)}
				{@const p = k.id === 'A2' ? 2 : 4}
				{@const xa = Math.min(...k.x)}
				{@const ea = k.seri[0].err[k.x.indexOf(xa)]}
				<div>
					<LineChart
						judul={k.judul}
						seri={[
							...k.seri.map((s, i) => ({ x: k.x, y: s.err, warna: warnaSeri[i], nama: `${s.nama} (orde ${s.orde.toFixed(2).replace('.', ',')})`, titik: true })),
							{ x: k.x, y: k.x.map((x) => ea * (x / xa) ** p), warna: '#8C7D5C', nama: `kemiringan ${p}`, putus: true, tebal: 1.2 }
						]}
						logX
						logY
						xLabel={k.xLabel}
						yLabel="galat"
						tinggi={260}
					/>
				</div>
			{/each}
		</div>
		<p class="mt-3 max-w-3xl text-sm text-redup">
			Catatan L2: orde dihitung pada rentang asimtotik (N = 8, 16, 32). Jaring N = 2 dan 4 terlalu kasar dibanding panjang gelombang mode sehingga belum mengikuti garis orde 4, tetapi tetap ditampilkan apa adanya.
		</p>
	{/if}
</div>
