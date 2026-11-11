<script lang="ts">
	import type { Component } from 'svelte';
	let {
		label,
		nilai,
		satuan = '',
		warna = '',
		ikon: Ikon
	}: { label: string; nilai: string; satuan?: string; warna?: string; ikon?: Component<{ size?: number }> } = $props();
</script>

<div class="kartu kartu-hidup !p-3">
	<div>
		<div class="label-kecil flex items-center gap-1 !normal-case">{#if Ikon}<span style:color={warna || 'var(--aksen)'}><Ikon size={13} /></span>{/if}{label}</div>
		<div class="font-mono text-lg font-semibold leading-tight" style:color={warna || undefined}>
			{nilai}<span class="ml-1 text-xs font-normal text-redup">{satuan}</span>
		</div>
	</div>
</div>
