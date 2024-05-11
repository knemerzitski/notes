import { FieldPolicy } from '@apollo/client';
import { CollabText } from '../../../../__generated__/graphql';
import { getEditorContextInPolicy } from '../../editors-context';

export const viewText: FieldPolicy<CollabText['viewText'], CollabText['viewText']> = {
  read(_existing, options) {
    return getEditorContextInPolicy(options).viewTextVar();
  },
};
