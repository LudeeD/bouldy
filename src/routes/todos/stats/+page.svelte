<script lang="ts">
	import { LocalStorage } from '$lib/storage.svelte';
	import type { Todo } from '$lib/types';

	const todos = new LocalStorage('todos', []);

	function clearCompletedTodos() {
		todos.current = todos.current.filter((todo: Todo) => !todo.completed);
	}

	const completed_todos = $derived.by(() => {
		return todos.current.filter((todo: Todo) => todo.completed);
	});
</script>

<div class="flex flex-col gap-2">
	<div class="flex flex-row">
		<div class="rounded-md border-2 border-black bg-white px-2 py-1">
			Counter of completed todos: {completed_todos.length}
		</div>
		<div class="rounded-md border-2 border-black bg-white px-2 py-1">
			Counter of completed todos: {completed_todos.length}
		</div>
	</div>

	<div class="flex flex-col gap-2 rounded-lg border-2 border-black bg-white p-4">
		{#each completed_todos as item (item.id)}
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

		<button onclick={clearCompletedTodos} class="mt-2 text-sm text-red-600 hover:text-red-800">
			Delete {completed_todos.lenght} completed
		</button>
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
