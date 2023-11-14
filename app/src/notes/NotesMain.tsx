import useMobile from '../hooks/useIsMobile';

import AddNoteFab from './AddNoteFab';
import AddNoteWidget from './AddNoteWidget';
import NotesList from './NotesList';

export default function NotesMain() {
  const isMobile = useMobile();

  return (
    <>
      {!isMobile && (
        <AddNoteWidget
          sx={{
            width: 'min(100%, 600px)',
          }}
        />
      )}

      <NotesList />

      {isMobile && <AddNoteFab />}
    </>
  );
}
