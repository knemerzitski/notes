import { useFragment } from '@apollo/client';

import { gql } from '../../__generated__';
import { useCollabServiceManager } from '../context/collab-service-manager';
import { useUserNoteLinkId } from '../context/user-note-link-id';
import { NoteTextFieldName } from '../types';

const TextFieldValue_UserNoteLinkFragment = gql(`
  fragment TextFieldValue_UserNoteLinkFragment on UserNoteLink {
    id
    viewText
  }
`);

export function useCacheViewTextFieldValue(fieldName: NoteTextFieldName) {
  const userNoteLinkId = useUserNoteLinkId();
  const collabServiceManager = useCollabServiceManager();

  const { data: userNoteLink, complete } = useFragment({
    fragment: TextFieldValue_UserNoteLinkFragment,
    from: {
      __typename: 'UserNoteLink',
      id: userNoteLinkId,
    },
  });

  if (!complete) {
    return null;
  }

  const parsedFields = collabServiceManager.parseText(userNoteLink.viewText);

  const fieldValue = parsedFields[fieldName];
  if (typeof fieldValue !== 'string') {
    return null;
  }

  return fieldValue;
}
