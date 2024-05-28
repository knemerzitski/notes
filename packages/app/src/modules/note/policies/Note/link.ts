import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { LinkTypePolicy } from '../../../apollo-client/links/type-link';
import { gql } from '../../../../__generated__/gql';
import { NormalizedCacheObject } from '@apollo/client';

const FRAGMENT = gql(`
fragment LinkNote on User {
  note(contentId: $contentId) {
    id
    __typename
  }
}
`);

/**
 * Any fetched note is written directly to User type
 * so that Note can be found by Note.contentId
 */
export const link: LinkTypePolicy<NormalizedCacheObject> = {
  next({ context, cache }) {
    const { headers } = context as Partial<{
      headers: Partial<{ [CustomHeaderName.UserId]?: unknown }>;
    }>;
    if (!headers || typeof headers !== 'object') {
      return;
    }
    const userId = headers[CustomHeaderName.UserId];
    if (!userId || typeof userId !== 'string') {
      return;
    }

    return (valueAny) => {
      const value: Partial<{ __typename: string; id: unknown; contentId: unknown }> =
        valueAny;

      if (value.id != null && value.contentId != null) {
        cache.writeFragment({
          id: cache.identify({
            __typename: 'User',
            id: userId,
          }),
          fragment: FRAGMENT,
          data: {
            note: {
              __typename: 'Note',
              id: String(value.id),
            },
          },
          variables: {
            contentId: String(value.contentId),
          },
        });
        return false;
      }
    };
  },
};
