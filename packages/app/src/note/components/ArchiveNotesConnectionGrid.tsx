import { ReactNode } from 'react';

import { gql } from '../../__generated__';
import { NoteCategory } from '../../__generated__/graphql';

import { EmptyArchiveInfo } from './EmptyArchiveInfo';
import { NotesConnectionGrid } from './NotesConnectionGrid';

const _ArchiveNotesConnectionGrid_UserFragment = gql(`
  fragment ArchiveNotesConnectionGrid_UserFragment on User {
    id
    archive_UserNoteLinkConnection: noteLinkConnection(first: $archive_first, after: $archive_after, category: ARCHIVE) {
      ...NotesConnectionGrid_UserNoteLinkConnectionFragment
    }
  }
`);

export function ArchiveNotesConnectionGrid(props: {
  slots?: {
    emptyElementPrefix?: ReactNode;
    emptyElementSuffix?: ReactNode;
  };
}) {
  return (
    <NotesConnectionGrid
      category={NoteCategory.ARCHIVE}
      emptyElement={
        <>
          {props.slots?.emptyElementPrefix}
          {props.slots?.emptyElementSuffix}
          <EmptyArchiveInfo />
        </>
      }
    />
  );
}
