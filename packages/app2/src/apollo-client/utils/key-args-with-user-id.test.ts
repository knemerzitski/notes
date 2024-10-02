import { expect, it } from 'vitest';
import { keyArgsWithUserId } from './key-args-with-user-id';

it('no args, no userId => undefined', () => {
  const fn = keyArgsWithUserId({
    appContext: {
      userId: null,
    },
    variablesUserIdKey: 'userId',
  });

  expect(
    fn(null, {
      field: null,
      fieldName: 'fieldName',
      typename: 'typename',
    })
  ).toBeUndefined();
});

it('args, no userId => no userId in keyArgs', () => {
  const fn = keyArgsWithUserId(
    {
      appContext: {
        userId: null,
      },
      variablesUserIdKey: 'userId',
    },
    ['foo']
  );

  expect(
    fn(
      { foo: 'bar' },
      {
        field: null,
        fieldName: 'fieldName',
        typename: 'typename',
      }
    )
  ).toStrictEqual('fieldName:{"foo":"bar"}');
});

it('args, userId in appContext => userId added to suffix', () => {
  const fn = keyArgsWithUserId(
    {
      appContext: {
        userId: 'a',
      },
      variablesUserIdKey: 'userId',
    },
    ['foo']
  );

  expect(
    fn(
      { foo: 'bar' },
      {
        field: null,
        fieldName: 'fieldName',
        typename: 'typename',
      }
    )
  ).toStrictEqual('fieldName:{"foo":"bar"}-{"userId":"a"}');
});

it('userId in variables has priority over appContext', () => {
  const fn = keyArgsWithUserId({
    appContext: {
      userId: 'a',
    },
    variablesUserIdKey: 'userId',
  });

  expect(
    fn(null, {
      field: null,
      fieldName: 'fieldName',
      typename: 'typename',
      variables: {
        userId: 'b',
      },
    })
  ).toStrictEqual('{"userId":"b"}');
});
