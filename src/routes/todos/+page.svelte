<script lang="ts">
	import { LocalStorage } from '$lib/storage.svelte';
	import type { Todo } from '$lib/types';
	import { DateInput } from 'date-picker-svelte';
	import { flip } from 'svelte/animate';
	import { dragHandle, dragHandleZone } from 'svelte-dnd-action';
	import { v4 as uuidv4 } from 'uuid';
	import { fade, slide } from 'svelte/transition';

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
					name: newTodoText,
					priority: 1,
					context: '',
					due: dueDate,
					hidden_at: null,
					completed_at: null,
					children: []
				},
				...todos.current
			];

			newTodoText = '';
			dueDate = new Date();
		}
	}

	function toggleTodo(id: string) {
		todos.current = todos.current.map((todo: Todo) =>
			todo.id === id ? { ...todo, completed_at: new Date() } : todo
		);
	}

	function hideCurrentCompletedTodos() {
		// flip the completed todos to hidden
		todos.current = todos.current.map((todo: Todo) =>
			todo.completed_at ? { ...todo, hidden_at: new Date() } : todo
		);
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
	function handleDndConsider(e: CustomEvent) {
		todos.current = e.detail.items;
	}
	function handleDndFinalize(e: CustomEvent) {
		todos.current = e.detail.items;
	}


	function isFuture(date: Date) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const compareDate = new Date(date);
		compareDate.setHours(0, 0, 0, 0);
		return compareDate > today;
	}

	let currentFilter = 'Today';
	// Count how many are completed
	$: completedTodosCount = todos.current.filter(
		(todo: Todo) => todo.completed_at && !todo.hidden_at
	).length;

	function sortByDueDate() {
		todos.current = todos.current.sort((a: Todo, b: Todo) => {
			// First compare completion status
			if (a.completed_at !== b.completed_at) {
				return a.completed_at ? 1 : -1; // Incomplete items come first
			}
			// Then sort by due date (most recent first)
			return new Date(a.due).getTime() - new Date(b.due).getTime();
		});
	}


</script>

<div class="flex flex-col gap-2">
	<nav class="rounded-lg border-2 border-black bg-blue-600 p-2">
		<div class="flex justify-between gap-4 text-black">
			<div class="flex gap-4">
				<button
					type="button"
					role="tab"
					aria-selected={currentFilter === 'Today'}
					on:click={() => {
						currentFilter = 'Today';
						dueDate = new Date();
					}}
					class={currentFilter === 'Today'
						? 'rounded-lg border-2 border-black p-2'
						: 'rounded-lg border-2 border-transparent p-2 decoration-2 underline-offset-8 hover:underline'}
				>
					{'Today'}
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={currentFilter === 'Not Today'}
					on:click={() => {
						currentFilter = 'Not Today';
						const tomorrow = new Date();
						tomorrow.setDate(tomorrow.getDate() + 1);
						dueDate = tomorrow;
					}}
					class={currentFilter === 'Not Today'
						? 'rounded-lg border-2 border-black p-2'
						: 'rounded-lg border-2 border-transparent p-2 decoration-2 underline-offset-8 hover:underline'}
				>
					{'Not Today'}
				</button>
			</div>
			<div class="flex gap-4">
				<button
					on:click={sortByDueDate}
					class={'ml-auto rounded-lg border-2 border-transparent p-2 decoration-2 underline-offset-8 hover:underline'}
				>
					Sort ↓
				</button>

				<a
					href="/todos/stats"
					class={'rounded-lg border-2 border-transparent p-2 decoration-2 underline-offset-8 hover:underline'}
				>
					📊 Stats
				</a>
			</div>
		</div>
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
				{#if currentFilter === 'Not Today'}
					<div transition:fade={{ duration: 200 }}>
						<DateInput bind:value={dueDate} class="w-fit" format="yyyy-MM-dd" />
					</div>
				{/if}
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
					{#if !item.hidden_at && ((currentFilter === 'Today' && !isFuture(new Date(item.due))) || (currentFilter === 'Not Today' && isFuture(new Date(item.due))))}
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
								class:opacity-50={item.completed_at}
							>
								<div class="flex items-center space-x-2" >
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
											checked={item.completed_at}
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
										class:text-red-500={!item.completed && new Date().setHours(0, 0, 0, 0) >
											new Date(item.due).setHours(0, 0, 0, 0)}
										class:text-gray-500={item.completed || new Date().setHours(0, 0, 0, 0) <=
											new Date(item.due).setHours(0, 0, 0, 0)}
									>
										{#if currentFilter === 'Not Today' || new Date(item.due).toDateString() !== new Date().toDateString()}
											{new Date(item.due).toLocaleDateString('en-GB')}
										{/if}
									</span>
								</div>
							</div>
						{/if}
					{/if}
				</div>
			{/each}
		</section>

		{#if completedTodosCount > 0}
			<button
				on:click={hideCurrentCompletedTodos}
				class="mt-2 text-sm text-red-600 hover:text-red-800"
			>
				Hide {completedTodosCount} completed
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
