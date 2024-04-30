/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { it, beforeEach, vi, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { InMemoryCache } from '@apollo/client';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import {
  CollabTextUnprocessedRecordType,
  CurrentUserExternalChangesNewRecordSubscription,
  CurrentUserExternalChangesNewRecordSubscriptionVariables,
} from '../../../__generated__/graphql';
import CurrentUserExternalChangesSubscription, {
  SUBSCRIPTION,
} from './CurrentUserExternalChangesSubscription';

import UnprocessedRecordsWatcher from '../../../collab/components/watch/UnprocessedRecordsWatcher';
import { gql } from '../../../__generated__';
import { createCache } from '../../../test/helpers/apollo-client';

let cache: InMemoryCache;

const mockResultData: CurrentUserExternalChangesNewRecordSubscription = {
  noteUpdated: {
    patch: {
      id: 'a',
      textFields: [
        {
          value: {
            id: '1',
            newRecord: {
              __typename: 'CollabTextRecord',
              id: 'c',
              change: {
                revision: 10,
                changeset: ['sub'],
              },
              beforeSelection: {
                start: 0,
                end: null,
              },
              afterSelection: {
                start: 1,
                end: null,
              },
            },
          },
        },
      ],
    },
  },
};

const mocks: Readonly<
  MockedResponse<
    CurrentUserExternalChangesNewRecordSubscription,
    CurrentUserExternalChangesNewRecordSubscriptionVariables
  >[]
> = [
  {
    request: {
      query: SUBSCRIPTION,
    },
    result: {
      data: mockResultData,
    },
  },
];

const handleNextUnprocessedRecordFn = vi.fn();

let collabTextId: string | undefined;

const nextTick = () => new Promise((res) => setTimeout(res, 0));

beforeEach(() => {
  cache = createCache();

  collabTextId = cache.identify({
    id: '1',
    __typename: 'CollabText',
  })!;

  cache.restore({
    [collabTextId]: {
      __typename: 'CollabText',
      localChanges: ['a'],
      unprocessedRecords: [],
    },
  });

  cache.writeFragment({
    id: collabTextId,
    fragment: gql(`
      fragment TmpTest on CollabText {
        localChanges
      }
    `),
    data: {
      localChanges: ['new text'],
    },
  });

  handleNextUnprocessedRecordFn.mockClear();

  render(
    <MockedProvider mocks={mocks} cache={cache}>
      <>
        <CurrentUserExternalChangesSubscription />
        <UnprocessedRecordsWatcher
          collabTextId="1"
          onNext={handleNextUnprocessedRecordFn}
        />
      </>
    </MockedProvider>
  );
});

it('writes received data to unprocessedRecords', async () => {
  await nextTick();

  const collabTextData = cache.readFragment({
    id: collabTextId,
    fragment: gql(`
      fragment TestCurrentUserExternalChangesSubscription on CollabText {
        unprocessedRecords {
          done
          type
          record {
            change {
              revision
              changeset
            }
            beforeSelection {
              start
              end
            }
            afterSelection {
              start
              end
            }
          }
        }
      }
    `),
  });

  await waitFor(() => {
    expect(collabTextData).toMatchObject({
      unprocessedRecords: [
        {
          type: CollabTextUnprocessedRecordType.ExternalChange,
          record: expect.any(Object),
          done: null,
        },
      ],
    });
  });
});

it('triggers UnprocessedRecordWatcher', async () => {
  await waitFor(() => {
    expect(handleNextUnprocessedRecordFn).toHaveBeenCalledTimes(2);
  });
});
