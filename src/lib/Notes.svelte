<script lang="ts">
	import Editor from './Editor.svelte';

	import { LocalStorage } from '$lib/storage.svelte';

	const notepad = new LocalStorage('notepad', {
		type: 'doc',
		content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Write Your Notes Here' }] }]
	});

	function handleEditorChange(event: string) {
		notepad.current = event;
	}

	console.log(notepad.current);
</script>

<div class="flex basis-1/2 flex-row gap-2">
	<div class="flex h-full flex-1 flex-col rounded-lg border-2 border-black bg-white p-4">
		<h2 class="mb-4 text-lg font-semibold">Notepad</h2>
		<Editor value={notepad.current} onchange={handleEditorChange} />
	</div>
</div>
