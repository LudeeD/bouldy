<script lang="ts">
	import NavLi from './atoms/nav-li.svelte';
	import { LocalStorage } from '$lib/storage.svelte';
	import type { Todo } from './types';
	import { DateInput } from 'date-picker-svelte';
	import { flip } from 'svelte/animate';
	import { dndzone } from 'svelte-dnd-action';

	const todos = new LocalStorage('todos', []);

	let newTodoText = $state('');
	let dueDate = $state(new Date()); // Initialize with today's date

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		const next_id = todos.current.length
			? Math.max(...todos.current.map((todo: Todo) => todo.id)) + 1
			: 1;

		if (newTodoText.trim()) {
			todos.current = [
				{
					id: next_id,
					completed: false,
					name: newTodoText,
					priority: 1,
					context: 'normal',
					due: dueDate
				},
				...todos.current
			];

			newTodoText = '';
			dueDate = new Date();
		}
	}

	function toggleTodo(id: number) {
		todos.current = todos.current.map((todo: Todo) =>
			todo.id === id ? { ...todo, completed: !todo.completed } : todo
		);
	}

	function clearCompletedTodos() {
		todos.current = todos.current.filter((todo: Todo) => !todo.completed);
	}
	const flipDurationMs = 300;
	function handleDndConsider(e) {
		todos.current = e.detail.items;
	}
	function handleDndFinalize(e) {
		todos.current = e.detail.items;
	}

	function isToday(date: Date) {
		const today = new Date();
		return (
			date.getDate() <= today.getDate() &&
			date.getMonth() <= today.getMonth() &&
			date.getFullYear() <= today.getFullYear()
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
		return date.getMonth() <= today.getMonth() && date.getFullYear() <= today.getFullYear();
	}

	let currentFilter = $state('Today'); // Track current filter

	let completedTodosCount = $derived(todos.current.filter((todo: Todo) => todo.completed).length);
</script>

<div class="flex flex-col gap-2">
	<nav class="rounded-lg border-2 border-black bg-blue-600 p-2">
		<ul class="flex flex-wrap gap-4 text-black">
			<NavLi
				text="Today"
				selected={currentFilter === 'Today'}
				onclick={() => {
					currentFilter = 'Today';
					dueDate = new Date();
				}}
			/>
			<NavLi
				text="Tomorrow"
				selected={currentFilter === 'Tomorrow'}
				onclick={() => {
					currentFilter = 'Tomorrow';
					const tomorrow = new Date();
					tomorrow.setDate(tomorrow.getDate() + 1);
					dueDate = tomorrow;
				}}
			/>
			<NavLi
				text="This week"
				selected={currentFilter === 'This week'}
				onclick={() => {
					currentFilter = 'This week';
					const weekEnd = new Date();
					weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
					dueDate = weekEnd;
				}}
			/>
			<NavLi
				text="This month"
				selected={currentFilter === 'This month'}
				onclick={() => {
					currentFilter = 'This month';
					const lastDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
					dueDate = lastDayOfMonth;
				}}
			/>
			<NavLi
				text="All"
				selected={currentFilter === 'All'}
				onclick={() => {
					currentFilter = 'All';
				}}
			/>
		</ul>
	</nav>

	<div class="flex flex-col gap-2 rounded-lg border-2 border-black bg-white p-4">
		<form onsubmit={handleSubmit}>
			<div class="flex flex-wrap gap-2">
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

		<section
			use:dndzone={{ items: todos.current, flipDurationMs }}
			onconsider={handleDndConsider}
			onfinalize={handleDndFinalize}
			class="flex flex-col gap-2"
		>
			{#each todos.current as item (item.id)}
				<div animate:flip={{ duration: flipDurationMs }}>
					{#if (currentFilter == 'Today' && isToday(new Date(item.due))) || (currentFilter == 'Tomorrow' && isTomorrow(new Date(item.due))) || (currentFilter == 'This week' && isThisWeek(new Date(item.due))) || (currentFilter == 'This month' && isThisMonth(new Date(item.due))) || currentFilter == 'All'}
						<div
							class="flex items-center justify-between space-x-2 rounded border p-2 hover:bg-blue-50"
						>
							<div class="flex items-center space-x-2">
								<input
									type="checkbox"
									class="form-checkbox"
									checked={item.completed}
									onchange={() => toggleTodo(item.id)}
								/>
								<span class:line-through={item.completed}>{item.name}</span>
							</div>

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
					{/if}
				</div>
			{/each}
		</section>

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
