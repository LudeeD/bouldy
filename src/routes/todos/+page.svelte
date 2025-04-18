<script lang="ts">
	import { dragHandle, dragHandleZone } from 'svelte-dnd-action';
	import { DateInput } from 'date-picker-svelte';
	import { flip } from 'svelte/animate';
	import { v4 as uuidv4 } from 'uuid';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { db, type Task } from '$lib/db';

	let items: Task[] = [];
	let showSavedNotification = false;

	async function loadItems() {
		const allTasks = await db.tasks
			.orderBy('position')
			.reverse()
			.filter((task) => !task.hidden_at)
			.toArray();

		// Sort to ensure children are placed after their parents
		items = allTasks.sort((a, b) => {
			// If a is a parent of b, a should come first
			if (b.parent === a.id) return -1;
			// If b is a parent of a, b should come first
			if (a.parent === b.id) return 1;
			// Otherwise, maintain the original position-based order
			return items.length - a.position - (items.length - b.position);
		});
	}

	async function updateDbOrder() {
		const updates = items.map((item, index) => ({
			id: item.id,
			changes: { position: items.length - index }
		}));
		await db.transaction('rw', db.tasks, async () => {
			await Promise.all(updates.map((update) => db.tasks.update(update.id, update.changes)));
		});

		// Show notification
		showSavedNotification = true;
		setTimeout(() => {
			showSavedNotification = false;
		}, 2000); // Hide after 2 seconds
	}

	async function handleDndFinalizeToIndexedDB(event: CustomEvent) {
		// The event.detail.items contains the new order
		// (this is provided by svelte-dnd-action).
		items = event.detail.items;

		// 4. Update the order property for each item in the DB
		await updateDbOrder();

		await loadItems();
		console.log('loaded items', items);
	}

	async function breakTask(parentId: string) {
		// Get the parent task
		const parentTask = items.find((item) => item.id === parentId);
		if (!parentTask) return;

		// Create a new subtask
		const newSubtaskId = uuidv4();
		const position = parentTask.position + 1;

		await db.tasks.add({
			id: newSubtaskId,
			name: 'Sub-task of ' + parentTask.name,
			due: parentTask.due,
			completed_at: null,
			hidden_at: null,
			position: position,
			priority: 0,
			context: '',
			parent: parentId // Link to parent
		});

		// Show notification
		showSavedNotification = true;
		setTimeout(() => {
			showSavedNotification = false;
		}, 2000);

		await loadItems();

		// Start editing the new subtask
		const newTask = items.find((item) => item.id === newSubtaskId);
		if (newTask) {
			startEdit(newTask);
		}
	}

	function handleDndConsiderToIndexedDB(event: CustomEvent) {
		items = event.detail.items;
	}

	onMount(loadItems);

	let newTodoText = '';
	let dueDate = new Date();
	let editingId: string | null = null;
	let editingText = '';
	let editingDueDate = new Date();

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		const position = items.length;
		if (newTodoText.trim()) {
			const id = await db.tasks.add({
				id: uuidv4(),
				name: newTodoText,
				due: dueDate,
				completed_at: null,
				hidden_at: null,
				position: position,
				priority: 0,
				context: '',
				parent: null
			});

			newTodoText = '';
			dueDate = new Date();
		}

		showSavedNotification = true;
		setTimeout(() => {
			showSavedNotification = false;
		}, 2000); // Hide after 2 seconds

		await loadItems();
	}

	async function toggleTodo(id: string) {
		console.log('toggleTodo', id);

		const task = items.find((item) => item.id === id);
		if (!task) return;

		await db.tasks.update(id, { completed_at: task.completed_at ? null : new Date() });
		// Show notification
		showSavedNotification = true;
		setTimeout(() => {
			showSavedNotification = false;
		}, 2000); // Hide after 2 seconds

		await loadItems();
	}

	async function hideCurrentCompletedTodos() {
		console.log('hideCurrentCompletedTodos');

		const completedTodos = items.filter((item) => item.completed_at && !item.hidden_at);

		await db.transaction('rw', db.tasks, async () => {
			await Promise.all(
				completedTodos.map((todo) => db.tasks.update(todo.id, { hidden_at: new Date() }))
			);
		});

		await loadItems();
	}

	function startEdit(todo: Task) {
		editingId = todo.id;
		editingText = todo.name;
		editingDueDate = new Date(todo.due);
	}

	async function saveEdit(id: string) {
		const task = items.find((item) => item.id === id);
		if (!task) return;

		await db.tasks.update(id, {
			name: editingText.trim(),
			due: editingDueDate
		});

		// Show notification
		showSavedNotification = true;
		setTimeout(() => {
			showSavedNotification = false;
		}, 2000); // Hide after 2 seconds

		await loadItems();

		cancelEdit();
	}

	function cancelEdit() {
		editingId = null;
		editingText = '';
		editingDueDate = new Date();
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
	$: completedTodosCount = items.filter(
		(todo: Task) => todo.completed_at && !todo.hidden_at
	).length;

	async function sortByDueDate() {
		// First, sort the items by due date and completion status
		const sortedItems = [...items].sort((a, b) => {
			// Completed items go to the bottom
			if (a.completed_at && !b.completed_at) return 1;
			if (!a.completed_at && b.completed_at) return -1;
			if (a.completed_at && b.completed_at) return 0;

			// For incomplete items, sort by due date
			const dateA = new Date(a.due);
			const dateB = new Date(b.due);
			return dateA.getTime() - dateB.getTime();
		});

		// Update positions based on the new sort order
		const updates = sortedItems.map((item, index) => ({
			id: item.id,
			changes: { position: items.length - index }
		}));

		await db.transaction('rw', db.tasks, async () => {
			await Promise.all(updates.map((update) => db.tasks.update(update.id, update.changes)));
		});

		// Show notification
		showSavedNotification = true;
		setTimeout(() => {
			showSavedNotification = false;
		}, 2000); // Hide after 2 seconds

		await loadItems();
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
					🧙 Sort
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

		{#if items.length === 0}
			<div class="text-gray-500">No todos found</div>
		{/if}

		<section
			use:dragHandleZone={{ items, flipDurationMs: 300 }}
			on:finalize={handleDndFinalizeToIndexedDB}
			on:consider={handleDndConsiderToIndexedDB}
			class="flex flex-col"
		>
			{#each items as item (item.id)}
				<div animate:flip={{ duration: 300 }}>
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
								class:ml-8={item.parent}
								class:border-l-4={item.parent}
								class:border-l-blue-400={item.parent}
								class:bg-blue-50={item.parent && !item.completed_at}
								class:bg-gray-50={item.parent && item.completed_at}
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
											checked={item.completed_at !== null}
											on:change={() => toggleTodo(item.id)}
										/>
										<span class:line-through={item.completed_at}>{item.name}</span>
									</div>
								</div>

								<div class="ml-auto flex items-center gap-2">
									<!-- Edit button is hidden by default, shown on hover -->

									<button
										hidden={!!item.parent}
										on:click={() => breakTask(item.id)}
										class="break-button px-2 py-1 opacity-0 group-hover:opacity-100"
										aria-label="Break task into subtasks"
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
												d="m7.848 8.25 1.536.887M7.848 8.25a3 3 0 1 1-5.196-3 3 3 0 0 1 5.196 3Zm1.536.887a2.165 2.165 0 0 1 1.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 1 1-5.196 3 3 3 0 0 1 5.196-3Zm1.536-.887a2.165 2.165 0 0 0 1.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863 2.077-1.199m0-3.328a4.323 4.323 0 0 1 2.068-1.379l5.325-1.628a4.5 4.5 0 0 1 2.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.33 4.33 0 0 0 10.607 12m3.736 0 7.794 4.5-.802.215a4.5 4.5 0 0 1-2.48-.043l-5.326-1.629a4.324 4.324 0 0 1-2.068-1.379M14.343 12l-2.882 1.664"
											/>
										</svg>
									</button>
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
										class:text-red-500={!item.completed_at &&
											new Date().setHours(0, 0, 0, 0) > new Date(item.due).setHours(0, 0, 0, 0)}
										class:text-gray-500={item.completed_at ||
											new Date().setHours(0, 0, 0, 0) <= new Date(item.due).setHours(0, 0, 0, 0)}
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

{#if showSavedNotification}
	<div
		transition:fade
		class="fixed bottom-4 right-4 rounded-lg bg-green-600 px-4 py-2 text-white shadow-lg"
	>
		Saved successfully
	</div>
{/if}

<svelte:head>
	<title>Bouldy</title>
</svelte:head>

<style>
	:global(.date-time-picker) {
		width: 16rem;
	}
</style>
