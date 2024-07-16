import { FieldPolicy, NormalizedCacheObject } from '@apollo/client';
import { relayStylePagination } from '@apollo/client/utilities';

import { NoteCategory } from '../../../../../__generated__/graphql';
import { KeySpecifierName } from '../../../../apollo-client/key-specifier';
import { EvictFieldPolicy, EvictTag } from '../../../../apollo-client/policy/evict';
import { getCurrentUserIdInStorage } from '../../../../auth/user';

export const notesConnection: FieldPolicy & EvictFieldPolicy<NormalizedCacheObject> = {
  evict: {
    tag: EvictTag.USER_SPECIFIC,
  },
  ...relayStylePagination((args) => {
    return `notesConnection:${JSON.stringify({
      [KeySpecifierName.USER_ID]: getCurrentUserIdInStorage(),
      category: (args?.category as string | undefined) ?? NoteCategory.DEFAULT,
    })}`;
  }),
};
