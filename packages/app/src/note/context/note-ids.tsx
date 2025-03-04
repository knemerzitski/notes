import { createContext, ReactNode, useContext } from 'react';

import { Maybe } from '../../../../utils/src/types';

import { Note } from '../../__generated__/graphql';

const NoteIdsContext = createContext<readonly Note['id'][] | null>(null);

export function useNoteIds(nullable: true): Maybe<readonly Note['id'][]>;
export function useNoteIds(nullable?: false): Note['id'][];
export function useNoteIds(nullable?: boolean): Maybe<readonly Note['id'][]> {
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
  noteIds: readonly Note['id'][];
  children: ReactNode;
}) {
  return <NoteIdsContext.Provider value={noteIds}>{children}</NoteIdsContext.Provider>;
}
