import { useFragment } from '@apollo/client';

import { gql } from '../../__generated__';
import { useUserNoteLinkId } from '../context/user-note-link-id';

const UseDeletedInDays_UserNoteLinkFragment = gql(`
  fragment UseDeletedInDays_UserNoteLinkFragment on UserNoteLink {
    id
    deletedAt
  }
`);

/**
 *
 * @returns Days until note is deleted or false if note is never deleted.
 */
export function useDeletedInDays(): number | false {
  const userNoteLinkId = useUserNoteLinkId();
  const { complete, data: userNoteLink } = useFragment({
    fragment: UseDeletedInDays_UserNoteLinkFragment,
    from: {
      __typename: 'UserNoteLink',
      id: userNoteLinkId,
    },
  });

  if (!complete) {
    return false;
  }

  if (!userNoteLink.deletedAt) {
    return false;
  }

  const daysRemaining = Math.floor(
    (userNoteLink.deletedAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return daysRemaining;
}
