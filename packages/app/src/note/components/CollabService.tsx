import { ReactNode } from '@tanstack/react-router';
import mitt from 'mitt';
import { Suspense, useEffect, useState } from 'react';

import { useIsLocalOnlyUser } from '../../user/hooks/useIsLocalOnlyUser';
import { useNoteId } from '../context/note-id';
import { useIsLocalOnlyNote } from '../hooks/useIsLocalOnlyNote';

import { CollabServiceStatus } from './CollabServiceStatus';
import { HistoryRestoration } from './HistoryRestoration';
import { LocalChangesToSubmittedRecordDebounced } from './LocalChangesToSubmittedRecordDebounced';
import { OpenNoteSubscription } from './OpenNoteSubscription';
import { SubmittedRecordMutation } from './SubmittedRecordMutation';

import { SyncHeadText } from './SyncHeadText';
import { SyncMissingRecords } from './SyncMissingRecords';
import { SyncViewText } from './SyncViewText';
import { UnsavedCollabServiceTracker } from './UnsavedCollabServiceTracker';

interface CollabServiceProps {
  /**
   * Note is visibly open
   * @default false
   */
  visible?: boolean;
}

/**
 * Run events related to CollabService:
 * - Keep track if CollabService is out of date.
 * - Local changes into a submitted record
 * - Submitted record mutation
 * - Fetch missing records
 * - Restore history
 */
export function CollabService(props: CollabServiceProps) {
  return (
    <NoteSingleton>
      <Run {...props} />
    </NoteSingleton>
  );
}

function Run(props: CollabServiceProps) {
  const isLocalOnlyUser = useIsLocalOnlyUser();
  const isLocalOnlyNote = useIsLocalOnlyNote();

  const isLocalOnly = isLocalOnlyUser || isLocalOnlyNote;

  const isVisible = props.visible ?? false;

  return (
    <Suspense>
      <Base />
      {isVisible && <BaseOpen />}

      {isLocalOnly ? (
        <Local />
      ) : (
        <>
          <Remote />
          {isVisible && <RemoteOpen />}
        </>
      )}
    </Suspense>
  );
}

const lockedNoteIds = new Set();
const eventBus = mitt<{
  lockReleased: true;
}>();

/**
 * Render `children` at most once regardless where component is used
 */
function NoteSingleton({ children }: { children: ReactNode }) {
  const noteId = useNoteId();
  const [hasLock, setHasLock] = useState(false);

  // Acquire lock
  useEffect(() => {
    function acquireLock() {
      if (lockedNoteIds.has(noteId)) {
        return false;
      }

      lockedNoteIds.add(noteId);
      setHasLock(true);
      return true;
    }

    acquireLock();

    return eventBus.on('lockReleased', () => {
      acquireLock();
    });
  }, [noteId]);

  // Release lock
  useEffect(() => {
    if (!hasLock) {
      return;
    }

    function releaseLock() {
      lockedNoteIds.delete(noteId);
      eventBus.emit('lockReleased', true);
    }

    return () => {
      releaseLock();
    };
  }, [noteId, hasLock]);

  if (!hasLock) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return children;
}

function Base() {
  return (
    <>
      <SyncViewText />
    </>
  );
}

function BaseOpen() {
  return (
    <>
      <CollabServiceStatus />
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
    </>
  );
}

/**
 * Logic when note is visibly open
 */
function RemoteOpen() {
  return (
    <>
      {/* Delay set to 1 to prevent resubscribing when components get remounted somewhere else */}
      <OpenNoteSubscription unsubscribeDelay={1} />
    </>
  );
}
