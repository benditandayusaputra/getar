<script lang="ts">
	let {
		label,
		value = $bindable(),
		min,
		max,
		step = 1,
		tampil,
		disabled = false
	}: { label: string; value: number; min: number; max: number; step?: number; tampil?: string; disabled?: boolean } = $props();
</script>

<label class="block text-sm">
	<span class="flex items-baseline justify-between gap-2">
		<span class="text-redup">{label}</span>
		<span class="font-mono text-[0.8rem] font-semibold">{tampil ?? value}</span>
	</span>
	<input type="range" class="w-full" bind:value {min} {max} {step} {disabled} aria-valuetext={tampil} />
</label>
