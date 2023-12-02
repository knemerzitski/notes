import { GraphQLError } from 'graphql';

import { Query, QueryNoteArgs } from '../../../__generated__/graphql';
import { readActiveSession } from '../../../session/persistence';
import { readSessionNotes } from '../../persistence';

export const note: (parent: unknown, args: QueryNoteArgs) => Query['note'] = (
  _parent,
  { id }
) => {
  console.log('Query.note');

  const activeSession = readActiveSession();
  if (activeSession.__typename !== 'LocalSession') {
    throw new GraphQLError('Cannot query note for non-local session');
  }

  const notes = readSessionNotes(activeSession);

  const note = notes.find((note) => note.id === id);
  if (!note) return null;

  return note;
};
