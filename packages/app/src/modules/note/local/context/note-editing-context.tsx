import { ReactNode } from 'react';

import { CollabTextPersistChangesDebounced } from '../components/collab-text-persist-changes-debounced';

import {
  useNoteCollabTexts, NoteIdToCollabTextsProvider
} from './note-id-to-collab-texts-provider';

interface NoteEditingContextProps {
  noteId: string;
  children: ReactNode;
}

export function NoteEditingContext({ noteId, children }: NoteEditingContextProps) {
  return (
    <NoteIdToCollabTextsProvider noteId={noteId}>
      <NoteEditingContextCollabTexts>{children}</NoteEditingContextCollabTexts>
    </NoteIdToCollabTextsProvider>
  );
}

function NoteEditingContextCollabTexts({ children }: { children: ReactNode }) {
  const collabTexts = useNoteCollabTexts();

  return (
    <>
      {collabTexts.map(({ value }) => {
        const localCollabTextId = String(value.id);
        return (
          <CollabTextPersistChangesDebounced
            key={localCollabTextId}
            collabTextId={localCollabTextId}
            flushOnUnmount={true}
          />
        );
      })}

      {children}
    </>
  );
}
