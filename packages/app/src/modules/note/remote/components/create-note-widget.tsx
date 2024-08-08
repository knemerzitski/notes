import { useRef, useState } from 'react';

import { CircularProgressOverlay } from '../../../common/components/circular-progress-overlay';
import {
  CreateNoteWidgetProps, CreateNoteWidget as BaseCreateNoteWidget
} from '../../base/components/create-note-widget';
import { NoteContentIdProvider } from '../context/note-content-id-provider';
import { NoteTextFieldEditorsProvider } from '../context/note-text-field-editors-provider';
import { useCreatableNoteTextFieldEditors } from '../hooks/use-creatable-note-text-field-editors';
import { useDeleteNote } from '../hooks/use-delete-note';
import { useDiscardEmptyNote } from '../hooks/use-discard-empty-note';

import { useInsertNoteToNotesConnection } from '../hooks/use-insert-note-to-notes-connection';

import { NoteToolbar } from './note-toolbar';

export function CreateNoteWidget(props: Omit<CreateNoteWidgetProps, 'expanded'>) {
  const insertNoteToNotesConnection = useInsertNoteToNotesConnection();
  const deleteNote = useDeleteNote();

  const [isLoading, setIsLoading] = useState(false);

  const [isWidgetExpanded, setIsWidgetExpanded] = useState(false);

  const { editors, createNoteWithLinkedEditors, resetEditors } =
    useCreatableNoteTextFieldEditors();
  const createNoteWithLinkedEditorsPromiseRef = useRef<ReturnType<
    typeof createNoteWithLinkedEditors
  > | null>(null);
  const [noteContentId, setNoteContentId] = useState<string | null>();

  const discardEmptyNote = useDiscardEmptyNote();

  async function handleCreateNote() {
    if (createNoteWithLinkedEditorsPromiseRef.current) return;
    const createPromise = createNoteWithLinkedEditors();
    createNoteWithLinkedEditorsPromiseRef.current = createPromise;

    const data = await createPromise;
    if (!data) {
      return;
    }

    const { note } = data;

    setNoteContentId(note.contentId);
  }

  function handleWidgetExpand() {
    setIsWidgetExpanded(true);
  }

  async function handleWidgetCollapse(reason: 'deleted' | 'clickaway' | 'archived') {
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (!createNoteWithLinkedEditorsPromiseRef.current) return;

      const createPromise = createNoteWithLinkedEditorsPromiseRef.current;
      createNoteWithLinkedEditorsPromiseRef.current = null;

      const noteWithEditors = await createPromise;
      if (!noteWithEditors) return;

      if (reason === 'deleted') {
        const { note } = noteWithEditors;

        void deleteNote(note.contentId);
      } else {
        const discarded = discardEmptyNote(noteWithEditors);

        if (!discarded && reason === 'clickaway') {
          insertNoteToNotesConnection(noteWithEditors.note);
        }
      }
    } finally {
      setIsLoading(false);
      setIsWidgetExpanded(false);
      setNoteContentId(null);
      resetEditors();
    }
  }

  return (
    <CircularProgressOverlay enabled={isLoading}>
      <NoteTextFieldEditorsProvider editors={editors}>
        <BaseCreateNoteWidget
          expanded={isWidgetExpanded}
          onCreate={() => {
            void handleCreateNote();
          }}
          onExpand={handleWidgetExpand}
          onCollapse={(deleted) => {
            void handleWidgetCollapse(deleted ? 'deleted' : 'clickaway');
          }}
          slots={{
            toolbar: (
              <NoteContentIdProvider noteContentId={noteContentId ?? undefined}>
                <NoteToolbar
                  specific={{
                    archiveOrUnarchive: {
                      iconButtonProps: {
                        onClick: () => {
                          void handleWidgetCollapse('archived');
                        },
                      },
                    },
                  }}
                />
              </NoteContentIdProvider>
            ),
          }}
          {...props}
        />
      </NoteTextFieldEditorsProvider>
    </CircularProgressOverlay>
  );
}
