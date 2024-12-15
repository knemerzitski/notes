import { ReactNode } from '@tanstack/react-router';
import mitt from 'mitt';
import { useEffect, useState } from 'react';

import { useIsLocalOnlyUser } from '../../user/hooks/useIsLocalOnlyUser';
import { useNoteId } from '../context/note-id';
import { useIsLocalOnlyNote } from '../hooks/useIsLocalOnlyNote';

import { HistoryRestoration } from './HistoryRestoration';
import { LocalChangesToSubmittedRecordDebounced } from './LocalChangesToSubmittedRecordDebounced';
import { OpenNoteSubscription } from './OpenNoteSubscription';
import { PersistCollabServiceChanges } from './PersistCollabServiceChanges';
import { SubmittedRecordMutation } from './SubmittedRecordMutation';

import { SyncHeadText } from './SyncHeadText';
import { SyncMissingRecords } from './SyncMissingRecords';
import { UnsavedCollabServiceTracker } from './UnsavedCollabServiceTracker';

/**
 * Run events related to CollabService:
 * - Keep track if CollabService is out of date.
 * - Local changes into a submitted record
 * - Submitted record mutation
 * - Fetch missing records
 * - Restore history
 */
export function CollabService() {
  return (
    <NoteSingleton>
      <Run />
    </NoteSingleton>
  );
}

function Run() {
  const isLocalOnlyUser = useIsLocalOnlyUser();
  const isLocalOnlyNote = useIsLocalOnlyNote();

  const isLocalOnly = isLocalOnlyUser || isLocalOnlyNote;

  return (
    <>
      <Base />
      {isLocalOnly ? <Local /> : <Remote />}
    </>
  );
}

const renderNoteIds = new Set();
const eventBus = mitt<{
  rerender: true;
}>();

/**
 * Render `children` at most once regardless where component is used
 */
function NoteSingleton({ children }: { children: ReactNode }) {
  const noteId = useNoteId();
  const [_, renderCounter] = useState(0);

  useEffect(() => {
    const eventBusOff = eventBus.on('rerender', () => {
      renderCounter((prev) => prev + 1);
    });

    if (renderNoteIds.has(noteId)) {
      return () => {
        eventBusOff();
      };
    }

    renderNoteIds.add(noteId);

    return () => {
      eventBusOff();
      renderNoteIds.delete(noteId);
      eventBus.emit('rerender', true);
    };
  }, [noteId]);

  if (renderNoteIds.has(noteId)) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return children;
}

function Base() {
  return (
    <>
      <PersistCollabServiceChanges />
    </>
  );
}

function Local() {
  return <></>;
}

function Remote() {
  return (
    <>
      <UnsavedCollabServiceTracker />
      <LocalChangesToSubmittedRecordDebounced />
      <SubmittedRecordMutation />
      <SyncHeadText />
      <SyncMissingRecords />
      <HistoryRestoration />
      <OpenNoteSubscription />
    </>
  );
}
