import {
  Mutation,
  MutationCreateRemoteSessionArgs,
} from '../../../__generated__/graphql';
import { readSessions, saveSessions } from '../../persistence';

export const createRemoteSession: (
  parent: unknown,
  args: MutationCreateRemoteSessionArgs
) => Mutation['createRemoteSession'] = (_parent, { input }) => {
  console.log('Mutation.createRemoteSession');

  const sessions = readSessions();
  const newSessionIndex = sessions.length;

  saveSessions([...sessions, { ...input, __typename: 'RemoteSession' }]);

  return newSessionIndex;
};
