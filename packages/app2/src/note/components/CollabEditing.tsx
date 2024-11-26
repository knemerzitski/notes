import { useIsLocalOnlyUser } from '../../user/hooks/useIsLocalOnlyUser';
import { useIsLocalOnlyNote } from '../hooks/useIsLocalOnlyNote';
import { ServiceUnsavedNoteTracker } from './ServiceUnsavedNoteTracker';
import { LocalChangesToSubmittedRecordDebounced } from './LocalChangesToSubmittedRecordDebounced';
import { PersistCollabServiceChanges } from './PersistCollabServiceChanges';
import { SubmittedRecordMutation } from './SubmittedRecordMutation';
import { useNoteId } from '../context/note-id';
import { useEffect, useState } from 'react';
import { ReactNode } from '@tanstack/react-router';
import mitt from 'mitt';

export function CollabEditing() {
  return (
    <SingletonNote>
      <RunEditing />
    </SingletonNote>
  );
}

function RunEditing() {
  const isLocalOnlyUser = useIsLocalOnlyUser();
  const isLocalOnlyNote = useIsLocalOnlyNote();

  const isLocalOnly = isLocalOnlyUser || isLocalOnlyNote;

  return (
    <>
      <BaseCollabEditing />
      {isLocalOnly ? <LocalCollabEditing /> : <RemoteCollabEditing />}
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
function SingletonNote({ children }: { children: ReactNode }) {
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

  return children;
}

function BaseCollabEditing() {
  return (
    <>
      <PersistCollabServiceChanges />
    </>
  );
}

function LocalCollabEditing() {
  return <></>;
}

function RemoteCollabEditing() {
  return (
    <>
      <LocalChangesToSubmittedRecordDebounced />
      <ServiceUnsavedNoteTracker />
      <SubmittedRecordMutation />
    </>
  );
}
