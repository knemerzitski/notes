import { ReactNode } from 'react';
import HistoryRestoration from '../components/HistoryRestoration';
import NoteContentIdToCollabTextsProvider, {
  useNoteCollabTexts,
} from './NoteContentIdToCollabTextsProvider';

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
  const collabTexts = useNoteCollabTexts();

  return (
    <>
      {collabTexts.map(({ key: fieldName, value }) => {
        const collabTextId = String(value.id);
        const editor = value.editor;
        if (editor.serverHasOlderRecords !== false) {
          return <HistoryRestoration key={collabTextId} fieldName={fieldName} />;
        }
        return null;
      })}

      {children}
    </>
  );
}
