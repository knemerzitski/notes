import { Navigate } from '@tanstack/react-router';

import { Note } from '../../__generated__/graphql';

export function RedirectToMobileNote({
  noteId,
  originalPathname,
}: {
  noteId: Note['id'];
  originalPathname?: string;
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
          originalPathname,
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
