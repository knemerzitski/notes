import { ApolloServer } from '@apollo/server';
import { assert, describe, expect, it } from 'vitest';

import {
  Changeset,
  InsertStrip,
  RetainStrip,
} from '../../../../../../collab/src/changeset';

import { Changeset as ChangesetResolver } from './Changeset';

describe('Changeset', () => {
  const appendHelloResolver = (_parent: unknown, { input }: { input: Changeset }) => {
    return input.compose(
      Changeset.from(
        RetainStrip.create(0, input.strips.length - 1),
        InsertStrip.create('hello')
      )
    );
  };

  const apolloServer = new ApolloServer({
    typeDefs: `#graphql
      scalar Changeset
  
      type Query {
        appendHello(input: Changeset): Changeset
      }
    `,
    resolvers: {
      Changeset: ChangesetResolver,
      Query: {
        appendHello: appendHelloResolver,
      },
    },
  });

  it('parses and serializes value', async () => {
    const query = `#graphql
      query AppendHello($input: Changeset!) {
        appendHello(input: $input)
      }
    `;

    const response = await apolloServer.executeOperation({
      query: query,
      variables: {
        input: Changeset.new([new InsertStrip('echo ')]),
      },
    });

    assert(response.body.kind === 'single');
    expect(response.body.singleResult.data).toEqual({
      appendHello: ['echo hello'],
    });
  });

  it('parses literal', async () => {
    const query = `#graphql
      query TestChangeset {
        appendHello(input: ["echo "])
      }
    `;
    const response = await apolloServer.executeOperation({
      query: query,
    });

    assert(response.body.kind === 'single');
    expect(response.body.singleResult.data).toEqual({
      appendHello: ['echo hello'],
    });
  });
});
