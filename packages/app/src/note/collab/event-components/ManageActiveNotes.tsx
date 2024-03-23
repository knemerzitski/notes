import { Suspense } from 'react';

import { useActiveNotes } from '../context/ActiveNotesProvider';
import NoteIdProvider from '../context/NoteIdProvider';

import AutoSubmitChangesDebounced from './AutoSubmitChangesDebounced';
import ExternalChangesSubscription from './ExternalChangesSubscription';
import SyncHeadTextToCache from './SyncHeadTextToCache';
import SyncViewTextToCache from './SyncViewTextToCache';

export default function ActiveNotesManager() {
  const activeNotes = useActiveNotes();

  return activeNotes.map((noteId) => (
    <NoteIdProvider key={noteId} noteId={noteId}>
      <Suspense>
        <ExternalChangesSubscription />
        <SyncHeadTextToCache />
        <SyncViewTextToCache />
        <AutoSubmitChangesDebounced />
      </Suspense>
    </NoteIdProvider>
  ));
}
