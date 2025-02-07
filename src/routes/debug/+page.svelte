<script lang="ts">
	import { onMount } from 'svelte';

	let storageContent: Record<string, string> = {};
	let storageSize = 0;

	onMount(() => {
		// Get all localStorage items
		storageContent = Object.keys(localStorage).reduce((acc, key) => {
			try {
				acc[key] = localStorage.getItem(key) || '';
				// Try to parse JSON if possible
				try {
					acc[key] = JSON.stringify(JSON.parse(acc[key]), null, 2);
				} catch {
					// If it's not JSON, keep as is
				}
			} catch (e) {
				acc[key] = `Error reading key: ${e}`;
			}
			return acc;
		}, {} as Record<string, string>);

		// Calculate total size
		storageSize = Object.keys(localStorage).reduce((size, key) => {
			return size + (localStorage.getItem(key)?.length || 0);
		}, 0);
	});

	function clearStorage() {
		if (confirm('Are you sure you want to clear all localStorage data?')) {
			localStorage.clear();
			window.location.reload();
		}
	}
</script>

<div class="flex flex-col gap-4 p-4">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">LocalStorage Debug</h1>
		<button
			on:click={clearStorage}
			class="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
			>Clear All Data</button
		>
	</div>

	<div class="text-sm text-gray-600">
		Total Size: {(storageSize / 1024).toFixed(2)} KB
	</div>

	{#each Object.entries(storageContent) as [key, value]}
		<div class="rounded-lg border p-4">
			<h2 class="mb-2 font-bold">{key}</h2>
			<pre class="whitespace-pre-wrap break-all rounded bg-gray-100 p-2 text-sm">{value}</pre>
		</div>
	{/each}

	{#if Object.keys(storageContent).length === 0}
		<div class="text-gray-500">No data in localStorage</div>
	{/if}
</div>

<svelte:head>
	<title>Debug - Bouldy</title>
</svelte:head> 