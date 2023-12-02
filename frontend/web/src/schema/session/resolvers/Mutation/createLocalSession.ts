import {
  LocalSession,
  Mutation,
  MutationCreateLocalSessionArgs,
} from '../../../__generated__/graphql';
import { readNextSessionId, readSessions, saveSessions } from '../../persistence';

export const createLocalSession: (
  parent: unknown,
  args: MutationCreateLocalSessionArgs
) => Mutation['createLocalSession'] = (_parent, { displayName }) => {
  console.log('Mutation.createLocalSession');

  const newId = readNextSessionId();

  const newSession: LocalSession = {
    __typename: 'LocalSession',
    id: newId,
    displayName,
  };

  const sessions = readSessions();
  const newSessionIndex = sessions.length;

  saveSessions([...sessions, newSession]);

  return newSessionIndex;
};
