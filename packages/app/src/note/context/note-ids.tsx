import { createContext, ReactNode, useContext } from 'react';

import { Maybe, Note } from '../../__generated__/graphql';

const NoteIdsContext = createContext<Note['id'][] | null>(null);

export function useNoteIds(nullable: true): Maybe<Note['id'][]>;
export function useNoteIds(nullable?: false): Note['id'][];
export function useNoteIds(nullable?: boolean): Maybe<Note['id'][]> {
  const ctx = useContext(NoteIdsContext);
  if (ctx === null && !nullable) {
    throw new Error('useNoteIds() requires context <NoteIdsProvider>');
  }
  return ctx;
}

export function NoteIdsProvider({
  noteIds,
  children,
}: {
  noteIds: Note['id'][];
  children: ReactNode;
}) {
  return <NoteIdsContext.Provider value={noteIds}>{children}</NoteIdsContext.Provider>;
}
