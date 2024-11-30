import { Maybe } from '~utils/types';
import { NoteShareAccess } from '../../__generated__/graphql';
import { defaultStringifySearch } from '@tanstack/react-router';

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
