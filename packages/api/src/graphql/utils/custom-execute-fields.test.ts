/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApolloServer } from '@apollo/server';
import { GraphQLResolveInfo } from 'graphql';
import { beforeAll, beforeEach, expect, it, vi } from 'vitest';


import { MaybePromise } from '~utils/types';

import { expectGraphQLResponseData } from '../../__test__/helpers/graphql/response';

import { customExecuteFields } from './custom-execute-fields';

const typeDefs = `#graphql 
  type Query {
    notesConnection: NotesConnection!
  }

  type NotesConnection {
    notes: [Note!]!
    sub: String!
  }

  type Note {
    text: String!
  }
`;

const database = {
  notes: [
    {
      text: 'hello',
    },
    {
      text: 'hello 2',
    },
  ],
};

function fetchNotes() {
  return Promise.resolve(database.notes);
}

function fetchNotesCount() {
  return Promise.resolve(database.notes.length);
}

interface Query {
  query(query: any): MaybePromise<any>;
}

class NoteQuery {
  private parent: Query;

  constructor(parent: Query) {
    this.parent = parent;
  }

  async text() {
    return (await this.parent.query({ text: 1 }))?.text;
  }
}

const spyCustomExecuteQuery = vi.fn();
const spySecondField = vi.fn();

const resolvers = {
  Query: {
    notesConnection(
      _parent: unknown,
      _args: unknown,
      ctx: unknown,
      info: GraphQLResolveInfo
    ) {
      return {
        async notes() {
          let notesCount = 0;
          await customExecuteFields(
            {
              async notes() {
                notesCount = await fetchNotesCount();
                return [
                  new NoteQuery({
                    query: spyCustomExecuteQuery,
                  }),
                ];
              },
              sub: spySecondField,
            },
            ctx,
            info
          );

          return [...new Array<undefined>(notesCount)].map(
            (_, index) =>
              new NoteQuery({
                async query() {
                  const notes = await fetchNotes();
                  return notes[index];
                },
              })
          );
        },
        sub: () => {
          return 'real sub';
        },
      };
    },
  },
  Note: {
    text(parent: NoteQuery) {
      return parent.text();
    },
  },
};

let apolloServer: ApolloServer;

beforeAll(() => {
  apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });
});

beforeEach(() => {
  spyCustomExecuteQuery.mockReset();
});

it('calls child field using customExecuteFields', async () => {
  const response = await apolloServer.executeOperation({
    query: `#graphql 
      query {
        notesConnection {
          notes {
            text
          }
          sub
        }
      }
    `,
  });

  const data = expectGraphQLResponseData(response);

  expect(spyCustomExecuteQuery.mock.calls).toStrictEqual([[{ text: 1 }]]);
  expect(spySecondField).toHaveBeenCalledOnce();

  expect(data).toEqual({
    notesConnection: {
      notes: [
        {
          text: 'hello',
        },
        {
          text: 'hello 2',
        },
      ],
      sub: 'real sub',
    },
  });
});
