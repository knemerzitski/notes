import { ReactNode } from 'react';

import { HistoryRestoration } from '../components/history-restoration';

import {
  useNoteCollabTexts,
  NoteContentIdToCollabTextsProvider,
} from './note-content-id-to-collab-texts-provider';

interface NoteEditingContextProps {
  noteContentId: string;
  children: ReactNode;
}

export function NoteEditingContext({ noteContentId, children }: NoteEditingContextProps) {
  return (
    <NoteContentIdToCollabTextsProvider
      noteContentId={noteContentId}
      fetchPolicy="cache-first"
    >
      <NoteEditingContextCollabTexts>{children}</NoteEditingContextCollabTexts>
    </NoteContentIdToCollabTextsProvider>
  );
}

function NoteEditingContextCollabTexts({ children }: { children: ReactNode }) {
  const collabTexts = useNoteCollabTexts();

  return (
    <>
      {collabTexts.map(({ key: fieldName, value }) => {
        const collabTextId = String(value.id);
        return <HistoryRestoration key={collabTextId} fieldName={fieldName} />;
      })}

      {children}
    </>
  );
}
