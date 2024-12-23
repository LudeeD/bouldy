<main class="min-h-screen bg-gradient-to-b from-blue-600 to-indigo-300">
	<div class="container mx-auto px-4 py-8">
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
			<!-- Left Navigation (Filters) -->
			<nav class="max-h-64 rounded-lg border-2 border-black bg-white/80 p-4 lg:col-span-2">
				<h3 class="text-sm font-medium uppercase text-indigo-600">Filters</h3>
				<ul class="mt-3 space-y-2">
					<li class="cursor-pointer rounded p-2 text-gray-700 hover:bg-indigo-50">Today</li>
					<li class="cursor-pointer rounded p-2 text-gray-700 hover:bg-indigo-50">Tomorrow</li>
					<li class="cursor-pointer rounded p-2 text-gray-700 hover:bg-indigo-50">This week</li>
					<li class="cursor-pointer rounded p-2 text-gray-700 hover:bg-indigo-50">This month</li>
				</ul>
			</nav>

			<!-- Main Content Area -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-8">
				<!-- Todo List -->
				<div class="rounded-lg bg-white p-4 shadow">
					<h2 class="mb-4 text-lg font-semibold">Todo List</h2>
					<div class="space-y-2">
						<!-- Add your todo list items here -->
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>buy groceries</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>finish project presentation</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>call dentist</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>schedule team meeting</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>buy groceries</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>finish project presentation</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>call dentist</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>schedule team meeting</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>buy groceries</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>finish project presentation</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>call dentist</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>schedule team meeting</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>buy groceries</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>finish project presentation</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>call dentist</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>schedule team meeting</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>buy groceries</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>finish project presentation</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>call dentist</span>
						</div>
						<div class="flex items-center space-x-2 rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" class="form-checkbox" />
							<span>schedule team meeting</span>
						</div>
					</div>
				</div>

				<!-- Notes -->
				<div class="rounded-lg bg-white p-4 shadow">
					<h2 class="mb-4 text-lg font-semibold">Notes</h2>
					<div class="space-y-2">
						<!-- Add your notes here -->
					</div>
				</div>
			</div>

			<!-- Right Navigation (Notes Tree) -->
			<nav class="h-full rounded-lg bg-gray-50 p-4 lg:col-span-2">
				<h3 class="text-sm font-medium uppercase text-gray-500">Notes Tree</h3>
				<ul class="mt-3 space-y-2">
					<li class="cursor-pointer rounded p-2 hover:bg-gray-100">Category 1</li>
					<li class="cursor-pointer rounded p-2 hover:bg-gray-100">Category 2</li>
					<!-- Add more tree items as needed -->
				</ul>
			</nav>
		</div>
	</div>
</main>
