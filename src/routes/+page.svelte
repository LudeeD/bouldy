<script lang="ts">
	import Notes from '$lib/Notes.svelte';
	import Todos from '$lib/Todos.svelte';
</script>

<main class="min-h-screen bg-gradient-to-b from-blue-600 to-indigo-300">
	<div class="container mx-auto px-4 py-8">
		<div class="flex flex-row justify-around gap-2">
			<Todos />
			<Notes />
		</div>
	</div>
</main>
