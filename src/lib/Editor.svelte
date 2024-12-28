<script lang="ts">
	const { value, onchange } = $props(); // Add value prop

	import { onMount } from 'svelte';
	import { EditorState } from 'prosemirror-state';
	import { EditorView } from 'prosemirror-view';
	import { Schema } from 'prosemirror-model';
	import { schema } from 'prosemirror-schema-basic';
	import { addListNodes } from 'prosemirror-schema-list';
	import { baseKeymap, toggleMark } from 'prosemirror-commands';
	import { keymap } from 'prosemirror-keymap';

	let element: HTMLElement;
	let view: EditorView;

	const mySchema = new Schema({
		nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
		marks: schema.spec.marks
	});

	const toggleBold = toggleMark(mySchema.marks.strong);
	const toggleItalic = toggleMark(mySchema.marks.em);

	onMount(() => {
		const state = EditorState.create({
			doc: mySchema.nodeFromJSON(value),
			schema: mySchema,
			plugins: [
				keymap({
					'Mod-b': toggleBold,
					'Mod-i': toggleItalic,
					...baseKeymap
				})
			]
		});

		view = new EditorView(element, {
			state,
			dispatchTransaction(transaction) {
				let newState = view.state.apply(transaction);
				view.updateState(newState);
				// Emit change event with new content
				onchange(newState.doc.toJSON());
			}
		});

		return () => {
			view.destroy();
		};
	});

	function handleBold() {
		toggleBold(view.state, view.dispatch);
	}

	function handleItalic() {
		toggleItalic(view.state, view.dispatch);
	}
</script>

<div class="flex flex-col">
	<div class="rounded-t-lg border-b border-gray-200 bg-gray-50 p-2">
		<div class="flex gap-1">
			<button
				onclick={handleBold}
				class="rounded px-2 py-1 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-indigo-50 active:bg-indigo-100"
			>
				<span class="font-bold">B</span>
			</button>
			<button
				onclick={handleItalic}
				class="rounded px-2 py-1 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-indigo-50 active:bg-indigo-100"
			>
				<span class="italic">I</span>
			</button>
		</div>
	</div>
	<div
		bind:this={element}
		class="prose prose-sm min-h-[200px] max-w-none rounded-b-lg bg-white p-4 focus:outline-none"
	></div>
</div>

<style>
	:global(.ProseMirror) {
		outline: none;
		min-height: 200px;
	}

	:global(.ProseMirror p) {
		margin: 0;
		line-height: 1.6;
	}

	:global(.ProseMirror p:first-child) {
		margin-top: 0;
	}

	:global(.ProseMirror p:last-child) {
		margin-bottom: 0;
	}
</style>
