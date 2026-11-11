<script lang="ts">
	let { label, nilai, satuan = '', warna = '' }: { label: string; nilai: string; satuan?: string; warna?: string } = $props();
</script>

<div class="kartu !p-3">
	<div class="label-kecil !normal-case">{label}</div>
	<div class="font-mono text-lg font-semibold leading-tight" style:color={warna || undefined}>
		{nilai}<span class="ml-1 text-xs font-normal text-redup">{satuan}</span>
	</div>
</div>
