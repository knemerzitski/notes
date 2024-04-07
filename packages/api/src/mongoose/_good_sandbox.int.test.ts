import { ApolloServer } from '@apollo/server';
import DataLoader from 'dataloader';
import { assert, it } from 'vitest';
import util from 'util';
import { GraphQLError } from 'graphql';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

interface Database {
  findNoteMany(
    noteFirst: number | undefined,
    noteAfter: number,
    recordFirst: number,
    projectFoo: boolean,
    projectBar: boolean
  ): Promise<PartialNote[]>;
}

interface Note {
  name: string;
  records: Record[];
}

interface Record {
  foo: string;
  bar: number;
}

type PartialNote = Partial<Note> | { name?: string; records?: Partial<Record>[] };

interface INotesDataSource {
  get(first: number, after?: number): INoteDataSource[];
}

interface INoteDataSource {
  getName(): Promise<Note['name']>;
  getRecords(first: number): IRecordDataSource[];
}

interface IRecordDataSource {
  getFoo(): Promise<Record['foo']>;
  getBar(): Promise<Record['bar']>;
}

interface Context {
  datasources: {
    notes: INotesDataSource;
  };
}

const apolloServer = new ApolloServer<Context>({
  typeDefs: `#graphql
    type Query {
      notes(first: Int, after: Int): [Note]!
      get: Test
    }

    type Note {
      name: String!
      records(first: Int): [Field]!
    }

    type Field {
      foo: String!
      bar: Int!
    }

    type Test {
      must: String!
      maybe: String
    }
  `,
  resolvers: {
    Query: {
      notes(
        _parent,
        { first, after }: { first: number; after: number | undefined | null },
        ctx
      ) {
        return ctx.datasources.notes.get(first, after ?? undefined);
      },
      get() {
        return {}
      },
    },
    Note: {
      name(parent: INoteDataSource) {
        return parent.getName();
      },
      records(parent: INoteDataSource, { first }: { first: number }) {
        return parent.getRecords(first);
      },
    },
    Field: {
      foo(parent: IRecordDataSource) {
        return parent.getFoo();
      },
      bar(parent: IRecordDataSource) {
        return parent.getBar();
      },
    },
    Test: {
      must() {
        // return 'must';
        return undefined;
      },
      maybe() {
        return null;
      },
    }
  },
});

function getUnionKey(keys: Readonly<NotesLoaderKey[]>) {
  const noteAfter = keys
    .map((b) => b.noteAfter)
    .reduce((a, b) => {
      if (a == null) {
        return b;
      }
      if (b == null) {
        return a;
      }
      return Math.min(a, b);
    });

  return {
    noteAfter: noteAfter,
    noteFirst: keys.reduce((a, b) => (b.noteFirst ? Math.max(a, b.noteFirst) : 0), 0),
    recordFirst: keys.reduce(
      (a, b) => (b.recordFirst ? Math.max(a, b.recordFirst) : 0),
      0
    ),
    projectFoo: keys.some((k) => k.projectFoo),
    projectBar: keys.some((k) => k.projectBar),
  };
}

interface NotesLoaderKey {
  noteAfter?: number;
  noteFirst?: number;
  recordFirst?: number;
  projectFoo?: boolean;
  projectBar?: boolean;
}

class NotesDataSource implements INotesDataSource {
  private db: Database;

  private notesLoader = new DataLoader<NotesLoaderKey, PartialNote[]>(async (keys) => {
    const unionKey = getUnionKey(keys);
    const notes = await this.db.findNoteMany(
      unionKey.noteAfter,
      unionKey.noteFirst,
      unionKey.recordFirst,
      unionKey.projectFoo,
      unionKey.projectBar
    );

    return keys.map((key) => {
      return notes
        .slice(
          unionKey.noteAfter && key.noteAfter ? key.noteAfter - unionKey.noteAfter : 0,
          key.noteFirst
        )
        .map((note) => ({
          ...note,
          records: note.records?.slice(0, key.recordFirst).map((record) => ({
            ...record,
            foo: key.projectFoo ? record.foo : undefined,
            bar: key.projectBar ? record.bar : undefined,
          })),
        }));
    });
  });

  constructor(db: Database) {
    this.db = db;
  }

  get(first: number, after?: number): INoteDataSource[] {
    return [...new Array<undefined>(first)].map(
      (_, i) =>
        new NoteDataSource(async (key) => {
          const notes = await this.notesLoader.load({
            ...key,
            noteAfter: after,
            noteFirst: first,
          });
          const note = notes[i];
          if (!note) {
            throw new GraphQLError(`Note ${i} is null`, {
              extensions: {
                code: GraphQLErrorCode.ArrayElementNull,
              },
            });
          }
          return note;
        })
    );
  }
}

type NoteLoaderKey = NotesLoaderKey;

class NoteDataSource implements INoteDataSource {
  private load: (key?: NoteLoaderKey) => Promise<PartialNote>;

  constructor(load: (key?: NoteLoaderKey) => Promise<PartialNote>) {
    this.load = load;
  }

  async getName(): Promise<string> {
    const name = (await this.load()).name;
    if (!name) {
      throw new GraphQLError('Failed to resolve note name');
    }
    return name;
  }

  getRecords(first: number): IRecordDataSource[] {
    return [...new Array<undefined>(first)].map(
      (_, i) =>
        new RecordDataSource(async (key) => {
          const note = await this.load({
            ...key,
            recordFirst: first,
          });
          const record = note.records?.[i];
          if (!record) {
            throw new GraphQLError(`Record ${i} is null`, {
              extensions: {
                code: GraphQLErrorCode.ArrayElementNull,
              },
            });
          }
          return record;
        })
    );
  }
}

type RecordLoaderKey = Pick<NotesLoaderKey, 'projectFoo' | 'projectBar'>;

class RecordDataSource implements IRecordDataSource {
  private load: (key?: RecordLoaderKey) => Promise<Partial<Record>>;

  constructor(load: (key?: RecordLoaderKey) => Promise<Partial<Record>>) {
    this.load = load;
  }

  async getFoo(): Promise<string> {
    const foo = (await this.load({ projectFoo: true })).foo;
    if (!foo) {
      throw new GraphQLError('Failed to resolve record foo');
    }
    return foo;
  }
  async getBar(): Promise<number> {
    const bar = (await this.load({ projectBar: true })).bar;
    if (!bar) {
      throw new GraphQLError('Failed to resolve record bar');
    }
    return bar;
  }
}

it.skip('sandbox', async () => {
  const dbData: Note[] = [...new Array<undefined>(10)].map((_, i) => ({
    name: `note:${i}`,
    records: [...new Array<undefined>(10)].map((_, j) => ({
      foo: `record_${j}`,
      bar: 5,
    })),
  }));
  const db: Database = {
    findNoteMany(noteAfter, noteFirst, recordFirst, projectFoo, projectBar) {
      console.log('findNoteMany', {
        noteAfter,
        noteFirst,
        recordFirst,
        projectFoo,
        projectBar,
      });
      return Promise.resolve(
        dbData
          .slice(
            noteAfter ? noteAfter + 1 : 0,
            noteFirst + (noteAfter ? noteAfter + 1 : 0)
          )
          .map((note) => ({
            ...note,
            records: note.records.slice(0, recordFirst).map((record) => ({
              ...record,
              foo: projectFoo ? record.foo : undefined,
              bar: projectBar ? record.bar : undefined,
            })),
          }))
      );
    },
  };

  const query = `#graphql
    query TestNotes {
      a: notes(after: 5, first: 3) {
        name
        records(first: 2) {
          foo
        }
      }

      get {
        must
        maybe
      }
    }
  `;

  const context: Context = {
    datasources: {
      notes: new NotesDataSource(db),
    },
  };

  const response = await apolloServer.executeOperation(
    {
      query: query,
    },
    {
      contextValue: context,
    }
  );

  assert(response.body.kind === 'single');
  response.body.singleResult.errors = response.body.singleResult.errors?.filter(
    (error) =>
      !error.extensions || error.extensions.code !== GraphQLErrorCode.ArrayElementNull
  );
  console.log(
    util.inspect(
      JSON.parse(JSON.stringify(response.body.singleResult)),
      false,
      null,
      true
    )
  );
});
