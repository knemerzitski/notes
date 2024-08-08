import { FieldPolicy } from '@apollo/client';

import { CollabText } from '../../../../__generated__/graphql';
import { editorsInCache } from '../../../editor/editors';
import { createEditorInFieldPolicy } from '../../editors';

export const viewText: FieldPolicy<CollabText['viewText'], CollabText['viewText']> = {
  read(_existing, options) {
    const { readField } = options;
    const id = readField('id');
    if (!id) {
      throw new Error('Expected CollabText.id to be defined to create editor');
    }

    return editorsInCache
      .getOrCreate(
        {
          __typename: 'CollabText',
          id: String(id),
        },
        () => createEditorInFieldPolicy(options)
      )
      .vars.viewTextVar();
  },
};
