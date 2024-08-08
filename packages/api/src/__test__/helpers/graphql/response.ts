import { GraphQLResponse } from '@apollo/server';
import { assert, expect } from 'vitest';

import { expectp } from '../expectp';

export function expectGraphQLResponseData<TData = Record<string, unknown>>(
  response: GraphQLResponse<TData>
) {
  assert(response.body.kind === 'single');

  const { data, errors } = response.body.singleResult;
  expectp(errors).toBeUndefined();

  assert(data != null);

  return data;
}

export function expectGraphQLResponseErrorMessage<TData = Record<string, unknown>>(
  response: GraphQLResponse<TData>,
  expectedMessage: string | RegExp
) {
  assert(response.body.kind === 'single');
  const { errors } = response.body.singleResult;

  assert(errors != null, 'Expected to have errors array');

  expect(errors).toHaveLength(1);
  expect(errors[0]?.message, JSON.stringify(errors, null, 2)).toEqual(
    expect.stringMatching(expectedMessage)
  );
}
