export type Todo = {
	id: string;
	name: string;
	priority: number;
	context: string;
	due: Date;
	completed: boolean;
	hidden: boolean;
};
