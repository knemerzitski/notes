import { useApolloClient } from '@apollo/client';
import { useCallback, useRef, useState } from 'react';

import { CollabEditor } from '~collab/client/collab-editor';
import isDefined from '~utils/type-guards/isDefined';

import { NoteTextField } from '../../../__generated__/graphql';
import { collabTextRecordToEditorRevisionRecord } from '../../collab/editor-graphql-mapping';
import { editorsInCache } from '../../editor/editors';
import { addActiveNotesByContentId } from '../active-notes';
import { NoteCollabTextEditors } from '../context/NoteTextFieldEditorsProvider';

import useCreateNote from './useCreateNote';

export function newEmptyEditors(): NoteCollabTextEditors {
  return [
    {
      key: NoteTextField.Title,
      value: new CollabEditor(),
    },
    {
      key: NoteTextField.Content,
      value: new CollabEditor(),
    },
  ];
}

/**
 * Returns editors that will be linked to the created note when createNote is called.
 */
export function useCreatableNoteTextFieldEditors() {
  const apolloClient = useApolloClient();
  const fetchCreateNote = useCreateNote();

  const statusRef = useRef<'local' | 'creating' | 'created'>('local');
  const [editors, setEditors] = useState(newEmptyEditors());

  const createNoteLinkEditors = useCallback(async () => {
    if (statusRef.current !== 'local') return;

    try {
      statusRef.current = 'creating';

      const newNote = await fetchCreateNote({
        textFields: editors
          .map(({ key, value: editor }) => {
            const submittedRecord = editor.submitChanges();
            if (!submittedRecord) return;
            return {
              key,
              value: {
                initialText: submittedRecord.changeset.joinInsertions(),
              },
            };
          })
          .filter(isDefined),
      });

      if (newNote) {
        statusRef.current = 'created';

        newNote.textFields.forEach((textField) => {
          const editor = editors.find(({ key }) => key === textField.key)?.value;
          if (!editor) return;

          const firstRecord = textField.value.recordsConnection.records[0];
          if (!firstRecord) {
            throw new Error('Expected first record to be present');
          }

          //Acknowledge submitted
          editor.submittedChangesAcknowledged(
            collabTextRecordToEditorRevisionRecord(firstRecord)
          );

          editorsInCache.set(
            {
              __typename: 'CollabText',
              id: String(textField.value.id),
            },
            editor
          );
        });

        addActiveNotesByContentId(apolloClient.cache, [newNote]);
      } else {
        statusRef.current = 'local';
      }

      return newNote;
    } catch (err) {
      console.error(err);
      statusRef.current = 'local';
    }
  }, [fetchCreateNote, editors, apolloClient]);

  const reset = useCallback(() => {
    statusRef.current = 'local';
    setEditors(newEmptyEditors());
  }, []);

  return {
    editors,
    createNote: createNoteLinkEditors,
    reset,
  };
}
