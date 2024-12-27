<script lang="ts">
	import Notes from '$lib/Notes.svelte';
	import Todos from '$lib/Todos.svelte';
	import { LocalStorage } from '$lib/storage.svelte';
</script>

<main
	class="min-h-screen bg-blue-300 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
>
	<div class="container mx-auto px-4 py-8">
		<div class="flex flex-row justify-around gap-2">
			<Todos />
			<Notes />
		</div>
	</div>
</main>
