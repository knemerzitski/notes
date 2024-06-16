import { FieldPolicy, NormalizedCacheObject } from '@apollo/client';

import { EvictFieldPolicy, EvictTag } from '../../../apollo-client/policy/evict';
import { getCurrentUserId } from '../../../auth/user';

export const note: FieldPolicy & EvictFieldPolicy<NormalizedCacheObject> = {
  read(_, { args, cache, toReference }) {
    if (typeof args?.contentId === 'string') {
      return toReference({
        __typename: 'Note',
        contentId: args.contentId,
        userId: getCurrentUserId(cache),
      });
    }

    return;
  },
  evict: {
    tag: EvictTag.UserSpecific,
  },
  keyArgs: false,
  merge: false,
};
