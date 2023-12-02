import { GraphQLError } from 'graphql';

import { Mutation, MutationDeleteNoteArgs } from '../../../__generated__/graphql';
import { readActiveSession } from '../../../session/persistence';
import { readSessionNotes, saveSessionNotes } from '../../persistence';

export const deleteNote: (
  parent: unknown,
  args: MutationDeleteNoteArgs
) => Mutation['deleteNote'] = (_parent, { id }) => {
  console.log('Mutation.deleteNote');

  const activeSession = readActiveSession();
  if (activeSession.__typename !== 'LocalSession') {
    throw new GraphQLError('Cannot mutate deleteNote for non-local session');
  }

  const notes = readSessionNotes(activeSession);
  saveSessionNotes(
    activeSession,
    notes.filter((note) => note.id !== id)
  );

  return true;
};
