import { gql } from '@apollo/client';
import { ReactNode } from 'react';

import { NoteCategory } from '../../__generated__/graphql';

import { EmptyTrashInfo } from './EmptyTrashInfo';
import { NotesConnectionGrid } from './NotesConnectionGrid';

const _TrashNotesConnectionGrid_UserFragment = gql(`
  fragment TrashNotesConnectionGrid_UserFragment on User {
    id
    trash_noteLinkConnection: noteLinkConnection(first: $trash_first, after: $trash_after, category: TRASH) {
      ...NotesConnectionGrid_UserNoteLinkConnectionFragment
    }
  }
`);

export function TrashNotesConnectionGrid(props: {
  slots?: {
    emptyElementPrefix?: ReactNode;
    emptyElementSuffix?: ReactNode;
  };
}) {
  return (
    <NotesConnectionGrid
      category={NoteCategory.TRASH}
      emptyElement={
        <>
          {props.slots?.emptyElementPrefix}
          <EmptyTrashInfo />
          {props.slots?.emptyElementSuffix}
        </>
      }
    />
  );
}
