import { FieldPolicy } from '@apollo/client';
import { CollabText } from '../../../../__generated__/graphql';
import { editorsWithVars } from '../../editors';

export const viewText: FieldPolicy<CollabText['viewText'], CollabText['viewText']> = {
  read(_existing, options) {
    return editorsWithVars.getOrCreateOrFailInPolicy(options).vars.viewTextVar();
  },
};
