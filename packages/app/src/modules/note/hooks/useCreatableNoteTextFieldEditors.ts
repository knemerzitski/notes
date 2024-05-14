import { CollabEditor } from '~collab/client/collab-editor';
import { useCallback, useRef, useState } from 'react';
import useCreateNote from './useCreateNote';
import isDefined from '~utils/type-guards/isDefined';
import { useApolloClient } from '@apollo/client';
import { NoteTextField } from '../../../__generated__/graphql';
import { editorsWithVars } from '../../collab/editors-by-id';
import { addActiveNotes } from '../active-notes';
import { Changeset } from '~collab/changeset/changeset';
import { NoteCollabTextEditors } from '../context/NoteTextFieldEditorsProvider';

function newEmptyEditors(): NoteCollabTextEditors {
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
 * Initially returns local CollabEditors. createNote can be called
 * to submit note to server. Returns editors that be used for
 * further editing.
 */
export function useCreatableNoteTextFieldEditors() {
  const apolloClient = useApolloClient();
  const createNoteMutation = useCreateNote();
  const statusRef = useRef<'local' | 'creating' | 'created'>('local');
  const [editors, setEditors] = useState(newEmptyEditors());

  const createNote = useCallback(async () => {
    if (statusRef.current !== 'local') return;

    try {
      statusRef.current = 'creating';

      const newNote = await createNoteMutation({
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

          //Acknowledge submitted
          const collabText = textField.value;
          const changeset = Changeset.parseValue(collabText.headText.changeset);
          // TODO creteNote response a recod...
          editor.submittedChangesAcknowledged({
            revision: collabText.headText.revision,
            changeset,
            beforeSelection: {
              start: 0,
              end: 0,
            },
            afterSelection: {
              start: changeset.length,
              end: changeset.length,
            },
          });

          // Add editor to context so it won't be recreated in typePolicies after caching
          editorsWithVars.set(String(textField.value.id), editor);
        });

        addActiveNotes(apolloClient.cache, [newNote]);
      } else {
        statusRef.current = 'local';
      }

      return newNote;
    } catch (err) {
      console.error(err);
      statusRef.current = 'local';
    }
  }, [createNoteMutation, editors, apolloClient]);

  const reset = useCallback(() => {
    statusRef.current = 'local';
    setEditors(newEmptyEditors());
  }, []);

  return {
    editors,
    createNote,
    reset,
  };
}
