import { Query } from '../../../__generated__/graphql';
import { readPreferences } from '../../persistence';

export const preferences: (
  parent: unknown,
  args: unknown
) => Query['preferences'] = () => {
  console.log('Query.preferences');

  return readPreferences();
};
