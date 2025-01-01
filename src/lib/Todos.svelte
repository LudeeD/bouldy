<script lang="ts">
	import NavLi from './atoms/nav-li.svelte';
	import { LocalStorage } from '$lib/storage.svelte';
	import type { Todo } from './types';
	import { DateInput } from 'date-picker-svelte';

	const todos = new LocalStorage('todos', []);

	let newTodoText = $state('');
	let dueDate = $state(new Date()); // Initialize with today's date

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (newTodoText.trim()) {
			todos.current.push({
				completed: false,
				name: newTodoText,
				priority: 1,
				context: 'normal',
				due: dueDate
			});
			newTodoText = '';
			dueDate = new Date();
		}
	}

	function toggleTodo(index: number) {
		todos.current[index].completed = !todos.current[index].completed;
	}

	function clearCompletedTodos() {
		todos.current = todos.current.filter((todo: Todo) => !todo.completed);
	}

	function isToday(date: Date) {
		const today = new Date();
		return (
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear()
		);
	}

	function isTomorrow(date: Date) {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		return date <= tomorrow;
	}

	function isThisWeek(date: Date) {
		const today = new Date();
		const weekEnd = new Date(today);
		weekEnd.setDate(today.getDate() + (7 - today.getDay()));
		return date <= weekEnd;
	}

	function isThisMonth(date: Date) {
		const today = new Date();
		return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
	}

	let currentFilter = $state('Today'); // Track current filter

	let filtered_todos = $derived.by(() => {
		const filteredTodos = todos.current.filter((todo: Todo) => {
			const dueDate = new Date(todo.due);
			switch (currentFilter) {
				case 'Today':
					return isToday(dueDate);
				case 'Tomorrow':
					return isTomorrow(dueDate);
				case 'This week':
					return isThisWeek(dueDate);
				case 'This month':
					return isThisMonth(dueDate);
				case 'All':
					return true;
				default:
					return false;
			}
		});
		return filteredTodos;
	});

	let completedTodosCount = $derived(filtered_todos.filter((todo: Todo) => todo.completed).length);
</script>

<div class="flex basis-1/2 flex-col gap-2">
	<nav class="rounded-lg border-2 border-black bg-blue-600 p-2">
		<ul class="flex gap-4 text-black">
			<NavLi
				text="Today"
				selected={currentFilter === 'Today'}
				onclick={() => (currentFilter = 'Today')}
			/>
			<NavLi
				text="Tomorrow"
				selected={currentFilter === 'Tomorrow'}
				onclick={() => (currentFilter = 'Tomorrow')}
			/>
			<NavLi
				text="This week"
				selected={currentFilter === 'This week'}
				onclick={() => (currentFilter = 'This week')}
			/>
			<NavLi
				text="This month"
				selected={currentFilter === 'This month'}
				onclick={() => (currentFilter = 'This month')}
			/>
			<NavLi
				text="All"
				selected={currentFilter === 'All'}
				onclick={() => (currentFilter = 'All')}
			/>
		</ul>
	</nav>

	<div class="flex flex-col gap-2 rounded-lg border-2 border-black bg-white p-4">
		<form onsubmit={handleSubmit} class="flex flex-col gap-2">
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={newTodoText}
					placeholder="Add a new todo..."
					class="flex-1 rounded border p-2 focus:border-blue-500 focus:outline-none"
				/>
				<DateInput bind:value={dueDate} class="w-fit self-center bg-blue-500" format="yyyy-MM-dd" />
				<button
					type="submit"
					class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none"
					disabled={!newTodoText.trim()}
				>
					Add
				</button>
			</div>
		</form>

		{#if todos.current.length === 0}
			<div class="text-gray-500">No todos found</div>
		{/if}

		{#each filtered_todos as item, index}
			<div class="flex items-center justify-between space-x-2 rounded border p-2 hover:bg-blue-50">
				<div class="flex items-center space-x-2">
					<input
						type="checkbox"
						class="form-checkbox"
						checked={item.completed}
						onchange={() => toggleTodo(index)}
					/>
					<span class:line-through={item.completed}>{item.name}</span>
				</div>
				<span class="text-sm text-gray-500">
					{new Date(item.due).toLocaleDateString('en-GB')}
				</span>
			</div>
		{/each}
		{#if completedTodosCount > 0}
			<button onclick={clearCompletedTodos} class="text-sm text-red-600 hover:text-red-800">
				Clear {completedTodosCount} completed
			</button>
		{/if}
	</div>
</div>

<style>
	:global(.date-time-picker) {
		width: 16rem;
	}
</style>
