import { MockedResponse } from '@apollo/client/testing';
import { render } from '@testing-library/react';
import { it, beforeEach, vi, expect } from 'vitest';

import { Changeset } from '~collab/changeset/changeset';
import {
  CollabEditor,
  CollabEditorEvents,
  SerializedCollabEditor,
  UnprocessedRecordType,
} from '~collab/client/collab-editor';
import nextTick from '~utils/nextTick';

import {
  NoteTextField,
  UseUpdateNoteMutation,
  UseUpdateNoteMutationVariables,
} from '../../../../__generated__/graphql';
import { CustomMockedProvider } from '../../../../test/helpers/CustomMockedProvider';
import NoteContentIdProvider from '../context/NoteContentIdProvider';
import NoteCollabTextsProvider from '../context/NoteTextFieldEditorsProvider';
import { MUTATION } from '../hooks/useUpdateNote';

import SubmittedRecordMutation from './SubmittedRecordMutation';

let editor: CollabEditor;
const nextMessageEventFn = vi.fn<[CollabEditorEvents['nextMessage']]>();

const useUpdateNoteMock: Readonly<
  MockedResponse<UseUpdateNoteMutation, UseUpdateNoteMutationVariables>
> = {
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
              key: NoteTextField.CONTENT,
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
};
const mocks = [useUpdateNoteMock];

beforeEach(() => {
  nextMessageEventFn.mockClear();

  editor = new CollabEditor(
    CollabEditor.parseValue({
      client: {},
      recordsBuffer: {
        version: 10,
        messages: [],
      },
      serverRecords: {
        tailText: {
          changeset: [],
          revision: -1,
        },
        records: [],
      },
      history: {
        entries: [],
        lastExecutedIndex: {
          server: -1,
          submitted: -1,
          local: -1,
        },
      },
      submittedRecord: {
        userGeneratedId: 's',
        changeset: ['a'],
        revision: 10,
        afterSelection: {
          start: 6,
          end: 6,
        },
        beforeSelection: {
          start: 6,
          end: 6,
        },
      },
    } as SerializedCollabEditor)
  );
  editor.eventBus.on('nextMessage', nextMessageEventFn);

  render(
    <CustomMockedProvider mocks={mocks}>
      <NoteContentIdProvider noteContentId="random">
        <NoteCollabTextsProvider
          editors={[
            {
              key: NoteTextField.CONTENT,
              value: editor,
            },
          ]}
        >
          <SubmittedRecordMutation fieldName={NoteTextField.CONTENT} />
        </NoteCollabTextsProvider>
      </NoteContentIdProvider>
    </CustomMockedProvider>
  );
});

it('receives response in nextMessage', async () => {
  await nextTick();
  expect(nextMessageEventFn.mock.calls).toStrictEqual([
    [
      {
        type: UnprocessedRecordType.SUBMITTED_ACKNOWLEDGED,
        record: {
          creatorUserId: 'userId',
          changeset: Changeset.parseValue(['a']),
          revision: 11,
          beforeSelection: {
            start: 6,
            end: 6,
          },
          afterSelection: {
            start: 6,
            end: 6,
          },
        },
      },
    ],
  ]);
});
