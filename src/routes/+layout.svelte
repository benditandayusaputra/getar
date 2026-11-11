<script lang="ts">
	import '@fontsource-variable/plus-jakarta-sans';
	import '@fontsource/jetbrains-mono/400.css';
	import '@fontsource/jetbrains-mono/600.css';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { TIM } from '#lib/config';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	const nav = [
		{ href: '/laras', nama: 'Laras' },
		{ href: '/ayun', nama: 'Ayun' },
		{ href: '/verifikasi', nama: 'Verifikasi' }
	] as const;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex min-h-screen flex-col">
	<header class="border-b border-garis bg-kertas/90 sticky top-0 z-20 backdrop-blur">
		<nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3" aria-label="Navigasi utama">
			<a href={resolve('/')} class="flex items-center gap-2 text-xl font-extrabold tracking-tight">
				<svg width="28" height="18" viewBox="0 0 28 18" aria-hidden="true"><path d="M1 9 Q4.5 -5 8 9 T15 9 T22 9 T27 9" fill="none" stroke="#B07D2B" stroke-width="2.2" stroke-linecap="round" /></svg>
				Getar
			</a>
			<ul class="flex gap-1 text-sm font-semibold">
				{#each nav as n (n.href)}
					<li>
						<a
							href={resolve(n.href)}
							class="rounded-lg px-3 py-1.5 hover:bg-garis/60"
							class:bg-tinta={page.url.pathname.startsWith(n.href)}
							class:text-white={page.url.pathname.startsWith(n.href)}
							aria-current={page.url.pathname.startsWith(n.href) ? 'page' : undefined}>{n.nama}</a>
					</li>
				{/each}
			</ul>
		</nav>
	</header>

	<main class="flex-1">{@render children()}</main>

	<footer class="mt-10 border-t border-garis">
		<div class="gelombang"></div>
		<div class="mx-auto max-w-7xl px-4 py-6 text-sm text-redup">
			<p><strong class="text-tinta">Getar</strong>{TIM.nama ? `, karya ${TIM.nama}` : ''}, {TIM.kampus}.{TIM.dosen ? ` Dosen pembimbing: ${TIM.dosen}.` : ''}</p>
			<p>{TIM.lomba}.</p>
		</div>
	</footer>
</div>
