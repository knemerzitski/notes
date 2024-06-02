import { ReactNode } from 'react';
import LocalNoteIdToCollabTextsProvider, {
  useLocalNoteCollabTexts,
} from './LocalNoteIdToEditors';
import LocalCollabTextPersistChangesDebounced from '../components/LocalCollabTextPersistChangesDebounced';

interface LocalNoteEditingContextProps {
  localNoteId: string;
  children: ReactNode;
}

export function LocalNoteEditingContext({
  localNoteId,
  children,
}: LocalNoteEditingContextProps) {
  return (
    <LocalNoteIdToCollabTextsProvider localNoteId={localNoteId}>
      <LocalNoteEditingContextCollabTexts>{children}</LocalNoteEditingContextCollabTexts>
    </LocalNoteIdToCollabTextsProvider>
  );
}

function LocalNoteEditingContextCollabTexts({ children }: { children: ReactNode }) {
  const collabTexts = useLocalNoteCollabTexts();

  return (
    <>
      {collabTexts.map(({ value }) => {
        const localCollabTextId = String(value.id);
        return (
          <LocalCollabTextPersistChangesDebounced
            key={localCollabTextId}
            localCollabTextId={localCollabTextId}
            flushOnUnmount={true}
          />
        );
      })}

      {children}
    </>
  );
}
