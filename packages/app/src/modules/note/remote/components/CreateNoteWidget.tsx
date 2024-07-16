import { useRef, useState } from 'react';

import CircularProgressOverlay from '../../../common/components/CircularProgressOverlay';
import BaseCreateNoteWidget, {
  CreateNoteWidgetProps,
} from '../../base/components/CreateNoteWidget';
import NoteContentIdProvider from '../context/NoteContentIdProvider';
import NoteTextFieldEditorsProvider from '../context/NoteTextFieldEditorsProvider';
import { useCreatableNoteTextFieldEditors } from '../hooks/useCreatableNoteTextFieldEditors';
import useDeleteNote from '../hooks/useDeleteNote';
import useDiscardEmptyNote from '../hooks/useDiscardEmptyNote';

import { useInsertNoteToNotesConnection } from '../hooks/useInsertNoteToNotesConnection';

import NoteToolbar from './NoteToolbar';

export default function CreateNoteWidget(props: Omit<CreateNoteWidgetProps, 'expanded'>) {
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
