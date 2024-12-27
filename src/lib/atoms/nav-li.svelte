<script lang="ts">
	let { text, selected = false } = $props();
</script>

{#if selected}
	<li class="cursor-pointer rounded-lg border-2 border-black p-2">{text}</li>
{:else}
	<li
		class="cursor-pointer rounded-lg border-2 border-transparent p-2 decoration-2 underline-offset-8 hover:underline"
	>
		{text}
	</li>
{/if}
