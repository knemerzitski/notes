import { it, beforeEach, vi, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import {
  NoteTextField,
  UseUpdateNoteMutation,
  UseUpdateNoteMutationVariables,
} from '../../../__generated__/graphql';

import { MUTATION } from '../hooks/useUpdateNote';
import SubmittedRecordMutation from './SubmittedRecordMutation';
import {
  CollabEditor,
  CollabEditorEvents,
  SerializedCollabEditor,
  UnprocessedRecordType,
} from '~collab/client/collab-editor';
import useNoteTextFieldCollabEditor from '../hooks/__mocks__/useNoteTextFieldCollabEditor';
import nextTick from '~utils/nextTick';
import { Changeset } from '~collab/changeset/changeset';
import NoteTextFieldEditorsProvider from '../context/NoteTextFieldEditorsProvider';

vi.mock('../hooks/useNoteTextFieldCollabEditor');

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
  useNoteTextFieldCollabEditor.mockReturnValue(editor);

  render(
    <MockedProvider mocks={mocks}>
      <NoteTextFieldEditorsProvider
        textFields={[
          {
            key: NoteTextField.Content,
            value: editor,
          },
        ]}
      >
        <SubmittedRecordMutation fieldName={NoteTextField.Content} />
      </NoteTextFieldEditorsProvider>
    </MockedProvider>
  );
});

it('receives response in nextMessage', async () => {
  await nextTick();
  expect(nextMessageEventFn.mock.calls).toStrictEqual([
    [
      {
        type: UnprocessedRecordType.SubmittedAcknowleged,
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
