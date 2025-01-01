<script lang="ts">
	let { text, selected = false, onclick } = $props();
</script>

<li>
	<button
		type="button"
		role="tab"
		aria-selected={selected}
		{onclick}
		class={selected
			? 'w-full rounded-lg border-2 border-black p-2'
			: 'w-full rounded-lg border-2 border-transparent p-2 decoration-2 underline-offset-8 hover:underline'}
	>
		{text}
	</button>
</li>
