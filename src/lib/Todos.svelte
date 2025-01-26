<script lang="ts">
	import NavLi from './atoms/nav-li.svelte';
	import { LocalStorage } from '$lib/storage.svelte';
	import type { Todo } from './types';
	import { DateInput } from 'date-picker-svelte';
	import { flip } from 'svelte/animate';
	import { dragHandle, dragHandleZone } from 'svelte-dnd-action';
	import { v4 as uuidv4 } from 'uuid';

	const todos = new LocalStorage('todos', []);
	let newTodoText = '';
	let dueDate = new Date();

	let editingId: string | null = null;
	let editingText = '';
	let editingDueDate = new Date();

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		const next_id = uuidv4();
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

	let currentFilter = 'Today';
	// Count how many are completed
	$: completedTodosCount = todos.current.filter((todo: Todo) => todo.completed).length;
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
		<form on:submit={handleSubmit}>
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
			use:dragHandleZone={{ items: todos.current, flipDurationMs }}
			on:consider={handleDndConsider}
			on:finalize={handleDndFinalize}
			class="flex flex-col"
		>
			{#each todos.current as item (item.id)}
				<div animate:flip={{ duration: flipDurationMs }}>
					{#if (currentFilter == 'Today' && isToday(new Date(item.due))) || (currentFilter == 'Tomorrow' && isTomorrow(new Date(item.due))) || (currentFilter == 'This week' && isThisWeek(new Date(item.due))) || (currentFilter == 'This month' && isThisMonth(new Date(item.due))) || currentFilter == 'All'}
						<!-- Decide whether to show edit form or normal display -->
						{#if editingId === item.id}
							<!-- EDIT FORM -->
							<div
								class="mt-2 flex items-center justify-between space-x-2 rounded border bg-blue-50 p-2"
							>
								<form
									class="flex flex-wrap items-center gap-2"
									on:submit|preventDefault={() => saveEdit(item.id)}
								>
									<input
										type="text"
										bind:value={editingText}
										class="rounded border p-1 text-black"
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
										on:click={cancelEdit}
										class="rounded bg-gray-400 px-2 py-1 text-white hover:bg-gray-500"
									>
										Cancel
									</button>
								</form>
							</div>
						{:else}
							<!-- NORMAL DISPLAY -->
							<!--
							  Use 'group' so that children can respond to hover.
							  The edit button will use 'hidden group-hover:inline-block'
							  so that it only appears on hover.
							-->
							<div
								class="group mt-2 flex items-center justify-between space-x-2 rounded border p-2 hover:bg-blue-50"
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
											on:change={() => toggleTodo(item.id)}
										/>
										<span class:line-through={item.completed}>{item.name}</span>
									</div>
								</div>

								<div class="ml-auto flex items-center gap-2">
									<!-- Edit button is hidden by default, shown on hover -->
									<button
										on:click={() => startEdit(item)}
										class="edit-button px-2 py-1 opacity-0 group-hover:opacity-100"
										aria-label="Edit todo"
									>
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
												d="M21.75 6.75a4.5 4.5 0 0 1-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 1 1-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 0 1 6.336-4.486l-3.276 3.276a3.004 3.004 0 0 0 2.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852Z"
											/>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M4.867 19.125h.008v.008h-.008v-.008Z"
											/>
										</svg>
									</button>
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
						{/if}
					{/if}
				</div>
			{/each}
		</section>

		{#if completedTodosCount > 0}
			<button on:click={clearCompletedTodos} class="mt-2 text-sm text-red-600 hover:text-red-800">
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
