import { defaultStringifySearch } from '@tanstack/react-router';

import { Maybe } from '../../../../utils/src/types';

import { NoteShareAccess } from '../../__generated__/graphql';

const NULL_SHARING_LINK = 'https://...';

export function getShareUrl(shareId?: Maybe<NoteShareAccess['id']>) {
  if (!shareId) {
    return NULL_SHARING_LINK;
  }

  // Using defaultStringifySearch that is also used by router
  const search = defaultStringifySearch({
    share: shareId,
  });

  return `${location.origin}${search}`;
}
