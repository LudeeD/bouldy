<script lang="ts">
	import NavLi from './atoms/nav-li.svelte';
	import { LocalStorage } from '$lib/storage.svelte';
	import type { Todo } from './types';
	import { DateInput } from 'date-picker-svelte';
	import { flip } from 'svelte/animate';
	import { dragHandle, dragHandleZone } from 'svelte-dnd-action';
	import { v4 as uuidv4 } from 'uuid';

	// LocalStorage store
	const todos = new LocalStorage('todos', []);

	// -- New/Edited fields
	let newTodoText = $state('');
	let dueDate = $state(new Date());

	// -- Editing states
	let editingId: string | null = $state(null); // which todo is being edited
	let editingText = $state(''); // text for the todo being edited
	let editingDueDate = $state(new Date()); // due date for the todo being edited

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		const next_id = uuidv4(); // store string ID

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

	function toggleTodo(id: string) {
		todos.current = todos.current.map((todo: Todo) =>
			todo.id === id ? { ...todo, completed: !todo.completed } : todo
		);
	}

	function clearCompletedTodos() {
		todos.current = todos.current.filter((todo: Todo) => !todo.completed);
	}

	// -- Editing helpers
	function startEdit(todo: Todo) {
		editingId = todo.id;
		editingText = todo.name;
		editingDueDate = new Date(todo.due);
	}

	function saveEdit(id: string) {
		todos.current = todos.current.map((todo: Todo) => {
			if (todo.id === id) {
				return {
					...todo,
					name: editingText.trim(),
					due: editingDueDate
				};
			}
			return todo;
		});
		cancelEdit();
	}

	function cancelEdit() {
		editingId = null;
		editingText = '';
		editingDueDate = new Date();
	}

	// svelte-dnd-action
	const flipDurationMs = 300;
	function handleDndConsider(e) {
		todos.current = e.detail.items;
	}
	function handleDndFinalize(e) {
		todos.current = e.detail.items;
	}

	// Filters
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

	let currentFilter = $state('Today');

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
		<!-- Add new todos -->
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

		<!-- If no todos, show some placeholder text -->
		{#if todos.current.length === 0}
			<div class="text-gray-500">No todos found</div>
		{/if}

		<!-- Todo list -->
		<section
			use:dragHandleZone={{ items: todos.current, flipDurationMs }}
			onconsider={handleDndConsider}
			onfinalize={handleDndFinalize}
			class="flex flex-col"
		>
			{#each todos.current as item (item.id)}
				<div animate:flip={{ duration: flipDurationMs }}>
					<!-- Filter check -->
					{#if (currentFilter == 'Today' && isToday(new Date(item.due))) || (currentFilter == 'Tomorrow' && isTomorrow(new Date(item.due))) || (currentFilter == 'This week' && isThisWeek(new Date(item.due))) || (currentFilter == 'This month' && isThisMonth(new Date(item.due))) || currentFilter == 'All'}
						<!-- Editing form vs. display -->
						{#if editingId === item.id}
							<!-- EDITING MODE -->
							<div
								class="mt-2 flex items-center justify-between space-x-2 rounded border bg-blue-50 p-2"
							>
								<form class="flex flex-wrap items-center gap-2" onsubmit={() => saveEdit(item.id)}>
									<input
										type="text"
										bind:value={editingText}
										class="rounded border p-1 text-black"
										placeholder="Edit todo text"
									/>
									<DateInput bind:value={editingDueDate} format="yyyy-MM-dd" class="bg-blue-100" />
									<button
										type="submit"
										class="rounded bg-green-600 px-2 py-1 text-white hover:bg-green-700"
									>
										Save
									</button>
									<button
										type="button"
										onclick={cancelEdit}
										class="rounded bg-gray-400 px-2 py-1 text-white hover:bg-gray-500"
									>
										Cancel
									</button>
								</form>
							</div>
						{:else}
							<!-- NORMAL DISPLAY -->
							<div
								class="mt-2 flex items-center justify-between space-x-2 rounded border p-2 hover:bg-blue-50"
							>
								<div class="flex items-center space-x-2">
									<div use:dragHandle aria-label="drag-handle" class="handle">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="1.5"
											stroke="currentColor"
											class="size-6"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"
											/>
										</svg>
									</div>
									<div class="flex items-center space-x-2">
										<input
											type="checkbox"
											class="form-checkbox"
											checked={item.completed}
											onchange={() => toggleTodo(item.id)}
										/>
										<span class:line-through={item.completed}>{item.name}</span>
									</div>
								</div>

								<div class="ml-auto flex items-center gap-2">
									<!-- Display due date; if it's past due, make it red -->
									<span
										class="text-sm"
										class:text-red-500={new Date().setHours(0, 0, 0, 0) >
											new Date(item.due).setHours(0, 0, 0, 0)}
										class:text-gray-500={new Date().setHours(0, 0, 0, 0) <=
											new Date(item.due).setHours(0, 0, 0, 0)}
									>
										{new Date(item.due).toLocaleDateString('en-GB')}
									</span>

									<!-- Edit button -->
									<button
										onclick={() => startEdit(item)}
										class="rounded bg-yellow-500 px-2 py-1 text-white hover:bg-yellow-600"
									>
										Edit
									</button>
								</div>
							</div>
						{/if}
					{/if}
				</div>
			{/each}
		</section>

		<!-- If there are completed todos, show clear-completed button -->
		{#if completedTodosCount > 0}
			<button onclick={clearCompletedTodos} class="mt-2 text-sm text-red-600 hover:text-red-800">
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
