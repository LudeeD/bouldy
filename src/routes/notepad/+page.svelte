<script lang="ts">
	import Editor from '$lib/Editor.svelte';

	import { LocalStorage } from '$lib/storage.svelte';

	const notepad = new LocalStorage('notepad', {
		type: 'doc',
		content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Write Your Notes Here' }] }]
	});

	function handleEditorChange(event: string) {
		notepad.current = event;
	}
</script>

<div class="flex h-full flex-1 flex-col rounded-lg border-2 border-black bg-white p-4">
	<Editor value={notepad.current} onchange={handleEditorChange} />
</div>

<svelte:head>
	<title>Bouldy - notepad</title>
</svelte:head>
