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

import { useInsertNoteToNotesConnection } from '../hooks/useInsertNoteToNotesConnection';

import NoteToolbar from './NoteToolbar';

export default function CreateNoteWidget(props: Omit<CreateNoteWidgetProps, 'expanded'>) {
  const insertNoteToNotesConnection = useInsertNoteToNotesConnection();
  const deleteNote = useDeleteNote();
  const showError = useSnackbarError();

  const [isWidgetExpanded, setIsWidgetExpanded] = useState(false);

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
      insertNoteToNotesConnection(noteWithEditors.note);
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

  function handleWidgetExpand() {
    setIsWidgetExpanded(true);
  }

  function handleWidgetCollapse(deleted?: boolean) {
    setIsWidgetExpanded(false);

    reset();

    if (noteWithEditors) {
      const discarded = discardEmptyNote(noteWithEditors);

      if (!discarded && !deleted) {
        insertNoteToNotesConnection(noteWithEditors.note);
      }

      setNoteWithEditors(null);
    }
  }

  return (
    <NoteTextFieldEditorsProvider editors={editors}>
      <BaseCreateNoteWidget
        expanded={isWidgetExpanded}
        onCreate={() => {
          void handleCreateNote();
        }}
        onExpand={handleWidgetExpand}
        onCollapse={handleWidgetCollapse}
        slots={{
          toolbar: (
            <NoteContentIdProvider noteContentId={noteWithEditors?.note.contentId}>
              <NoteToolbar
                specific={{
                  archiveOrUnarchive: {
                    iconButtonProps: {
                      onClick: () => {
                        handleWidgetCollapse();
                      },
                    },
                  },
                }}
              />
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
