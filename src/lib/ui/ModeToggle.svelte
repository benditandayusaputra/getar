<script lang="ts">
	import { Layers, Box } from '@lucide/svelte';
	import { ENABLE_3D } from '#lib/config';
	let { mode = $bindable() }: { mode: '2d' | '3d' } = $props();

	// pilihan disimpan di localStorage (dibungkus try/catch: bisa diblokir browser)
	$effect.pre(() => {
		try {
			if (ENABLE_3D && localStorage.getItem('getar-mode') === '3d') mode = '3d';
		} catch {}
	});
	function pilih(m: '2d' | '3d') {
		mode = m;
		try {
			localStorage.setItem('getar-mode', m);
		} catch {}
	}
</script>

{#if ENABLE_3D}
	<div class="inline-flex gap-1" role="group" aria-label="Mode tampilan">
		<button class="tombol !py-1" aria-pressed={mode === '2d'} onclick={() => pilih('2d')} title="Tampilan 2.5D (ringan)"><Layers size={15} />2.5D</button>
		<button class="tombol !py-1" aria-pressed={mode === '3d'} onclick={() => pilih('3d')} title="Tampilan 3D (seret untuk memutar)"><Box size={15} />3D</button>
	</div>
{/if}
