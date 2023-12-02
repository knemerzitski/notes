import {
  Mutation,
  MutationSwitchToClientSessionArgs,
} from '../../../__generated__/graphql';
import { setActiveSessionIndex } from '../../persistence';

export const switchToClientSession: (
  parent: unknown,
  args: MutationSwitchToClientSessionArgs
) => Mutation['switchToClientSession'] = (_parent, { index }) => {
  console.log('Mutation.switchToClientSession');

  return setActiveSessionIndex(index);
};
