import { ReactNode } from 'react';
import HistoryRestoration, {
  cacheHasOlderRecords,
} from '../components/HistoryRestoration';
import NoteContentIdToCollabTextsProvider, {
  useNoteCollabTexts,
} from './NoteContentIdToCollabTextsProvider';
import { useApolloClient } from '@apollo/client';

interface NoteEditingContextProps {
  noteContentId: string;
  children: ReactNode;
}

export function NoteEditingContext({ noteContentId, children }: NoteEditingContextProps) {
  return (
    <NoteContentIdToCollabTextsProvider noteContentId={noteContentId}>
      <NoteEditingContextCollabTexts>{children}</NoteEditingContextCollabTexts>
    </NoteContentIdToCollabTextsProvider>
  );
}

function NoteEditingContextCollabTexts({ children }: { children: ReactNode }) {
  const apolloClient = useApolloClient();
  const collabTexts = useNoteCollabTexts();

  return (
    <>
      {collabTexts.map(({ key: fieldName, value }) => {
        const collabTextId = String(value.id);

        if (cacheHasOlderRecords(apolloClient.cache, collabTextId) !== false) {
          return <HistoryRestoration key={collabTextId} fieldName={fieldName} />;
        }
        return null;
      })}

      {children}
    </>
  );
}
