import { it, expect, beforeEach } from 'vitest';
import { InMemoryCache } from '@apollo/client';
import { createCache } from '../test/helpers/apollo-client';
import { gql } from '../__generated__/gql';

let cache: InMemoryCache;

let collabTextId: string | undefined;

beforeEach(() => {
  cache = createCache();

  collabTextId = cache.identify({
    id: '1',
    __typename: 'CollabText',
  });

  cache.restore({
    'CollabText:1': {
      __typename: 'CollabText',
      submittedRecord: {
        generatedId: 'a',
        change: null,
        beforeSelection: null,
        afterSelection: null,
      },
    },
  });
});

it('throws error if overwriting existing submittedRecord', () => {
  expect(() => {
    cache.writeFragment({
      id: collabTextId,
      fragment: gql(`
        fragment TestPoliciesSubmittedRecord on CollabText {
          submittedRecord {
            generatedId
          }
        }
      `),
      data: {
        submittedRecord: {
          generatedId: 'hi',
        },
      },
    });
  }).toThrowError('Cannot overwrite existng submittedRecord');
});
