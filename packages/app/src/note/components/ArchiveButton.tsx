import { useQuery } from '@apollo/client';
import ArchiveIcon from '@mui/icons-material/Archive';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';

import { gql } from '../../__generated__';
import { MovableNoteCategory } from '../../__generated__/graphql';
import { useUserId } from '../../user/context/user-id';
import { useNoteId } from '../context/note-id';
import { useArchiveNoteWithUndo } from '../hooks/useArchiveNoteWithUndo';
import { toMovableNoteCategory } from '../utils/note-category';

const ArchiveButton_Query = gql(`
  query ArchiveButton_Query($userBy: SignedInUserByInput!, $noteBy: NoteByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        categoryName
      }
    }
  }
`);

export function ArchiveButton() {
  const userId = useUserId();
  const noteId = useNoteId();
  const archiveNoteWithUndo = useArchiveNoteWithUndo();

  const { data } = useQuery(ArchiveButton_Query, {
    variables: {
      userBy: {
        id: userId,
      },
      noteBy: {
        id: noteId,
      },
    },
    fetchPolicy: 'cache-only',
  });

  if (!data) {
    return null;
  }

  const category = toMovableNoteCategory(data.signedInUser.noteLink.categoryName);

  if (!category || category === MovableNoteCategory.ARCHIVE) {
    return null;
  }

  const handleClick: IconButtonProps['onClick'] = (e) => {
    e.stopPropagation();
    archiveNoteWithUndo();
  };

  return (
    <IconButton onClick={handleClick} aria-label="archive note">
      <Tooltip title="Archive">
        <ArchiveIcon />
      </Tooltip>
    </IconButton>
  );
}
