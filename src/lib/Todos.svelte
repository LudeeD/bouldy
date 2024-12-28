<script lang="ts">
	import NavLi from './atoms/nav-li.svelte';
	import { LocalStorage } from '$lib/storage.svelte';
	import type { Todo } from './types';

	const todos = new LocalStorage('todos', []);

	let newTodoText = $state('');

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (newTodoText.trim()) {
			todos.current.push({
				name: newTodoText,
				completed: false
			});
			newTodoText = '';
		}
	}

	function toggleTodo(index: number) {
		todos.current[index].completed = !todos.current[index].completed;
	}

	function clearCompletedTodos() {
		todos.current = todos.current.filter((todo: Todo) => !todo.completed);
	}

	let completedTodosCount = $derived(todos.current.filter((todo: Todo) => todo.completed).length);
</script>

<div class="flex basis-1/2 flex-col gap-2">
	<nav class="rounded-lg border-2 border-black bg-blue-600 p-2">
		<ul class="flex gap-4 text-black">
			<NavLi text="Today" selected />
			<NavLi text="Tomorrow" />
			<NavLi text="This week" />
			<NavLi text="This month" />
			<NavLi text="All" />
		</ul>
	</nav>

	<div class="flex flex-col gap-2 rounded-lg border-2 border-black bg-white p-4">
		<form onsubmit={handleSubmit} class="flex gap-2">
			<input
				type="text"
				bind:value={newTodoText}
				placeholder="Add a new todo..."
				class="flex-1 rounded border p-2 focus:border-blue-500 focus:outline-none"
			/>
			<button
				type="submit"
				class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none"
				disabled={!newTodoText.trim()}
			>
				Add
			</button>
		</form>
		{#if todos.current.length === 0}
			<div class="text-gray-500">No todos found</div>
		{/if}

		{#each todos.current as item, index}
			<div class="flex items-center space-x-2 rounded border p-2 hover:bg-blue-500">
				<input
					type="checkbox"
					class="form-checkbox"
					checked={item.completed}
					onchange={() => toggleTodo(index)}
				/>
				<span class:line-through={item.completed}>{item.name}</span>
			</div>
		{/each}
		{#if completedTodosCount > 0}
			<button onclick={clearCompletedTodos} class="text-sm text-red-600 hover:text-red-800">
				Clear {completedTodosCount} completed
			</button>
		{/if}
	</div>
</div>
