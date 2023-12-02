import { GraphQLError } from 'graphql';

import { Query } from '../../../__generated__/graphql';
import { readActiveSession } from '../../../session/persistence';
import { readSessionNotes } from '../../persistence';

export const notes: (parent: unknown, args: unknown) => Query['notes'] = () => {
  console.log('Query.notes');

  const activeSession = readActiveSession();
  if (activeSession.__typename !== 'LocalSession') {
    throw new GraphQLError('Cannot query notes for non-local session');
  }

  return readSessionNotes(activeSession);
};
