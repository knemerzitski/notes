import { Navigate } from '@tanstack/react-router';

import { Note } from '../../__generated__/graphql';
import { OriginalLocation } from '../../routes/note';

export function RedirectToMobileNote({
  noteId,
  originalLocation,
}: {
  noteId: Note['id'];
  originalLocation?: OriginalLocation;
}) {
  return (
    <Navigate
      to="/note/$noteId"
      replace={true}
      params={{
        noteId,
      }}
      search={(prev) => {
        return {
          ...prev,
          noteId: undefined,
          originalLocation,
        };
      }}
      mask={{
        to: '/note/$noteId',
        params: {
          noteId,
        },
      }}
    />
  );
}
