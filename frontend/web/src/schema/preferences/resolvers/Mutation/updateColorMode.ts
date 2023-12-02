import { Mutation, MutationUpdateColorModeArgs } from '../../../__generated__/graphql';
import { readPreferences, savePreferences } from '../../persistence';

export const updateColorMode: (
  parent: unknown,
  args: MutationUpdateColorModeArgs
) => Mutation['updateColorMode'] = (_parent, { colorMode }) => {
  console.log('Mutation.updateColorMode');

  const preferences = readPreferences() ?? {};

  savePreferences({
    ...preferences,
    colorMode,
  });

  return true;
};
