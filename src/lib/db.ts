import Dexie, { type EntityTable } from 'dexie';

export type Task = {
	id: string;
	name: string;
	priority: number;
	context: string;
	due: Date;
	completed_at: Date | null;
	hidden_at: Date | null;
	parent: string | null;
	position: number;
};

const db = new Dexie('TasksDatabase') as Dexie & {
    tasks: EntityTable<
        Task,
        'id' // primary key "id" (for the typings only)
    >;
};

db.version(1).stores({
    tasks: 'id, due, completed_at, hidden_at, parent, position'
});

export { db };
