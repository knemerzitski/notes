import { ApolloServer } from '@apollo/server';
import { assert, describe, expect, it } from 'vitest';

import { Changeset } from '../../../../../../collab/src';

import { Changeset as ChangesetResolver } from './Changeset';

describe('Changeset', () => {
  const appendHelloResolver = (_parent: unknown, { input }: { input: Changeset }) => {
    return Changeset.compose(
      input,
      Changeset.parse(`${input.outputLength}:0-${input.outputLength - 1},"hello"`)
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
        input: Changeset.parse('0:"echo "'),
      },
    });

    assert(response.body.kind === 'single');
    expect(response.body.singleResult.data).toEqual({
      appendHello: Changeset.parse('0:"echo hello"').serialize(),
    });
  });

  it('parses literal', async () => {
    const query = `#graphql
      query TestChangeset {
        appendHello(input: "0:\\"echo \\"")
      }
    `;
    const response = await apolloServer.executeOperation({
      query: query,
    });

    assert(response.body.kind === 'single');
    expect(response.body.singleResult.data).toEqual({
      appendHello: Changeset.parse('0:"echo hello"').serialize(),
    });
  });
});
