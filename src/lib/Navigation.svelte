<nav class="container mx-auto flex flex-col">
	<ul class="flex list-inside list-disc justify-center gap-8">
		<li>
			<a href="/" class="decoration-2 underline-offset-8 hover:underline">Todos</a>
		</li>
		<li>
			<a href="/notepad" class="decoration-2 underline-offset-8 hover:underline">Notepad</a>
		</li>
		<li>
			<a href="/pomodoro" class="decoration-2 underline-offset-8 hover:underline">Notepad</a>
		</li>
	</ul>
	<div class="mt-4 flex justify-between text-sm text-gray-600">
		<span>Built: {new Date(import.meta.env.BUILD_TIMESTAMP).toUTCString()}</span>
		<span
			>Made with <a href="/debug">❤️</a> by
			<a href="https://github.com/ludeed" class="decoration-2 underline-offset-8 hover:underline"
				>ludeed</a
			></span
		>
	</div>
</nav>
