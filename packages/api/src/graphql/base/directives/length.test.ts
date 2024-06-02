import { ApolloServer } from '@apollo/server';
import { assert, describe, expect, it } from 'vitest';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { lengthTransform } from './length';

describe('Changeset', () => {
  let schema = makeExecutableSchema({
    typeDefs: `#graphql
      directive @length(max: Int) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION
      
      input EchoInput {
        value: String! @length(max: 5)
      }

      type Query {
        echo(input: EchoInput!): String! 
      }
    `,
    resolvers: {
      Query: {
        echo: (_parent, args: { input: { value: string } }) => {
          return args.input.value;
        },
      },
    },
  });

  schema = lengthTransform(schema);

  const apolloServer = new ApolloServer({
    schema,
  });

  const query = `#graphql
  query TestLength($input: EchoInput!) {
    echo(input: $input)
  }
`;

  it('allows below max length', async () => {
    const response = await apolloServer.executeOperation({
      query: query,
      variables: {
        input: {
          value: 'abcd',
        },
      },
    });

    assert(response.body.kind === 'single');
    expect(response.body.singleResult.data).toEqual({
      echo: 'abcd',
    });
  });

  it('allows at max length', async () => {
    const response = await apolloServer.executeOperation({
      query: query,
      variables: {
        input: {
          value: 'abcde',
        },
      },
    });

    assert(response.body.kind === 'single');
    expect(response.body.singleResult.data).toEqual({
      echo: 'abcde',
    });
  });

  it('throws error over max length', async () => {
    const response = await apolloServer.executeOperation({
      query: query,
      variables: {
        input: {
          value: 'abdcef',
        },
      },
    });

    assert(response.body.kind === 'single');
    expect(response.body.singleResult.errors?.[0]?.message).toContain(
      'Expected to have at most length 5'
    );
  });
});
