import { Query } from '../../../__generated__/graphql';
import { readActiveSessionIndex, readSessions } from '../../persistence';

export const activeClientSessionIndex: (
  parent: unknown,
  args: unknown
) => Query['activeClientSessionIndex'] = () => {
  console.log('Query.activeClientSessionIndex');

  const index = readActiveSessionIndex();
  if (index < 0) {
    return 0;
  }

  const sessions = readSessions();
  if (index >= sessions.length) {
    return 0;
  }

  return index;
};
