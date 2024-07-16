import { useApolloClient } from '@apollo/client';
import { useCallback, useRef, useState } from 'react';

import { CollabEditor } from '~collab/client/collab-editor';
import isDefined from '~utils/type-guards/isDefined';

import { NoteTextField } from '../../../../__generated__/graphql';
import { collabTextRecordToEditorRevisionRecord } from '../../../collab/editor-graphql-mapping';
import { editorsInCache } from '../../../editor/editors';
import { addActiveNotesByContentId } from '../active-notes';
import { NoteCollabTextEditors } from '../context/NoteTextFieldEditorsProvider';

import useCreateNote from './useCreateNote';

export function newEmptyEditors(): NoteCollabTextEditors {
  return [
    {
      key: NoteTextField.TITLE,
      value: new CollabEditor(),
    },
    {
      key: NoteTextField.CONTENT,
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

  const [editors, setEditors] = useState(newEmptyEditors());

  const linkedEditorsRef = useRef(new Set<CollabEditor>());
  const isFetchingRef = useRef(false);

  const createNoteWithLinkedEditors = useCallback(async () => {
    if (editors.some((e) => linkedEditorsRef.current.has(e.value))) {
      return false;
    }

    if (isFetchingRef.current) {
      return false;
    }

    try {
      isFetchingRef.current = true;

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

      if (!newNote) return false;

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
        linkedEditorsRef.current.add(editor);
      });

      addActiveNotesByContentId(apolloClient.cache, [newNote]);

      return {
        note: newNote,
        editors: editors,
      };
    } finally {
      isFetchingRef.current = false;
    }
  }, [apolloClient, fetchCreateNote, editors]);

  const resetEditors = useCallback(() => {
    setEditors((prevEditors) => {
      prevEditors.forEach((e) => {
        linkedEditorsRef.current.delete(e.value);
      });

      return newEmptyEditors();
    });
  }, []);

  return {
    editors,
    createNoteWithLinkedEditors,
    resetEditors,
  };
}
