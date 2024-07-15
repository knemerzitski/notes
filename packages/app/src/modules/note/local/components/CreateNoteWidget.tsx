import { useApolloClient } from '@apollo/client';
import { useState, useRef } from 'react';

import { CollabEditor } from '~collab/client/collab-editor';

import { editorsInCache } from '../../../editor/editors';
import {
  CreateNoteWidgetProps,
  ControlledCreateNoteWidget,
} from '../../base/components/CreateNoteWidget';
import NoteTextFieldEditorsProvider from '../../remote/context/NoteTextFieldEditorsProvider';
import { newEmptyEditors } from '../../remote/hooks/useCreatableNoteTextFieldEditors';
import useCreateNote from '../hooks/useCreateNote';
import useDeleteNote from '../hooks/useDeleteNote';
import { insertLocalNoteToNotesConnection } from '../policies/Query/localNotesConnection';

export default function CreateNoteWidget(props: CreateNoteWidgetProps) {
  const apolloClient = useApolloClient();

  const [newNoteEditors, setNewNoteEditors] = useState(newEmptyEditors());
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();

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

  function handleWidgetCollapsed(deleted?: boolean) {
    setNewNoteEditors(newEmptyEditors());
    if (createdNoteRef.current && !deleted) {
      insertLocalNoteToNotesConnection(apolloClient.cache, createdNoteRef.current);
    }
    createdNoteRef.current = null;
    props.onCollapse?.();
  }

  function handleDelete() {
    const id = createdNoteRef.current?.id;
    if (!id) return;
    deleteNote(String(id));
  }

  return (
    <NoteTextFieldEditorsProvider editors={newNoteEditors}>
      <ControlledCreateNoteWidget
        onCreate={handleCreateNote}
        moreOptionsButtonProps={{
          onDelete: handleDelete,
        }}
        initialContentInputProps={{
          inputProps: {
            placeholder: 'Take a local note...',
          },
        }}
        {...props}
        onCollapse={handleWidgetCollapsed}
      />
    </NoteTextFieldEditorsProvider>
  );
}
