import { GraphQLResponse } from '@apollo/server';
import { assert, expect } from 'vitest';

import { expectp } from '../expectp';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

export function expectGraphQLResponseData<TData = Record<string, unknown>>(
  response: GraphQLResponse<TData>
) {
  assert(response.body.kind === 'single');

  const { data, errors } = response.body.singleResult;
  expectp(errors).toBeUndefined();

  assert(data != null);

  return data;
}

export function expectGraphQLResponseError<TData = Record<string, unknown>>(
  response: GraphQLResponse<TData>,
  expected: string | RegExp | GraphQLErrorCode
) {
  assert(response.body.kind === 'single');
  const { errors } = response.body.singleResult;

  assert(errors != null, 'Expected to have errors array');

  expect(errors).toHaveLength(1);

  if (typeof expected === 'string' && Object.keys(GraphQLErrorCode).includes(expected)) {
    expect(errors[0]?.extensions?.code, JSON.stringify(errors, null, 2)).toEqual(
      expected
    );
  } else {
    expect(errors[0]?.message, JSON.stringify(errors, null, 2)).toEqual(
      expect.stringMatching(expected)
    );
  }
}
