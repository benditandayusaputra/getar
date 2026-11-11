<script lang="ts">
	import type { Component } from 'svelte';
	let {
		label,
		value = $bindable(),
		min,
		max,
		step = 1,
		tampil,
		disabled = false,
		ikon: Ikon,
		info
	}: {
		label: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		tampil?: string;
		disabled?: boolean;
		ikon?: Component<{ size?: number; class?: string }>;
		info?: string;
	} = $props();
	const isi = $derived(`${((value - min) / (max - min)) * 100}%`);
</script>

<label class="block text-sm" title={info}>
	<span class="flex items-baseline justify-between gap-2">
		<span class="flex items-center gap-1.5 text-redup">
			{#if Ikon}<Ikon size={14} class="shrink-0 self-center opacity-70" />{/if}{label}
		</span>
		<span class="rounded-md bg-kertas px-1.5 font-mono text-[0.8rem] font-semibold">{tampil ?? value}</span>
	</span>
	<input type="range" class="w-full" style:--isi={isi} bind:value {min} {max} {step} {disabled} aria-valuetext={tampil} />
</label>
