import { Query } from '../../../__generated__/graphql';
import { readSessions } from '../../persistence';

export const clientSessions: (
  parent: unknown,
  args: unknown
) => Query['clientSessions'] = () => {
  console.log('Query.clientSessions');
  return readSessions();
};
