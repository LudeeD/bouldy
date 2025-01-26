<script lang="ts">
	import { LocalStorage } from '$lib/storage.svelte';

	const completed_todos = new LocalStorage('completed_todos', []);

	function clearCompletedTodos() {
		completed_todos.current = [];
	}

	// Count how many are completed
	$: completedTodosCount = completed_todos.current.length;
</script>

<div class="flex flex-col gap-2">
	<div class="flex flex-row">
		<div class="rounded-md border-2 border-black bg-white px-2 py-1">
			Counter of completed todos: {completedTodosCount}
		</div>
		<div class="rounded-md border-2 border-black bg-white px-2 py-1">
			Counter of completed todos: {completedTodosCount}
		</div>
	</div>

	<div class="flex flex-col gap-2 rounded-lg border-2 border-black bg-white p-4">
		{#if completedTodosCount.current.length === 0}
			<div class="text-gray-500">No todos found</div>
		{/if}

		{#each completed_todos.current as item (item.id)}
			<div
				class="group mt-2 flex items-center justify-between space-x-2 rounded border p-2 hover:bg-blue-50"
			>
				<div class="flex items-center space-x-2">
					<div class="flex items-center space-x-2">
						<input type="checkbox" class="form-checkbox" checked={item.completed} disabled />
						<span class:line-through={item.completed}>{item.name}</span>
					</div>
				</div>

				<div class="ml-auto flex items-center gap-2">
					<span
						class="text-sm"
						class:text-red-500={new Date().setHours(0, 0, 0, 0) >
							new Date(item.due).setHours(0, 0, 0, 0)}
						class:text-gray-500={new Date().setHours(0, 0, 0, 0) <=
							new Date(item.due).setHours(0, 0, 0, 0)}
					>
						{new Date(item.due).toLocaleDateString('en-GB')}
					</span>
				</div>
			</div>
		{/each}

		{#if completedTodosCount > 0}
			<button on:click={clearCompletedTodos} class="mt-2 text-sm text-red-600 hover:text-red-800">
				Delete {completedTodosCount} completed
			</button>
		{/if}
	</div>
</div>

<svelte:head>
	<title>Bouldy</title>
</svelte:head>

<style>
	:global(.date-time-picker) {
		width: 16rem;
	}
</style>
