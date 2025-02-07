<script lang="ts">
	import { LocalStorage } from '$lib/storage.svelte';
	import type { Todo } from '$lib/types';

	const todos = new LocalStorage('todos', []);

	function clearCompletedTodos() {
		todos.current = todos.current.filter((todo: Todo) => !todo.completed_at);
	}

	// Helper function to get date string (YYYY-MM-DD)
	function getDateString(date: Date) {
		return new Date(date).toISOString().split('T')[0];
	}

	// Get todos completed in the last 7 days
	const completed_todos = $derived.by(() => {
		return todos.current.filter((todo: Todo) => todo.completed_at);
	});

	// Calculate completion rate per day
	const completionStats = $derived.by(() => {
		const stats = new Map<string, number>();
		const now = new Date();
		const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));

		completed_todos.forEach((todo: Todo) => {
			if (!todo.completed_at) return;
			const dateStr = getDateString(todo.completed_at);
			if (new Date(dateStr) >= sevenDaysAgo) {
				stats.set(dateStr, (stats.get(dateStr) || 0) + 1);
			}
		});

		return Array.from(stats.entries())
			.sort((a: [string, number], b: [string, number]) => b[0].localeCompare(a[0]))
			.slice(0, 7);
	});

	// Calculate average completion time
	const avgCompletionTime = $derived.by(() => {
		const times = completed_todos
			.filter((todo: Todo) => todo.completed_at)
			.map((todo: Todo) => {
				const created = new Date(todo.due);
				const completed = new Date(todo.completed_at!);
				return completed.getTime() - created.getTime();
			});

		if (times.length === 0) return 0;
		return Math.round(
			times.reduce((acc: number, curr: number) => acc + curr, 0) /
				times.length /
				(1000 * 60 * 60 * 24)
		);
	});

	// Calculate overdue rate
	const overdueRate = $derived.by(() => {
		const total = todos.current.length;
		if (total === 0) return 0;

		const overdue = todos.current.filter(
			(todo: Todo) => !todo.completed_at && new Date(todo.due) < new Date()
		).length;

		return Math.round((overdue / total) * 100);
	});

	// Calculate completion rate
	const completionRate = $derived.by(() => {
		const total = todos.current.length + completed_todos.length;
		if (total === 0) return 0;
		return Math.round((completed_todos.length / total) * 100);
	});

	// Get busiest days
	const busiestDays = $derived.by(() => {
		const dayStats = new Map<string, number>();
		todos.current.forEach((todo: Todo) => {
			const dateStr = getDateString(todo.due);
			dayStats.set(dateStr, (dayStats.get(dateStr) || 0) + 1);
		});

		return Array.from(dayStats.entries())
			.sort((a: [string, number], b: [string, number]) => b[1] - a[1])
			.slice(0, 3);
	});
</script>

<div class="flex flex-col gap-2">
	<nav class="rounded-lg border-2 border-black bg-blue-600 p-2">
		<div class="flex justify-between gap-4 text-black">
			<div class="flex gap-4">
				<a
					href="/todos"
					type="button"
					role="tab"
					class={'rounded-lg border-2 border-transparent p-2 decoration-2 underline-offset-8 hover:underline'}
				>
					{'🔙 Back'}
				</a>
			</div>
			<div class="flex gap-4">
				<a
					href="/todos/stats"
					class={'rounded-lg border-2 border-black p-2'}
				>
					📊 Stats
				</a>
			</div>
		</div>
	</nav>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
		<!-- Overall Stats -->
		<div class="rounded-lg border-2 border-black bg-white p-4">
			<h2 class="mb-4 text-lg font-semibold">Overall Stats</h2>
			<div class="flex flex-col gap-2">
				<div>
					<span class="text-gray-600">Total Todos:</span>
					<span class="ml-2 font-semibold">{todos.current.length}</span>
				</div>
				<div>
					<span class="text-gray-600">Completed:</span>
					<span class="ml-2 font-semibold">{completed_todos.length}</span>
				</div>
				<div>
					<span class="text-gray-600">Completion Rate:</span>
					<span class="ml-2 font-semibold">{completionRate}%</span>
				</div>
				<div>
					<span class="text-gray-600">Overdue Rate:</span>
					<span class="ml-2 font-semibold">{overdueRate}%</span>
				</div>
				<div>
					<span class="text-gray-600">Avg Completion Time:</span>
					<span class="ml-2 font-semibold">{avgCompletionTime} days</span>
				</div>
			</div>
		</div>

		<!-- Completion Trend -->
		<div class="rounded-lg border-2 border-black bg-white p-4">
			<h2 class="mb-4 text-lg font-semibold">Last 7 Days Completion</h2>
			{#if completionStats.length === 0}
				<div class="text-gray-500">No completions in the last 7 days</div>
			{:else}
				<div class="flex flex-col gap-2">
					{#each completionStats as [date, count]}
						<div class="flex items-center justify-between">
							<span class="text-gray-600">{new Date(date).toLocaleDateString('en-GB')}</span>
							<div class="flex items-center gap-2">
								<div class="h-4 bg-blue-600" style="width: {Math.min(count * 20, 100)}px"></div>
								<span class="font-semibold">{count}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Busiest Days -->
		<div class="rounded-lg border-2 border-black bg-white p-4">
			<h2 class="mb-4 text-lg font-semibold">Busiest Days</h2>
			{#if busiestDays.length === 0}
				<div class="text-gray-500">No upcoming todos</div>
			{:else}
				<div class="flex flex-col gap-2">
					{#each busiestDays as [date, count]}
						<div class="flex items-center justify-between">
							<span class="text-gray-600">{new Date(date).toLocaleDateString('en-GB')}</span>
							<span class="font-semibold">{count} todos</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Recently Completed -->
	<div class="mt-4 rounded-lg border-2 border-black bg-white p-4">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold">All Completed</h2>
			{#if completed_todos.length > 0}
				<button onclick={clearCompletedTodos} class="rounded-md px-2 bg-red-600 text-white hover:text-red-800">
					Clear {completed_todos.length} completed
				</button>
			{/if}
		</div>

		{#if completed_todos.length === 0}
			<div class="text-gray-500">No completed todos</div>
		{:else}
			{#each completed_todos as item}
				<div
					class="group mt-2 flex items-center justify-between space-x-2 rounded border-2 border-black p-2 hover:bg-blue-50"
				>
					<div class="flex items-center space-x-2">
						<div class="flex items-center space-x-2">
							<input type="checkbox" class="form-checkbox" checked={item.completed_at} disabled />
							<span class:line-through={item.completed_at}>{item.name}</span>
						</div>
					</div>

					<div class="ml-auto flex items-center gap-2">
						<span class="text-sm text-gray-500">
							Completed {new Date(item.completed_at!).toLocaleDateString('en-GB')}
						</span>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<svelte:head>
	<title>Stats - Bouldy</title>
</svelte:head>

<style>
	:global(.date-time-picker) {
		width: 16rem;
	}
</style>
