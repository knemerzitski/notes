import { createContext, ReactNode, useContext } from 'react';

import { Maybe } from '../../../../utils/src/types';

import { Note } from '../../__generated__/graphql';
import { useUserId } from '../../user/context/user-id';

import { getUserNoteLinkId } from '../utils/id';

import { UserNoteLinkIdProvider } from './user-note-link-id';

const NoteIdContext = createContext<Note['id'] | null>(null);

export function useNoteId(nullable: true): Maybe<Note['id']>;
export function useNoteId(nullable?: false): Note['id'];
export function useNoteId(nullable?: boolean): Maybe<Note['id']> {
  const ctx = useContext(NoteIdContext);
  if (ctx === null && !nullable) {
    throw new Error('useNoteId() requires context <NoteIdProvider>');
  }
  return ctx;
}

export function NoteIdProvider({
  noteId,
  children,
}: {
  noteId?: Note['id'];
  children: ReactNode;
}) {
  const userId = useUserId(true);

  if (!noteId) {
    return children;
  }

  if (userId) {
    return (
      <UserNoteLinkIdProvider userNoteLinkId={getUserNoteLinkId(noteId, userId)}>
        <NoteIdContext.Provider value={noteId}>{children}</NoteIdContext.Provider>
      </UserNoteLinkIdProvider>
    );
  }

  return <NoteIdContext.Provider value={noteId}>{children}</NoteIdContext.Provider>;
}
