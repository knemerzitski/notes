import { gql } from '@apollo/client';
import { ReactNode } from 'react';

import { NoteCategory } from '../../__generated__/graphql';

import { EmptyTrashInfo } from './EmptyTrashInfo';
import { NotesConnectionGrid } from './NotesConnectionGrid';

const _TrashNotesConnectionGrid_QueryFragment = gql(`
  fragment TrashNotesConnectionGrid_QueryFragment on Query {
    trash_UserNoteLinkConnection: userNoteLinkConnection(first: $trash_first, after: $trash_after, category: TRASH) {
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
          {props.slots?.emptyElementSuffix}
          <EmptyTrashInfo />
        </>
      }
    />
  );
}
