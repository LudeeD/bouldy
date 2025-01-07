<script lang="ts">
	import '../app.css';
	let { children } = $props();

	import Navigation from '$lib/Navigation.svelte';
</script>

<main
	class="h-screen overflow-auto bg-blue-300 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
>
	<div class="container mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8 pb-24">
		{@render children()}

		<Navigation />
	</div>
</main>
