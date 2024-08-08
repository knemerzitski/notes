import { useApolloClient } from '@apollo/client';
import { ReactNode, useRef, useEffect, startTransition } from 'react';

import { useProxyNavigate } from '../../../router/context/proxy-routes-provider';
import { useCreatableNoteTextFieldEditors } from '../hooks/use-creatable-note-text-field-editors';

import { useInsertNoteToNotesConnection } from '../hooks/use-insert-note-to-notes-connection';

import { NoteTextFieldEditorsProvider as NoteCollabTextsProvider } from './note-text-field-editors-provider';

interface NewNoteEditingContextProps {
  children: ReactNode;
}

export function NewNoteEditingContext({ children }: NewNoteEditingContextProps) {
  const apolloClient = useApolloClient();
  const insertNoteToNotesConnection = useInsertNoteToNotesConnection();
  const navigate = useProxyNavigate();
  const { editors, createNoteWithLinkedEditors: createNote } =
    useCreatableNoteTextFieldEditors();
  const isCreatingNoteRef = useRef(false);

  useEffect(() => {
    if (isCreatingNoteRef.current) return;
    void (async () => {
      try {
        isCreatingNoteRef.current = true;
        const createData = await createNote();
        if (!createData) return;
        const { note: newNote } = createData;
        insertNoteToNotesConnection(newNote);
        startTransition(() => {
          navigate(`/note/${newNote.contentId}`, {
            replace: true,
            state: {
              autoFocus: true,
            },
          });
        });
      } finally {
        isCreatingNoteRef.current = false;
      }
    })();
  }, [apolloClient, createNote, navigate, insertNoteToNotesConnection]);

  return <NoteCollabTextsProvider editors={editors}>{children}</NoteCollabTextsProvider>;
}
