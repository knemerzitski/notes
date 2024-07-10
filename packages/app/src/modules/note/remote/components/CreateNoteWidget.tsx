import { useApolloClient } from '@apollo/client';
import { useState } from 'react';

import { useSnackbarError } from '../../../common/components/SnackbarAlertProvider';
import BaseCreateNoteWidget, {
  CreateNoteWidgetProps,
} from '../../base/components/CreateNoteWidget';
import NoteContentIdProvider from '../context/NoteContentIdProvider';
import NoteTextFieldEditorsProvider, {
  NoteCollabTextEditors,
} from '../context/NoteTextFieldEditorsProvider';
import { useCreatableNoteTextFieldEditors } from '../hooks/useCreatableNoteTextFieldEditors';
import useDeleteNote from '../hooks/useDeleteNote';
import useDiscardEmptyNote from '../hooks/useDiscardEmptyNote';
import { insertNoteToNotesConnection } from '../policies/Query/notesConnection';

import ManageNoteSharingButton from './ManageNoteSharingButton';

export default function CreateNoteWidget(props: CreateNoteWidgetProps) {
  const apolloClient = useApolloClient();

  const deleteNote = useDeleteNote();
  const showError = useSnackbarError();

  const { editors, createNote, reset } = useCreatableNoteTextFieldEditors();
  const [noteWithEditors, setNoteWithEditors] = useState<{
    note: NonNullable<Awaited<ReturnType<typeof createNote>>>;
    editors: NoteCollabTextEditors;
  } | null>();

  const discardEmptyNote = useDiscardEmptyNote();

  const handleDelete = noteWithEditors
    ? function handleDelete() {
        const id = noteWithEditors.note.contentId;
        if (!id) return;

        void deleteNote(id).then((deleted) => {
          if (!deleted) {
            showError('Failed to delete note');
          }
        });
      }
    : undefined;

  async function handleCreateNote() {
    const newNote = await createNote();
    const newEditors = editors;

    if (noteWithEditors) {
      insertNoteToNotesConnection(apolloClient.cache, noteWithEditors.note);
    }

    if (!newNote) {
      setNoteWithEditors(null);
    } else {
      setNoteWithEditors({
        note: newNote,
        editors: newEditors,
      });
    }
  }

  function handleWidgetCollapsed(deleted?: boolean) {
    reset();

    if (noteWithEditors) {
      const discarded = discardEmptyNote(noteWithEditors);

      if (!discarded && !deleted) {
        insertNoteToNotesConnection(apolloClient.cache, noteWithEditors.note);
      }

      setNoteWithEditors(null);
    }
  }

  return (
    <NoteTextFieldEditorsProvider editors={editors}>
      <BaseCreateNoteWidget
        onCreate={() => {
          void handleCreateNote();
        }}
        onCollapse={handleWidgetCollapsed}
        slots={{
          toolbar: (
            <NoteContentIdProvider noteContentId={noteWithEditors?.note.contentId}>
              <ManageNoteSharingButton />
            </NoteContentIdProvider>
          ),
        }}
        moreOptionsButtonProps={{
          onDelete: handleDelete,
        }}
        {...props}
      />
    </NoteTextFieldEditorsProvider>
  );
}
