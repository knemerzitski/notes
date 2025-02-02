 
import { gql, Operation } from '@apollo/client';
import { describe, expect, it } from 'vitest';

import { findOperationUserIds } from './find-operation-user-id';

function findOperationUserIdByPath(
  operation: Pick<Operation, 'query' | 'variables'>,
  targetPath: readonly (string | number)[]
): string | undefined {
  return findOperationUserIds(operation, targetPath)[0];
}

describe('query inline argument', () => {
  const operation: Pick<Operation, 'query' | 'variables'> = {
    query: gql(`
      query {
        foo {
          user(userBy: { id: "inlineUser" }) {
            items {
              title
            }
          }
        }
      }
    `),
    variables: {},
  };

  it.each([[['foo', 'user', 'items', 'title'], 'inlineUser']])(
    '%s',
    (path, expectedUserId) => {
      expect(findOperationUserIdByPath(operation, path)).toStrictEqual(expectedUserId);
    }
  );
});

describe('mutation inline argument', () => {
  const operation: Pick<Operation, 'query' | 'variables'> = {
    query: gql(`
      mutation {
        parent {
          foo(input: {authUser: { id : "inlineUser2" } }) {
            bar
          }
        }
      }
    `),
    variables: {},
  };

  it.each([[['parent', 'foo', 'bar'], 'inlineUser2']])('%s', (path, expectedUserId) => {
    expect(findOperationUserIdByPath(operation, path)).toStrictEqual(expectedUserId);
  });
});

describe('simple query', () => {
  const operation: Pick<Operation, 'query' | 'variables'> = {
    query: gql(`
      query($varUserBy: UserByInput!) {
        foo {
          user(userBy: $varUserBy) {
            items {
              title
            }
          }
        }
      }
    `),
    variables: {
      varUserBy: {
        id: 'theuser',
      },
    },
  };

  it.each([
    [['foo', 'user', 'items'], 'theuser'],
    [['foo', 'user', 'items', 'title'], 'theuser'],
  ])('%s', (path, expectedUserId) => {
    expect(findOperationUserIdByPath(operation, path)).toStrictEqual(expectedUserId);
  });
});

describe('simple single mutation', () => {
  const operation: Pick<Operation, 'query' | 'variables'> = {
    query: gql(`
      mutation($input: FooInput!) {
        parent {
          foo(input: $input) {
            bar
          }
        }
      }
    `),
    variables: {
      input: {
        authUser: {
          id: 'user123',
        },
        other: 'hi',
      },
    },
  };

  it.each([
    [[], undefined],
    [['parent'], undefined],
    [['parent', 'foo'], 'user123'],
    [['parent', 'foo', 'bar'], 'user123'],
  ])('%s', (path, expectedUserId) => {
    expect(findOperationUserIdByPath(operation, path)).toStrictEqual(expectedUserId);
  });
});

describe('simple two mutations', () => {
  const operation: Pick<Operation, 'query' | 'variables'> = {
    query: gql(`
      mutation($input1: FooInput!, $input2: FooInput!) {
        parent {
          foo(input: $input1) {
            bar
          }
        }
        parent2(input: $input2) {
          baz
        }
      }
    `),
    variables: {
      input1: {
        authUser: {
          id: 'user1',
        },
      },
      input2: {
        authUser: {
          id: 'user2',
        },
      },
    },
  };

  it.each([
    [['parent', 'foo', 'bar'], 'user1'],
    [['parent2', 'baz'], 'user2'],
  ])('%s', (path, expectedUserId) => {
    expect(findOperationUserIdByPath(operation, path)).toStrictEqual(expectedUserId);
  });
});

describe('field name contains signedinuser and argument by', () => {
  const operation: Pick<Operation, 'query' | 'variables'> = {
    query: gql(`
      query RouteNotes_Query($other: String, $random: SignedInUserByInput!) {
        signedInUser(by: $random){
          name
        }
      }
    `),
    variables: {
      random: {
        id: 'theuser',
      },
    },
  };

  it.each([[['user', 'name'], 'theuser']])('%s', (path, expectedUserId) => {
    expect(findOperationUserIdByPath(operation, path)).toStrictEqual(expectedUserId);
  });
});
