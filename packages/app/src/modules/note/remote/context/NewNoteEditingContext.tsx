import { useApolloClient } from '@apollo/client';
import { ReactNode, useRef, useEffect, startTransition } from 'react';

import { useProxyNavigate } from '../../../router/context/ProxyRoutesProvider';
import { useCreatableNoteTextFieldEditors } from '../hooks/useCreatableNoteTextFieldEditors';

import { useInsertNoteToNotesConnection } from '../hooks/useInsertNoteToNotesConnection';

import NoteCollabTextsProvider from './NoteTextFieldEditorsProvider';

interface NewNoteEditingContextProps {
  children: ReactNode;
}

export default function NewNoteEditingContext({ children }: NewNoteEditingContextProps) {
  const apolloClient = useApolloClient();
  const insertNoteToNotesConnection = useInsertNoteToNotesConnection();
  const navigate = useProxyNavigate();
  const { editors, createNote } = useCreatableNoteTextFieldEditors();
  const isCreatingNoteRef = useRef(false);

  useEffect(() => {
    if (isCreatingNoteRef.current) return;
    void (async () => {
      try {
        isCreatingNoteRef.current = true;
        const newNote = await createNote();
        if (!newNote) return;
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
