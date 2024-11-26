import { ReactNode } from 'react';
import { gql } from '../../__generated__';
import { NoteCategory } from '../../__generated__/graphql';
import { EmptyArchiveInfo } from './EmptyArchiveInfo';
import { NotesConnectionGrid } from './NotesConnectionGrid';

const _ArchiveNotesConnectionGrid_QueryFragment = gql(`
  fragment ArchiveNotesConnectionGrid_QueryFragment on Query {
    archive_UserNoteLinkConnection: userNoteLinkConnection(first: $archive_first, after: $archive_after, category: ARCHIVE) {
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
