import { useApolloClient } from '@apollo/client';
import { useState, useRef } from 'react';

import { CollabEditor } from '~collab/client/collab-editor';

import { editorsInCache } from '../../../editor/editors';
import BaseCreateNoteWidget, {
  CreateNoteWidgetProps,
} from '../../base/components/CreateNoteWidget';
import NoteTextFieldEditorsProvider from '../../remote/context/NoteTextFieldEditorsProvider';
import { newEmptyEditors } from '../../remote/hooks/useCreatableNoteTextFieldEditors';
import useCreateLocalNote from '../hooks/useCreateLocalNote';
import useDeleteLocalNote from '../hooks/useDeleteLocalNote';
import { insertLocalNoteToNotesConnection } from '../policies/Query/localNotesConnection';

export default function CreateNoteWidget(props: CreateNoteWidgetProps) {
  const apolloClient = useApolloClient();

  const [newNoteEditors, setNewNoteEditors] = useState(newEmptyEditors());
  const createNote = useCreateLocalNote();
  const deleteNote = useDeleteLocalNote();

  const createdNoteRef = useRef<NonNullable<ReturnType<typeof createNote>> | null>();

  function handleCreateNote() {
    const newNote = createNote();

    // Add editors to cache
    newNote.textFields.forEach(({ key, value }) => {
      const editor = newNoteEditors.find((entry) => entry.key === key)?.value;
      editorsInCache.set(
        {
          __typename: value.__typename,
          id: String(value.id),
        },
        editor ?? new CollabEditor()
      );
    });

    if (createdNoteRef.current) {
      insertLocalNoteToNotesConnection(apolloClient.cache, createdNoteRef.current);
    }
    createdNoteRef.current = newNote;
  }

  function handleWidgetCollapsed() {
    setNewNoteEditors(newEmptyEditors());
    if (createdNoteRef.current) {
      insertLocalNoteToNotesConnection(apolloClient.cache, createdNoteRef.current);
    }
    createdNoteRef.current = null;
  }

  function handleDelete() {
    const id = createdNoteRef.current?.id;
    if (!id) return;
    deleteNote(String(id));
  }

  return (
    <NoteTextFieldEditorsProvider editors={newNoteEditors}>
      <BaseCreateNoteWidget
        onCreate={handleCreateNote}
        onCollapse={handleWidgetCollapsed}
        moreOptionsButtonProps={{
          onDelete: handleDelete,
        }}
        initialContentInputProps={{
          inputProps: {
            placeholder: 'Take a local note...',
          },
        }}
        {...props}
      />
    </NoteTextFieldEditorsProvider>
  );
}
