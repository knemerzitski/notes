import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Tooltip } from '@mui/material';

import { gql } from '../../__generated__';
import { IconButtonMenu } from '../../utils/components/IconButtonMenu';

import { DeleteForeverNoteMenuItem } from './DeleteForeverNoteMenuItem';
import { RestoreNoteMenuItem } from './RestoreNoteMenuItem';
import { TrashDeleteNoteMenuItem } from './TrashDeleteNoteMenuItem';

const _NoteMoreOptionsButton_UserNoteLinkFragment = gql(`
  fragment NoteMoreOptionsButton_UserNoteLinkFragment on UserNoteLink {
    ...TrashDeleteNoteMenuItem_UserNoteLinkFragment
    ...RestoreNoteMenuItem_UserNoteLinkFragment
    ...DeleteForeverNoteMenuItem_UserNoteLinkFragment
  }
`);

type IconButtonMenuProps = Parameters<typeof IconButtonMenu>[0];

export function NoteMoreOptionsButton({
  IconButtonMenuProps,
}: {
  IconButtonMenuProps?: Omit<IconButtonMenuProps, 'slotProps' | 'children'> & {
    slotProps?: Omit<NonNullable<IconButtonMenuProps['slotProps']>, 'iconButton'> & {
      iconButton?: Omit<
        NonNullable<IconButtonMenuProps['slotProps']>['iconButton'],
        'children'
      >;
    };
  };
}) {
  return (
    <IconButtonMenu
      {...IconButtonMenuProps}
      aria-label="note more options"
      slotProps={{
        ...IconButtonMenuProps?.slotProps,
        iconButton: {
          ...IconButtonMenuProps?.slotProps?.iconButton,
          children: (
            <Tooltip title="More options">
              <MoreVertIcon />
            </Tooltip>
          ),
        },
      }}
    >
      <TrashDeleteNoteMenuItem />
      <RestoreNoteMenuItem />
      <DeleteForeverNoteMenuItem />
    </IconButtonMenu>
  );
}
