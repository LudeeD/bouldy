import { redirect } from '@sveltejs/kit';

export function load() {
	// Temporary redirect from "/" to "/todos"
	throw redirect(307, '/todos');
}
