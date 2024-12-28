<script lang="ts">
	import Notes from '$lib/Notes.svelte';
	import Todos from '$lib/Todos.svelte';
</script>

<main
	class="h-screen overflow-auto bg-blue-300 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
>
	<div class="container mx-auto flex min-h-full flex-col px-4 py-8">
		<div class="flex flex-grow flex-row justify-around gap-2">
			<Todos />
			<Notes />
		</div>
	</div>
</main>
