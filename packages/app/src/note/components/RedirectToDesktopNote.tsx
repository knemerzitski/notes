import { Navigate } from '@tanstack/react-router';

import { Note } from '../../__generated__/graphql';
import { OriginalLocation } from '../../routes/note';

export function RedirectToDesktopNote({
  noteId,
  originalLocation,
}: {
  noteId: Note['id'];
  originalLocation?: OriginalLocation;
}) {
  return (
    <Navigate
      to={originalLocation?.pathname ?? '/notes'}
      replace={true}
      search={(prev) => {
        return {
          ...prev,
          originalLocation: undefined,
          noteId,
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
