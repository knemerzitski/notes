import { ApolloCache, Reference, makeReference, makeVar } from '@apollo/client';

import { isDefined } from '~utils/type-guards/is-defined';

import { Note } from '../../../__generated__/graphql';
import { getCurrentUserId } from '../../auth/user';

/**
 * Active notes local changes are submitted and external changes are processed.
 */
export const activeNotesVar = makeVar<Record<string, Reference>>({});

interface NoteContentId {
  contentId: Note['contentId'];
}

export function addActiveNotesByReference(notes: Reference[]) {
  if (notes.length === 0) return;

  const { ...activeNotes } = activeNotesVar();
  notes.forEach((ref) => {
    activeNotes[ref.__ref] = ref;
  });
  activeNotesVar(activeNotes);

  return true;
}

export function removeActiveNotesByReference(notes: Reference[]) {
  if (notes.length === 0) return;

  const { ...activeNotes } = activeNotesVar();

  notes.forEach((ref) => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete activeNotes[ref.__ref];
  });

  activeNotesVar(activeNotes);

  return true;
}

export function addActiveNotesByContentId<TCacheShape>(
  cache: ApolloCache<TCacheShape>,
  notes: NoteContentId[]
) {
  if (notes.length === 0) return;

  const refsList = notes.map((note) => noteToReference(cache, note)).filter(isDefined);

  const { ...activeNotes } = activeNotesVar();
  refsList.forEach((noteRef) => {
    activeNotes[noteRef.__ref] = noteRef;
  });
  activeNotesVar(activeNotes);

  return true;
}

export function removeActiveNotesByContentId<TCacheShape>(
  cache: ApolloCache<TCacheShape>,
  notes: NoteContentId[]
) {
  if (notes.length === 0) return;

  const refsList = notes.map((note) => noteToReference(cache, note)).filter(isDefined);

  const { ...activeNotes } = activeNotesVar();

  refsList.forEach((noteRef) => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete activeNotes[noteRef.__ref];
  });

  activeNotesVar(activeNotes);

  return true;
}

function noteToReference<TCacheShape>(
  cache: ApolloCache<TCacheShape>,
  note: NoteContentId
) {
  const id = cache.identify({
    contentId: note.contentId,
    userId: getCurrentUserId(cache),
    __typename: 'Note',
  });

  return id ? makeReference(id) : undefined;
}
