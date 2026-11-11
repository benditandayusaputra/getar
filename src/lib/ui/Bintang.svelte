<script lang="ts">
	import { Star } from '@lucide/svelte';
	let { n, besar = 14, animasi = false }: { n: number; besar?: number; animasi?: boolean } = $props();
</script>

<span class="inline-flex gap-0.5" class:bintang-muncul={animasi} role="img" aria-label="{n} dari 3 bintang">
	{#each [0, 1, 2] as i (i)}
		<Star size={besar} fill={i < n ? '#D9A400' : 'none'} color={i < n ? '#B88A00' : '#B8AB8F'} strokeWidth={1.8} />
	{/each}
</span>
