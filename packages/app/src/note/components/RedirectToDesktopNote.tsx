import { Navigate } from '@tanstack/react-router';

import { Note } from '../../__generated__/graphql';

export function RedirectToDesktopNote({
  noteId,
  originalPathname,
}: {
  noteId: Note['id'];
  originalPathname?: string;
}) {
  return (
    <Navigate
      to={originalPathname ?? '/notes'}
      replace={true}
      search={(prev) => {
        return {
          ...prev,
          originalPathname: undefined,
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
