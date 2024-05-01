/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { it, beforeEach, vi, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { InMemoryCache } from '@apollo/client';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import {
  CollabTextUnprocessedRecordType,
  NoteTextField,
  UseUpdateNoteMutation,
  UseUpdateNoteMutationVariables,
} from '../../../__generated__/graphql';

import UnprocessedRecordsWatcher from '../../../collab/components/watch/UnprocessedRecordsWatcher';
import { gql } from '../../../__generated__';
import { createCache } from '../../../test/helpers/apollo-client';
import { MUTATION } from '../../hooks/useUpdateNote';
import SubmittedRecordMutation from './SubmittedRecordMutation';

let cache: InMemoryCache;
let collabTextId: string;
let collabTextRef: string | undefined;

const noteContentId = 'noteContentId';
const noteField = NoteTextField.Content;

const mocks: Readonly<
  MockedResponse<UseUpdateNoteMutation, UseUpdateNoteMutationVariables>[]
> = [
  {
    request: {
      query: MUTATION,
    },
    variableMatcher: () => true,
    result: {
      data: {
        updateNote: {
          patch: {
            id: 'noteId',
            textFields: [
              {
                key: NoteTextField.Content,
                value: {
                  id: '1',
                  newRecord: {
                    id: 'recordId',
                    creatorUserId: 'userId',
                    change: {
                      changeset: ['a'],
                      revision: 11,
                    },
                    beforeSelection: {
                      start: 6,
                      end: null,
                    },
                    afterSelection: {
                      start: 6,
                      end: null,
                    },
                  },
                },
              },
            ],
          },
        },
      },
    },
  },
];

const handleNextUnprocessedRecordFn = vi.fn();

beforeEach(() => {
  cache = createCache();

  collabTextId = '1';
  collabTextRef = cache.identify({
    id: collabTextId,
    __typename: 'CollabText',
  })!;

  cache.restore({
    [collabTextRef]: {
      __typename: 'CollabText',
      localChanges: null,
      submittedRecord: {
        generatedId: 's',
        change: {
          changeset: ['a'],
          revision: 10,
        },
        afterSelection: {
          start: 6,
          end: null,
        },
        beforeSelection: {
          start: 6,
          end: null,
        },
      },
      unprocessedRecords: [],
    },
  });

  handleNextUnprocessedRecordFn.mockClear();

  render(
    <MockedProvider mocks={mocks} cache={cache}>
      <>
        <SubmittedRecordMutation
          collabTextId={collabTextId}
          noteContentId={noteContentId}
          noteField={noteField}
        />
        <UnprocessedRecordsWatcher
          collabTextId="1"
          onNext={handleNextUnprocessedRecordFn}
        />
      </>
    </MockedProvider>
  );
});

it('writes acknowledgement to unprocessedRecords', async () => {
  await waitFor(() => {
    const collabTextData = cache.readFragment({
      id: collabTextRef,
      fragment: gql(`
        fragment TestSubmittedRecordMutation on CollabText {
          unprocessedRecords {
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

    expect(collabTextData).toMatchObject({
      unprocessedRecords: [
        {
          type: CollabTextUnprocessedRecordType.SubmittedAcknowleged,
          record: expect.any(Object),
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
