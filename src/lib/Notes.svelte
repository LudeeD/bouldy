<script>
	import Editor from './Editor.svelte';
</script>

<div class="flex basis-1/2 flex-row gap-2">
	<div class="flex-1 rounded-lg border-2 border-black bg-white p-4">
		<h2 class="mb-4 text-lg font-semibold">Notes</h2>
		<div class="space-y-2">
			<!-- Add your notes here -->
			<Editor />
		</div>
	</div>
	<nav class="h-fit min-w-[200px] rounded-lg border-2 border-black bg-white p-4">
		<h3 class="text-sm font-medium uppercase text-indigo-600">Notes</h3>
		<ul class="mt-3 space-y-2">
			<li class="cursor-pointer rounded p-2 text-gray-700 hover:bg-indigo-50">Today</li>
			<li class="cursor-pointer rounded p-2 text-gray-700 hover:bg-indigo-50">Tomorrow</li>
			<li class="cursor-pointer rounded p-2 text-gray-700 hover:bg-indigo-50">This week</li>
			<li class="cursor-pointer rounded p-2 text-gray-700 hover:bg-indigo-50">This month</li>
			<li class="cursor-pointer rounded p-2 text-gray-700 hover:bg-indigo-50">This month</li>
			<li class="cursor-pointer rounded p-2 text-gray-700 hover:bg-indigo-50">This month</li>
			<li class="cursor-pointer rounded p-2 text-gray-700 hover:bg-indigo-50">This month</li>
			<li class="cursor-pointer rounded p-2 text-gray-700 hover:bg-indigo-50">This month</li>
			<li class="cursor-pointer rounded p-2 text-gray-700 hover:bg-indigo-50">This month</li>
		</ul>
	</nav>
</div>
