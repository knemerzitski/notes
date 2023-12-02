import {
  Mutation,
  MutationDeleteClientSessionArgs,
} from '../../../__generated__/graphql';
import { readSessions, saveSessions } from '../../persistence';

export const deleteClientSession: (
  parent: unknown,
  args: MutationDeleteClientSessionArgs
) => Mutation['deleteClientSession'] = (_parent, { index }) => {
  console.log('Mutation.deleteClientSession');
  if (index < 0) return false;

  const sessions = readSessions();
  if (index >= sessions.length) return false;

  saveSessions([...sessions.slice(0, index), ...sessions.slice(index + 1)]);

  return true;
};
