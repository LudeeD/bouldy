export type Todo = {
	id: string;
	name: string;
	priority: number;
	context: string;
	due: Date;
	hidden_at: Date | null;
	completed_at: Date | null;
	children: Todo[];
};
