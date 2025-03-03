import { ComponentType, ReactNode } from 'react';

import { gql } from '../../__generated__';
import { NoteCategory } from '../../__generated__/graphql';

import { PassChildren } from '../../utils/components/PassChildren';

import { EmptyArchiveIconText } from './EmptyArchiveIconText';
import { NotesConnectionGrid } from './NotesConnectionGrid';

const _ArchiveNotesConnectionGrid_UserFragment = gql(`
  fragment ArchiveNotesConnectionGrid_UserFragment on User {
    id
    archive_UserNoteLinkConnection: noteLinkConnection(first: $archive_first, after: $archive_after, category: ARCHIVE) {
      ...NotesConnectionGrid_UserNoteLinkConnectionFragment
    }
  }
`);

export function ArchiveNotesConnectionGrid({
  EmptyListComponent = PassChildren,
}: {
  EmptyListComponent?: ComponentType<{ children: ReactNode }>;
}) {
  return (
    <NotesConnectionGrid
      category={NoteCategory.ARCHIVE}
      emptyListElement={
        <EmptyListComponent>
          <EmptyArchiveIconText />
        </EmptyListComponent>
      }
    />
  );
}
