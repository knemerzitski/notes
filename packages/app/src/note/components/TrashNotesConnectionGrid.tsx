import { gql } from '@apollo/client';
import { ComponentType, ReactNode } from 'react';

import { NoteCategory } from '../../__generated__/graphql';

import { EmptyTrashIconText } from './EmptyTrashIconText';
import { NotesConnectionGrid } from './NotesConnectionGrid';
import { PassChildren } from '../../utils/components/PassChildren';

const _TrashNotesConnectionGrid_UserFragment = gql(`
  fragment TrashNotesConnectionGrid_UserFragment on User {
    id
    trash_noteLinkConnection: noteLinkConnection(first: $trash_first, after: $trash_after, category: TRASH) {
      ...NotesConnectionGrid_UserNoteLinkConnectionFragment
    }
  }
`);

export function TrashNotesConnectionGrid({
  EmptyListComponent = PassChildren,
}: {
  EmptyListComponent?: ComponentType<{ children: ReactNode }>;
}) {
  return (
    <NotesConnectionGrid
      category={NoteCategory.TRASH}
      emptyListElement={
        <EmptyListComponent>
          <EmptyTrashIconText />
        </EmptyListComponent>
      }
    />
  );
}
