import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		'import.meta.env.BUILD_TIMESTAMP': JSON.stringify(new Date().toISOString())
	}
});
